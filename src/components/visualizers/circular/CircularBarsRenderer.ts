import { RGB } from 'color-convert/conversions';

import { CircularVisualizerType } from '../../../app/VisualizerType';
import VisualizerRenderArgs from '../VisualizerRenderArgs';
import CircularRenderer, { VisualizerParams, getBarSegmentPoints } from './CircularRenderer';

/**
 * @param {number} x x coordinate of the center of the circle.
 * @param {number} y y coordinate of the center of the circle.
 */
function renderBar(canvasContext: CanvasRenderingContext2D, x: number, y: number, radius: number, angle: number, barWidth: number, barHeight: number) {
    const stdAngle = -(angle - Math.PI_2);
    const start = getBarSegmentPoints(0, stdAngle, radius, { x, y }, barWidth);

    if (barHeight >= 1) {
        const end = getBarSegmentPoints(barHeight, stdAngle, radius, { x, y }, barWidth);

        canvasContext.beginPath();
        canvasContext.moveTo(start[0].x, -start[0].y);
        canvasContext.lineTo(start[1].x, -start[1].y);
        canvasContext.lineTo(end[1].x, -end[1].y);
        canvasContext.lineTo(end[0].x, -end[0].y);
        canvasContext.closePath();
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

export default class CircularBarsRenderer extends CircularRenderer<CircularVisualizerType.Bars> {
    getHeight(maxHeight: number): number {
        return maxHeight * (this.options.options.height / 100);
    }

    renderSamples(args: VisualizerRenderArgs, visualizerParams: VisualizerParams): void {
        if (args.samples === undefined) return;

        const O = this.options.options;

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

        args.samples.forEach((sample, i) => {
            const index = flipFrequencies ? (args.samples!.length - 1 - i) : i;
            const angle = angularDelta / 2 + index * angularDelta;
            const fillColor = this.computeFillColor(i, args, colorRgb, colorReaction, colorReactionValueProvider);

            canvasContext.save();

            canvasContext.setFillColorRgb(fillColor[0] as RGB);
            canvasContext.setStrokeColorRgb(fillColor[0] as RGB);
            renderBar(canvasContext, x, y, radius, rotation - angle, width, sample[0] * height);

            if (fillColor.length > 0) {
                canvasContext.setFillColorRgb(fillColor[1] as RGB);
                canvasContext.setStrokeColorRgb(fillColor[1] as RGB);
            }
            renderBar(canvasContext, x, y, radius, rotation + angle, width, sample[1] * height);

            canvasContext.restore();
        });
    }
}
