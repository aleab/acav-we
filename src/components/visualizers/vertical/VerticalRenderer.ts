import { RGB } from 'color-convert/conversions';

import { VerticalVisualizerProperties } from '../../../app/properties/VisualizerProperties';
import { AudioResponsiveValueProviderFactory, AudioResponsiveValueProviderFunction } from '../../../app/AudioResponsiveValueProvider';
import { ColorReactionFactory, ColorReactionType } from '../../../app/ColorReactionType';
import { VisualizerFlipType } from '../../../app/VisualizerFlipType';
import { VerticalVisualizerType } from '../../../app/VisualizerType';

import VisualizerBaseRenderer, { VisualizerRendererOptions } from '../VisualizerBaseRenderer';
import VisualizerRenderArgs from '../VisualizerRenderArgs';
import VisualizerRenderReturnArgs from '../VisualizerRenderReturnArgs';

export type VerticalRendererOptions<T extends VerticalVisualizerType> = VisualizerRendererOptions<
    Omit<VerticalVisualizerProperties, 'bars' | 'blocks' | 'wave'>,
    T extends VerticalVisualizerType.Bars ? VerticalVisualizerProperties['bars']
        : T extends VerticalVisualizerType.Blocks ? VerticalVisualizerProperties['blocks']
        : T extends VerticalVisualizerType.Wave ? VerticalVisualizerProperties['wave']
        : never
>;

export interface VisualizerParams {
    canvasContext: CanvasRenderingContext2D;
    N: number;
    flip: VisualizerFlipType;
    visualizerPosition: number;
    visualizerWidth: number;
    alignment: number;
    height: number;
    colorRgb: Readonly<RGB>;
    colorReaction: ((value: number) => RGB) | undefined;
    colorReactionValueProvider: AudioResponsiveValueProviderFunction;
}

export default abstract class VerticalRenderer<T extends VerticalVisualizerType> extends VisualizerBaseRenderer<VerticalRendererOptions<T>> {
    abstract renderSamples(args: VisualizerRenderArgs, visualizerParams: VisualizerParams): void;

    protected getColor(args: VisualizerRenderArgs): Readonly<RGBA> {
        const O = this.options.commonOptions;
        return (args.isSilent && O.useSilentColor ? O.silentColor : O.color) as Readonly<RGBA>;
    }

    protected getSampleDx(numberOfSamples: number, i: number, flip: VisualizerFlipType, spacing: number, width: number = 0) {
        const index = [
            flip === VisualizerFlipType.LeftChannel || flip === VisualizerFlipType.Both ? numberOfSamples - 1 - i : i,
            flip === VisualizerFlipType.RightChannel || flip === VisualizerFlipType.Both ? numberOfSamples - 1 - i : i,
        ];
        return [
            spacing / 2 + index[0] * (width + spacing),
            spacing / 2 + index[1] * (width + spacing),
        ];
    }

    render(timestamp: number, args: VisualizerRenderArgs): VisualizerRenderReturnArgs | null {
        const canvasContext = this.canvas.current?.getContext('2d');
        if (!canvasContext) return null;

        let renderReturnArgs: VisualizerRenderReturnArgs | null = null;

        canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
        if (!this.context.wallpaperProperties.audioprocessing) {
            args.samples?.clear();
        } else if (args.samples) {
            const N = args.samples.length * 2;

            const Ov = this.options.visualizerOptions;
            const O = this.options.commonOptions;

            const bassEffect = args.bass > 0 ? 1 + args.bass * args.bassEffectIntensity : 1;

            const flipFrequencies = Ov.current.flip;
            const visualizerPosition = canvasContext.canvas.height * (O.position / 100);
            const visualizerWidth = canvasContext.canvas.width * (O.width / 100) * bassEffect;
            const alignment = O.alignment;

            const colorRgba = this.getColor(args);
            const colorRgb: Readonly<RGB> = [ colorRgba[0], colorRgba[1], colorRgba[2] ];
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
            const height = this.getHeight(maxHeight * bassEffect);

            if (colorReaction === undefined) {
                this.setCanvasColor(canvasContext, colorRgb as RGB);
            }

            this.renderSamples(args, {
                canvasContext,
                N,
                flip: flipFrequencies,
                visualizerPosition,
                visualizerWidth,
                alignment,
                height,
                colorRgb,
                colorReaction,
                colorReactionValueProvider,
            });

            renderReturnArgs = {
                samples: args.samples,
                color: colorRgb,
                colorReactionType: Ov.current.responseType,
                colorReaction,
                colorResponseValueGain: Ov.current.responseValueGain,
            };
        }

        return renderReturnArgs;
    }
}
