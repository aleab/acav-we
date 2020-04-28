import { RGB } from 'color-convert/conversions';
import { MutableRefObject, RefObject } from 'react';

import { VerticalVisualizerProperties, VisualizerProperties } from '../../../app/properties/VisualizerProperties';
import { AudioResponsiveValueProviderFactory, AudioResponsiveValueProviderFunction } from '../../../app/AudioResponsiveValueProvider';
import { ColorReactionFactory, ColorReactionType } from '../../../app/ColorReactionType';
import { VerticalVisualizerType } from '../../../app/VisualizerType';
import { WallpaperContextType } from '../../../app/WallpaperContext';

import VisualizerRenderArgs from '../VisualizerRenderArgs';

export interface VerticalRendererOptions<T extends VerticalVisualizerType> {
    visualizerOptions: MutableRefObject<DeepReadonly<VisualizerProperties>>;
    readonly commonOptions: DeepReadonly<Omit<VerticalVisualizerProperties, 'bars' | 'blocks' | 'wave'>>;
    readonly options: DeepReadonly<T extends VerticalVisualizerType.Bars ? VerticalVisualizerProperties['bars']
        : T extends VerticalVisualizerType.Blocks ? VerticalVisualizerProperties['blocks']
        : T extends VerticalVisualizerType.Wave ? VerticalVisualizerProperties['wave']
        : never>;
}

export interface VisualizerParams {
    canvasContext: CanvasRenderingContext2D;
    N: number;
    flipFrequencies: boolean;
    visualizerPosition: number;
    visualizerWidth: number;
    alignment: number;
    height: number;
    colorRgb: Readonly<RGB>;
    colorReaction: ((value: number) => RGB) | undefined;
    colorReactionValueProvider: AudioResponsiveValueProviderFunction;
}

export interface IVerticalRenderer {
    render(args: VisualizerRenderArgs): void;
}

export default abstract class VerticalRenderer<T extends VerticalVisualizerType> implements IVerticalRenderer {
    protected readonly context: WallpaperContextType;
    protected readonly canvas: RefObject<HTMLCanvasElement>;
    protected readonly options: VerticalRendererOptions<T>;

    constructor(
        context: WallpaperContextType,
        canvas: RefObject<HTMLCanvasElement>,
        options: VerticalRendererOptions<T>,
    ) {
        this.context = context;
        this.canvas = canvas;
        this.options = options;
    }

    protected setCanvasColor(canvasContext: CanvasRenderingContext2D, color: RGB | undefined) {
        if (color !== undefined) {
            canvasContext.setFillColorRgb(color);
            canvasContext.setStrokeColorRgb(color);
        }
    }

    protected computeFillColor(
        i: number,
        args: VisualizerRenderArgs,
        baseColor: Readonly<RGB>,
        colorReaction: ((value: number) => RGB) | undefined,
        colorReactionValueProvider: AudioResponsiveValueProviderFunction,
    ): Readonly<RGB>[] {
        const fillColor = [ baseColor, baseColor ];
        if (args.samples !== undefined) {
            const sample = args.samples.getSample(i);
            if (colorReaction !== undefined) {
                const value = colorReactionValueProvider([ sample[0], sample[1] ], i, { samplesBuffer: args.samplesBuffer, peak: args.peak });
                if (!Number.isNaN(value[0]) && !Number.isNaN(value[1])) {
                    fillColor[0] = colorReaction(value[0]);
                    fillColor[1] = colorReaction(value[1]);
                }
            }
        }

        return fillColor;
    }

    abstract getHeight(maxHeight: number): number;
    abstract renderSamples(args: VisualizerRenderArgs, visualizerParams: VisualizerParams): void;

    render(args: VisualizerRenderArgs) {
        const canvasContext = this.canvas.current?.getContext('2d');
        if (!canvasContext) return;

        canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
        if (!this.context.wallpaperProperties.audioprocessing) {
            args.samples?.clear();
        } else if (args.samples) {
            const N = args.samples.length * 2;

            const Ov = this.options.visualizerOptions;
            const O = this.options.commonOptions;

            const flipFrequencies = Ov.current.flipFrequencies;
            const visualizerPosition = canvasContext.canvas.height * (O.position / 100);
            const visualizerWidth = canvasContext.canvas.width * (O.width / 100);
            const alignment = O.alignment;

            const colorRgb: Readonly<RGB> = [ O.color[0], O.color[1], O.color[2] ];
            const colorReaction = Ov.current.responseType !== ColorReactionType.None
                ? ColorReactionFactory.buildColorReaction(Ov.current.responseType, {
                    fromRgb: colorRgb,
                    toRgb: [ Ov.current.responseToHue[0], Ov.current.responseToHue[1], Ov.current.responseToHue[2] ],
                    degree: Ov.current.responseDegree,
                    range: Ov.current.responseRange,
                }) : undefined;
            const colorReactionValueProvider = AudioResponsiveValueProviderFactory.buildAudioResponsiveValueProvider(Ov.current.responseProvider, Ov.current.responseValueGain);

            const maxHeight = Math.min(
                (2 / (1 - alignment)) * visualizerPosition,                                   // (1-a)/2: section of the bar below the pivot point
                (2 / (1 + alignment)) * (canvasContext.canvas.height - visualizerPosition),   // (1+a)/2: section of the bar above the pivot point
            );
            const height = this.getHeight(maxHeight);

            if (colorReaction === undefined) {
                this.setCanvasColor(canvasContext, colorRgb as RGB);
            }

            this.renderSamples(args, {
                canvasContext,
                N,
                flipFrequencies,
                visualizerPosition,
                visualizerWidth,
                alignment,
                height,
                colorRgb,
                colorReaction,
                colorReactionValueProvider,
            });
        }
    }
}
