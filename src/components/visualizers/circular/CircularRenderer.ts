import { RGB } from 'color-convert/conversions';
import { MutableRefObject, RefObject } from 'react';

import { CircularVisualizerProperties, VisualizerProperties } from '../../../app/properties/VisualizerProperties';
import { AudioResponsiveValueProviderFactory, AudioResponsiveValueProviderFunction } from '../../../app/AudioResponsiveValueProvider';
import { ColorReactionFactory, ColorReactionType } from '../../../app/ColorReactionType';
import { CircularVisualizerType } from '../../../app/VisualizerType';
import { WallpaperContextType } from '../../../app/WallpaperContext';

import VisualizerRenderArgs from '../VisualizerRenderArgs';

export interface CircularRendererOptions<T extends CircularVisualizerType> {
    visualizerOptions: MutableRefObject<DeepReadonly<VisualizerProperties>>;
    readonly commonOptions: DeepReadonly<Omit<CircularVisualizerProperties, 'bars' | 'blocks' | 'wave'>>;
    readonly options: DeepReadonly<T extends CircularVisualizerType.Bars ? CircularVisualizerProperties['bars']
        : T extends CircularVisualizerType.Blocks ? CircularVisualizerProperties['blocks']
        //: T extends CircularVisualizerType.Wave ? CircularVisualizerProperties['wave']
        : never>;
}

export interface VisualizerParams {
    canvasContext: CanvasRenderingContext2D;
    N: number;
    angularDelta: number;
    flipFrequencies: boolean;
    x: number;
    y: number;
    radius: number;
    rotation: number;
    height: number;
    colorRgb: Readonly<RGB>;
    colorReaction: ((value: number) => RGB) | undefined;
    colorReactionValueProvider: AudioResponsiveValueProviderFunction;
}

export interface ICircularRenderer {
    render(args: VisualizerRenderArgs): void;
}

export default abstract class CircularRenderer<T extends CircularVisualizerType> implements ICircularRenderer {
    protected readonly context: WallpaperContextType;
    protected readonly canvas: RefObject<HTMLCanvasElement>;
    protected readonly options: CircularRendererOptions<T>;

    constructor(
        context: WallpaperContextType,
        canvas: RefObject<HTMLCanvasElement>,
        options: CircularRendererOptions<T>,
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

            const minDimension = Math.min(canvasContext.canvas.width, canvasContext.canvas.height);
            const visualizerAngle = O.angle;
            const angularDelta = ((visualizerAngle / 180) * Math.PI) / N;

            const flipFrequencies = Ov.current.flipFrequencies;
            const x = canvasContext.canvas.width * (O.x / 100);
            const y = canvasContext.canvas.height * (O.y / 100);
            const radius = minDimension * (O.radius / 100);
            const rotation = (O.rotation / 180) * Math.PI;

            const colorRgb: Readonly<RGB> = [ O.color[0], O.color[1], O.color[2] ];
            const colorReaction = Ov.current.responseType !== ColorReactionType.None
                ? ColorReactionFactory.buildColorReaction(Ov.current.responseType, {
                    fromRgb: colorRgb,
                    toRgb: [ Ov.current.responseToHue[0], Ov.current.responseToHue[1], Ov.current.responseToHue[2] ],
                    degree: Ov.current.responseDegree,
                    range: Ov.current.responseRange,
                }) : undefined;
            const colorReactionValueProvider = AudioResponsiveValueProviderFactory.buildAudioResponsiveValueProvider(Ov.current.responseProvider, Ov.current.responseValueGain);

            const maxHeight = Math.clamp(minDimension / 2 - radius, 0, minDimension / 2);
            const height = this.getHeight(maxHeight);

            if (colorReaction === undefined) {
                this.setCanvasColor(canvasContext, colorRgb as RGB);
            }

            this.renderSamples(args, {
                canvasContext,
                N,
                angularDelta,
                flipFrequencies,
                x,
                y,
                radius,
                rotation,
                height,
                colorRgb,
                colorReaction,
                colorReactionValueProvider,
            });
        }
    }
}

interface Point { x: number;y: number }
export function getBarSegmentPoints(distance: number, angle: number, circleRadius: number, circleCenter: Point, barWidth: number): [ Point, Point ] {
    const { x, y } = circleCenter;
    const w = barWidth / 2;
    const cos = Math.cos(Math.PI_2 - angle);
    const sin = Math.sin(Math.PI_2 - angle);

    const sectionCenterPoint = {
        x: (circleRadius + distance) * Math.cos(angle) + x,
        y: (circleRadius + distance) * Math.sin(angle) - y,
    };
    return [
        { x: sectionCenterPoint.x - w * cos, y: sectionCenterPoint.y + w * sin },
        { x: sectionCenterPoint.x + w * cos, y: sectionCenterPoint.y - w * sin },
    ];
}
