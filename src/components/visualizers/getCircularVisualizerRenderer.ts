import { MutableRefObject, RefObject } from 'react';
import { RGB } from 'color-convert/conversions';

import Log from '../../common/Log';
import { AudioResponsiveValueProviderFactory } from '../../app/AudioResponsiveValueProvider';
import { ColorReactionFactory, ColorReactionType } from '../../app/ColorReactionType';
import { CircularVisualizerType } from '../../app/VisualizerType';
import { WallpaperContextType } from '../../app/WallpaperContext';
import { CircularVisualizerProperties, VisualizerProperties } from '../../app/properties/VisualizerProperties';

import VisualizerRenderArgs from './VisualizerRenderArgs';

interface Point { x: number;y: number }

function getBarSegmentPoints(distance: number, angle: number, circleRadius: number, circleCenter: Point, barWidth: number): [ Point, Point ] {
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

/**
 * @param {number} x x coordinate of the center of the circle.
 * @param {number} y y coordinate of the center of the circle.
 */
function renderBar(canvasContext: CanvasRenderingContext2D, x: number, y: number, radius: number, angle: number, opts: { barWidth: number, barHeight: number }) {
    const { barWidth, barHeight } = opts;

    const stdAngle = -(angle - Math.PI_2);
    const start = getBarSegmentPoints(0, stdAngle, radius, { x, y }, barWidth);

    if (barHeight >= 1) {
        const end = getBarSegmentPoints(barHeight, stdAngle, radius, { x, y }, barWidth);

        canvasContext.beginPath();
        canvasContext.moveTo(start[0].x, -start[0].y);
        canvasContext.lineTo(start[1].x, -start[1].y);
        canvasContext.lineTo(end[1].x, -end[1].y);
        canvasContext.lineTo(end[0].x, -end[0].y);
        canvasContext.fill();
    } else {
        canvasContext.lineCap = 'butt';
        canvasContext.lineWidth = 1;
        canvasContext.beginPath();
        canvasContext.moveTo(start[0].x, -start[0].y);
        canvasContext.lineTo(start[1].x, -start[1].y);
        canvasContext.stroke();
    }
}

/**
 * @param {number} x x coordinate of the center of the circle.
 * @param {number} y y coordinate of the center of the circle.
 */
function renderBlock(canvasContext: CanvasRenderingContext2D, x: number, y: number, radius: number, angle: number, opts: { barWidth: number, barHeight: number, blockThickness: number }) {
    const { barWidth, barHeight, blockThickness } = opts;

    const stdAngle = -(angle - Math.PI_2);

    const start = getBarSegmentPoints(0, stdAngle, radius, { x, y }, barWidth);
    const blockStart = getBarSegmentPoints(barHeight, stdAngle, radius, { x, y }, barWidth);
    const blockEnd = getBarSegmentPoints(barHeight + blockThickness, stdAngle, radius, { x, y }, barWidth);

    canvasContext.lineCap = 'butt';
    canvasContext.lineWidth = 1;
    canvasContext.beginPath();
    canvasContext.moveTo(start[0].x, -start[0].y);
    canvasContext.lineTo(start[1].x, -start[1].y);
    canvasContext.stroke();

    canvasContext.beginPath();
    canvasContext.moveTo(blockStart[0].x, -blockStart[0].y);
    canvasContext.lineTo(blockStart[1].x, -blockStart[1].y);
    canvasContext.lineTo(blockEnd[1].x, -blockEnd[1].y);
    canvasContext.lineTo(blockEnd[0].x, -blockEnd[0].y);
    canvasContext.fill();
}

export default function getCircularVisualizerRenderer(
    context: WallpaperContextType,
    canvas: RefObject<HTMLCanvasElement>,
    visualizerOptions: MutableRefObject<DeepReadonly<VisualizerProperties>>,
    circularVisualizerOptions: MutableRefObject<DeepReadonly<CircularVisualizerProperties>>,
    type: CircularVisualizerType,
) {
    const Ov = visualizerOptions;
    const O = circularVisualizerOptions;

    const _renderOne = type === CircularVisualizerType.Bars ? renderBar
        : type === CircularVisualizerType.Blocks ? renderBlock
        : (..._args: any[]) => {};

    return function render(args: VisualizerRenderArgs) {
        const canvasContext = canvas.current?.getContext('2d');
        if (!canvasContext) return;

        canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
        if (!context.wallpaperProperties.audioprocessing) {
            args.samples?.clear();
        } else if (args.samples) {
            const N_BARS = args.samples.length * 2;
            const minDimension = Math.min(canvasContext.canvas.width, canvasContext.canvas.height);

            const visualizerAngle = O.current.angle;
            const angularDelta = ((visualizerAngle / 180) * Math.PI) / N_BARS;

            // Snapshot current properties, to render all bars consistently with the same settings
            const flipFrequencies = Ov.current.flipFrequencies;
            const x = canvasContext.canvas.width * (O.current.x / 100);
            const y = canvasContext.canvas.height * (O.current.y / 100);
            const radius = minDimension * (O.current.radius / 100);
            const rotation = (O.current.rotation / 180) * Math.PI;
            const barWidth = (2 * radius * Math.sin(angularDelta / 2)) * (O.current.bars.width / 100);
            const barHeight = Math.clamp(minDimension / 2 - radius, 0, minDimension / 2) * (O.current.bars.height / 100);
            const blockThickness = O.current.bars.blockThickness;

            const barColorRgb: Readonly<RGB> = [ O.current.bars.color[0], O.current.bars.color[1], O.current.bars.color[2] ];
            const barColorReaction = Ov.current.responseType !== ColorReactionType.None
                ? ColorReactionFactory.buildColorReaction(Ov.current.responseType, {
                    fromRgb: barColorRgb,
                    toRgb: [ Ov.current.responseToHue[0], Ov.current.responseToHue[1], Ov.current.responseToHue[2] ],
                    degree: Ov.current.responseDegree,
                    range: Ov.current.responseRange,
                }) : undefined;
            const barColorReactionValueProvider = AudioResponsiveValueProviderFactory.buildAudioResponsiveValueProvider(Ov.current.responseProvider, Ov.current.responseValueGain);

            if (barColorReaction === undefined) {
                canvasContext.setFillColorRgb(barColorRgb as RGB);
                canvasContext.setStrokeColorRgb(barColorRgb as RGB);
            }
            args.samples.forEach((sample, i) => {
                if (sample[0] > args.peak || sample[1] > args.peak) {
                    Log.warn('A sample is > the current peak!', { sample, peak: args.peak });
                } else if (sample[0] > 1 || sample[1] > 1) {
                    Log.warn('A sample is > 1!', sample);
                }

                const index = flipFrequencies ? (args.samples!.length - 1 - i) : i;
                const angle = angularDelta / 2 + index * angularDelta;

                const fillColor = [ barColorRgb, barColorRgb ];
                if (barColorReaction !== undefined) {
                    const value = barColorReactionValueProvider([ sample[0], sample[1] ], i, { samplesBuffer: args.samplesBuffer, peak: args.peak });
                    if (!Number.isNaN(value[0]) && !Number.isNaN(value[1])) {
                        fillColor[0] = barColorReaction(value[0]);
                        fillColor[1] = barColorReaction(value[1]);
                    }
                }

                canvasContext.save();
                canvasContext.setFillColorRgb(fillColor[0] as RGB);
                canvasContext.setStrokeColorRgb(fillColor[0] as RGB);
                _renderOne(canvasContext, x, y, radius, rotation - angle, {
                    barWidth,
                    barHeight: sample[0] * barHeight,
                    blockThickness,
                });

                if (fillColor.length > 0) {
                    canvasContext.setFillColorRgb(fillColor[1] as RGB);
                    canvasContext.setStrokeColorRgb(fillColor[1] as RGB);
                }
                _renderOne(canvasContext, x, y, radius, rotation + angle, {
                    barWidth,
                    barHeight: sample[1] * barHeight,
                    blockThickness,
                });
                canvasContext.restore();
            });
        }
    };
}
