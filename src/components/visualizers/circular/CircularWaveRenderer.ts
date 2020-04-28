import { RGB } from 'color-convert/conversions';

import { CircularVisualizerType } from '../../../app/VisualizerType';
import VisualizerRenderArgs from '../VisualizerRenderArgs';
import CircularRenderer, { VisualizerParams } from './CircularRenderer';

function stroke(canvasContext: CanvasRenderingContext2D, thickness: number) {
    canvasContext.lineCap = 'round';
    canvasContext.lineJoin = 'round';
    canvasContext.lineWidth = thickness;
    canvasContext.stroke();
}

function getPointOnCircumference(radius: number, center: { x: number; y: number }, angleRad: number) {
    const { x, y } = center;
    return {
        x: radius * Math.cos(angleRad) + x,
        y: radius * Math.sin(angleRad) - y,
    };
}

/**
 * @param {number} x x coordinate of the center of the circle.
 * @param {number} y y coordinate of the center of the circle.
 */
function renderWave(
    canvasContext: CanvasRenderingContext2D,
    x: number, y: number, radius: number,
    height: number, angle: number,
    thickness: number,
    showMirrorWave: boolean, fill: boolean,
    prev: { height: number, angle: number } | null,
) {
    if (prev === null) return;

    canvasContext.beginPath();

    const stdAngle = -(angle - Math.PI_2);
    const main = getPointOnCircumference(radius + height, { x, y }, stdAngle);
    const prevStdAngle = -(prev.angle - Math.PI_2);
    const prevMain = getPointOnCircumference(radius + prev.height, { x, y }, prevStdAngle);

    canvasContext.moveTo(prevMain.x, -prevMain.y);
    canvasContext.lineTo(main.x, -main.y);

    if (showMirrorWave) {
        const mirrorHeight = Math.clamp(height / 2, 0, radius / 2);
        const prevMirrorHeight = Math.clamp(prev.height / 2, 0, radius / 2);
        const mirror = getPointOnCircumference(radius - mirrorHeight, { x, y }, stdAngle);
        const prevMirror = getPointOnCircumference(radius - prevMirrorHeight, { x, y }, prevStdAngle);

        const d1 = prevMirrorHeight + prev.height;
        const d2 = mirrorHeight + height;
        const shouldFill = fill && (d1 >= 1 || d2 >= 1);

        if (shouldFill) {
            canvasContext.lineTo(mirror.x, -mirror.y);
            canvasContext.lineTo(prevMirror.x, -prevMirror.y);
            canvasContext.closePath();
            canvasContext.fill();
        } else {
            canvasContext.moveTo(prevMirror.x, -prevMirror.y);
            canvasContext.lineTo(mirror.x, -mirror.y);
            stroke(canvasContext, thickness);
        }
    } else {
        stroke(canvasContext, thickness);
    }
}

export default class CircularWaveRenderer extends CircularRenderer<CircularVisualizerType.Wave> {
    getHeight(maxHeight: number): number {
        return maxHeight * (this.options.options.height / 100);
    }

    renderSamples(args: VisualizerRenderArgs, visualizerParams: VisualizerParams): void {
        if (args.samples === undefined) return;

        const O = this.options.options;
        const N_SAMPLES = args.samples.length;

        const {
            canvasContext,
            visualizerAngle,
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

        const waveThickness = O.thickness;
        const showMirrorWave = O.showMirrorWave;
        const fill = O.fill;

        let prev: { height: number, angle: number }[] | null = null;
        args.samples.forEach((sample, i) => {
            const index = flipFrequencies ? (args.samples!.length - 1 - i) : i;
            const angle = angularDelta / 2 + index * angularDelta;
            const fillColor = this.computeFillColor(i, args, colorRgb, colorReaction, colorReactionValueProvider);

            const current = [
                { height: sample[0] * height, angle: rotation - angle },
                { height: sample[1] * height, angle: rotation + angle },
            ];

            canvasContext.save();

            canvasContext.setFillColorRgb(fillColor[0] as RGB);
            canvasContext.setStrokeColorRgb(fillColor[0] as RGB);
            renderWave(canvasContext, x, y, radius, current[0].height, current[0].angle, waveThickness, showMirrorWave, fill, prev?.[0] ?? null);

            if (fillColor.length > 0) {
                canvasContext.setFillColorRgb(fillColor[1] as RGB);
                canvasContext.setStrokeColorRgb(fillColor[1] as RGB);
            }
            renderWave(canvasContext, x, y, radius, current[1].height, current[1].angle, waveThickness, showMirrorWave, fill, prev?.[1] ?? null);

            prev = current;

            // Link first sample @-angle with first sample @+angle OR
            // Link last samples to close the circle
            if (i === 0 || (i === N_SAMPLES - 1 && visualizerAngle === 360)) {
                renderWave(canvasContext, x, y, radius, current[0].height, current[0].angle, waveThickness, showMirrorWave, fill, current[1]);
            }

            canvasContext.restore();
        });
    }
}
