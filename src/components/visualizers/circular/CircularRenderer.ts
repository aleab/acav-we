import { RGB } from 'color-convert/conversions';

import { CircularVisualizerProperties } from '../../../app/properties/VisualizerProperties';
import { AudioResponsiveValueProviderFactory, AudioResponsiveValueProviderFunction } from '../../../app/AudioResponsiveValueProvider';
import { ColorReactionFactory, ColorReactionType } from '../../../app/ColorReactionType';
import { VisualizerFlipType } from '../../../app/VisualizerFlipType';
import { CircularVisualizerType } from '../../../app/VisualizerType';

import VisualizerBaseRenderer, { VisualizerRendererOptions } from '../VisualizerBaseRenderer';
import VisualizerRenderArgs from '../VisualizerRenderArgs';
import VisualizerRenderReturnArgs from '../VisualizerRenderReturnArgs';

export type CircularRendererOptions<T extends CircularVisualizerType> = VisualizerRendererOptions<
    Omit<CircularVisualizerProperties, 'bars' | 'blocks' | 'wave'>,
    T extends CircularVisualizerType.Bars ? CircularVisualizerProperties['bars']
        : T extends CircularVisualizerType.Blocks ? CircularVisualizerProperties['blocks']
        : T extends CircularVisualizerType.Wave ? CircularVisualizerProperties['wave']
        : never
>;

export interface VisualizerParams {
    canvasContext: CanvasRenderingContext2D;
    N: number;
    visualizerAngle: number;
    angularDelta: number;
    flip: VisualizerFlipType;
    x: number;
    y: number;
    radius: number;
    rotation: number;
    height: number;
    colorRgb: Readonly<RGB>;
    colorReaction: ((value: number) => RGB) | undefined;
    colorReactionValueProvider: AudioResponsiveValueProviderFunction;
}

export default abstract class CircularRenderer<T extends CircularVisualizerType> extends VisualizerBaseRenderer<CircularRendererOptions<T>> {
    abstract renderSamples(args: VisualizerRenderArgs, visualizerParams: VisualizerParams): void;

    protected getColor(args: VisualizerRenderArgs): Readonly<RGBA> {
        const O = this.options.commonOptions;
        return (args.isSilent && O.useSilentColor ? O.silentColor : O.color) as Readonly<RGBA>;
    }

    protected getSampleAngle(numberOfSamples: number, i: number, flip: VisualizerFlipType, angularDelta: number) {
        const index = [
            flip === VisualizerFlipType.LeftChannel || flip === VisualizerFlipType.Both ? numberOfSamples - 1 - i : i,
            flip === VisualizerFlipType.RightChannel || flip === VisualizerFlipType.Both ? numberOfSamples - 1 - i : i,
        ];
        return [
            angularDelta / 2 + index[0] * angularDelta,
            angularDelta / 2 + index[1] * angularDelta,
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

            const minDimension = Math.min(canvasContext.canvas.width, canvasContext.canvas.height);
            const visualizerAngle = O.angle;
            const angularDelta = (visualizerAngle * Math.DEG2RAD) / N;

            const flipFrequencies = Ov.current.flip;
            const x = canvasContext.canvas.width * (O.x / 100);
            const y = canvasContext.canvas.height * (O.y / 100);
            const radius = minDimension * (O.radius / 100);
            const rotation = O.rotation * Math.DEG2RAD;

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

            const maxHeight = Math.clamp(minDimension / 2 - radius, 0, minDimension / 2);
            const height = this.getHeight(maxHeight);

            if (colorReaction === undefined) {
                this.setCanvasColor(canvasContext, colorRgb as RGB);
            }

            this.renderSamples(args, {
                canvasContext,
                N,
                visualizerAngle,
                angularDelta,
                flip: flipFrequencies,
                x,
                y,
                radius,
                rotation,
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
