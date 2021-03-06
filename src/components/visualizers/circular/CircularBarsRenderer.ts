import { RGB } from 'color-convert/conversions';

import { CircularVisualizerType } from '../../../app/VisualizerType';
import VisualizerRenderArgs from '../VisualizerRenderArgs';
import CircularRenderer, { VisualizerParams, getBarSegmentPoints } from './CircularRenderer';

/**
 * @param {number} x x coordinate of the center of the circle.
 * @param {number} y y coordinate of the center of the circle.
 */
function renderBar(
    canvasContext: CanvasRenderingContext2D,
    x: number, y: number,
    radius: number, angle: number,
    barWidth: number, barHeight: number,
    minHeight: number, maxHeight: number,
    angularDelta: number,
    showMirror: boolean,
) {
    const stdAngle = -(angle - Math.PI_2);

    if (barHeight > minHeight) {
        let startDistance = 0;
        if (showMirror) {
            const maxMirrorHeight = radius - (barWidth / (2 * Math.sin(angularDelta / 2)));
            if (maxMirrorHeight > 0) {
                startDistance = -Math.clamp((barHeight * maxMirrorHeight) / maxHeight, 0, maxMirrorHeight);
            }
        }

        const start = getBarSegmentPoints(startDistance, stdAngle, radius, { x, y }, barWidth);
        const end = getBarSegmentPoints(barHeight, stdAngle, radius, { x, y }, barWidth);

        canvasContext.beginPath();
        canvasContext.moveTo(start[0].x, -start[0].y);
        canvasContext.lineTo(start[1].x, -start[1].y);
        canvasContext.lineTo(end[1].x, -end[1].y);
        canvasContext.lineTo(end[0].x, -end[0].y);
        canvasContext.closePath();
        canvasContext.fill();
    } else {
        const start = getBarSegmentPoints(0, stdAngle, radius, { x, y }, barWidth);
        canvasContext.lineCap = 'butt';
        canvasContext.lineWidth = minHeight;
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
        if (args.isSilent && O.minHeight === 0) return;

        const {
            canvasContext,
            N: N_BARS,
            angularDelta,
            flip,
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

        args.samples.forEach((sample, i) => {
            const angle = this.getSampleAngle(args.samples!.length, i, flip, angularDelta);
            const fillColor = this.computeFillColor(i, args, colorRgb, colorReaction, colorReactionValueProvider);

            canvasContext.save();

            canvasContext.setFillColorRgb(fillColor[0] as RGB);
            canvasContext.setStrokeColorRgb(fillColor[0] as RGB);
            renderBar(canvasContext, x, y, radius, rotation - angle[0], width, sample[0] * height, O.minHeight, height, angularDelta, showMirror);

            if (fillColor.length > 0) {
                canvasContext.setFillColorRgb(fillColor[1] as RGB);
                canvasContext.setStrokeColorRgb(fillColor[1] as RGB);
            }
            renderBar(canvasContext, x, y, radius, rotation + angle[1], width, sample[1] * height, O.minHeight, height, angularDelta, showMirror);

            canvasContext.restore();
        });
    }
}
