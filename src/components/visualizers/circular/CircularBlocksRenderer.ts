import { RGB } from 'color-convert/conversions';

import { CircularVisualizerType } from '../../../app/VisualizerType';
import VisualizerRenderArgs from '../VisualizerRenderArgs';
import CircularRenderer, { VisualizerParams, getBarSegmentPoints } from './CircularRenderer';

/**
 * @param {number} x x coordinate of the center of the circle.
 * @param {number} y y coordinate of the center of the circle.
 */
function renderBlock(
    canvasContext: CanvasRenderingContext2D,
    x: number, y: number,
    radius: number, angle: number,
    barWidth: number, barHeight: number,
    blockThickness: number,
    maxHeight: number,
    angularDelta: number,
    showMirror: boolean,
) {
    const stdAngle = -(angle - Math.PI_2);

    let startDistance = 0;
    if (showMirror) {
        const maxMirrorHeight = radius - (barWidth / (2 * Math.sin(angularDelta / 2)));
        if (maxMirrorHeight > 0) {
            startDistance = -Math.clamp((barHeight * maxMirrorHeight) / maxHeight, 0, maxMirrorHeight);
        }
    }

    const start = getBarSegmentPoints(startDistance, stdAngle, radius, { x, y }, barWidth);
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
    canvasContext.closePath();
    canvasContext.fill();
}

export default class CircularBlocksRenderer extends CircularRenderer<CircularVisualizerType.Blocks> {
    getHeight(maxHeight: number): number {
        return maxHeight * (this.options.options.height / 100);
    }

    renderSamples(args: VisualizerRenderArgs, visualizerParams: VisualizerParams): void {
        if (args.samples === undefined) return;

        const O = this.options.options;
        if (args.isSilent && O.hideWhenSilent) return;

        const {
            canvasContext,
            N: N_BARS,
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
        } = visualizerParams;

        const width = (2 * radius * Math.sin(angularDelta / 2)) * (O.width / 100);
        const showMirror = O.showMirror;
        const blockThickness = O.thickness;

        args.samples.forEach((sample, i) => {
            const index = flipFrequencies ? (args.samples!.length - 1 - i) : i;
            const angle = angularDelta / 2 + index * angularDelta;
            const fillColor = this.computeFillColor(i, args, colorRgb, colorReaction, colorReactionValueProvider);

            canvasContext.save();

            canvasContext.setFillColorRgb(fillColor[0] as RGB);
            canvasContext.setStrokeColorRgb(fillColor[0] as RGB);
            renderBlock(canvasContext, x, y, radius, rotation - angle, width, sample[0] * height, blockThickness, height, angularDelta, showMirror);

            if (fillColor.length > 0) {
                canvasContext.setFillColorRgb(fillColor[1] as RGB);
                canvasContext.setStrokeColorRgb(fillColor[1] as RGB);
            }
            renderBlock(canvasContext, x, y, radius, rotation + angle, width, sample[1] * height, blockThickness, height, angularDelta, showMirror);

            canvasContext.restore();
        });
    }
}
