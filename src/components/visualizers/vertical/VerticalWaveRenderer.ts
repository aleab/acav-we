import { RGB } from 'color-convert/conversions';

import { VerticalVisualizerType } from '../../../app/VisualizerType';
import VisualizerRenderArgs from '../VisualizerRenderArgs';
import VerticalRenderer, { VisualizerParams } from './VerticalRenderer';

function stroke(canvasContext: CanvasRenderingContext2D, thickness: number) {
    canvasContext.lineCap = 'round';
    canvasContext.lineJoin = 'round';
    canvasContext.lineWidth = thickness;
    canvasContext.stroke();
}

/**
 * @param {number} x x coordinate of the top-left corner of the bar.
 * @param {number} y y coordinate of the top-left corner of the bar.
 */
function renderWave(
    canvasContext: CanvasRenderingContext2D,
    x: number, y: number, height: number,
    thickness: number,
    alignment: number,
    showMirrorWave: boolean, fill: boolean,
    prev: { x: number, y: number, height: number } | null,
) {
    if (prev === null) return;


    canvasContext.beginPath();

    const main = alignment >= 0 ? { x, y } : { x, y: y + height };
    const prevMain = alignment >= 0 ? { x: prev.x, y: prev.y } : { x: prev.x, y: prev.y + prev.height };
    canvasContext.moveTo(prevMain.x, prevMain.y);
    canvasContext.lineTo(main.x, main.y);

    if (showMirrorWave) {
        const other = alignment >= 0 ? { x, y: y + height } : { x, y };
        const prevOther = alignment >= 0 ? { x: prev.x, y: prev.y + prev.height } : { x: prev.x, y: prev.y };

        const d1 = Math.sqrt((prevMain.x - prevOther.x) ** 2 + (prevMain.y - prevOther.y) ** 2);
        const d2 = Math.sqrt((main.x - other.x) ** 2 + (main.y - other.y) ** 2);
        const shouldFill = fill && (d1 >= 1 || d2 >= 1);

        if (shouldFill) {
            canvasContext.lineTo(other.x, other.y);
            canvasContext.lineTo(prevOther.x, prevOther.y);
            canvasContext.fill();
        } else {
            canvasContext.moveTo(prevOther.x, prevOther.y);
            canvasContext.lineTo(other.x, other.y);
            stroke(canvasContext, thickness);
        }
    } else {
        stroke(canvasContext, thickness);
    }
}

export default class VerticalWaveRenderer extends VerticalRenderer<VerticalVisualizerType.Wave> {
    getHeight(maxHeight: number): number {
        return maxHeight * (this.options.options.height / 100);
    }

    renderSamples(args: VisualizerRenderArgs, visualizerParams: VisualizerParams): void {
        if (args.samples === undefined) return;

        const O = this.options.options;

        const {
            canvasContext,
            N: N_BARS,
            flipFrequencies,
            visualizerPosition,
            visualizerWidth,
            alignment,
            height,
            colorRgb,
            colorReaction,
            colorReactionValueProvider,
        } = visualizerParams;

        const waveThickness = O.thickness;
        const showMirrorWave = O.showMirrorWave;
        const fill = O.fill;
        const spacing = visualizerWidth / N_BARS;

        let prev: { x: number, y: number, height: number }[] | null = null;
        args.samples.forEach((sample, i) => {
            if (sample[0] === 0 && sample[1] === 0) return;

            // y = H - p - h∙(1+a)/2
            const y = [
                canvasContext.canvas.height - visualizerPosition - 0.5 * (1 + alignment) * (sample[0] * height),
                canvasContext.canvas.height - visualizerPosition - 0.5 * (1 + alignment) * (sample[1] * height),
            ];

            const index = flipFrequencies ? (args.samples!.length - 1 - i) : i;
            const dx = spacing / 2 + index * spacing;
            const fillColor = this.computeFillColor(i, args, colorRgb, colorReaction, colorReactionValueProvider);

            const current = [
                { x: canvasContext.canvas.width / 2 - dx, y: y[0], height: sample[0] * height },
                { x: canvasContext.canvas.width / 2 + dx, y: y[1], height: sample[1] * height },
            ];

            canvasContext.save();

            if (sample[0] !== 0) {
                canvasContext.setFillColorRgb(fillColor[0] as RGB);
                canvasContext.setStrokeColorRgb(fillColor[0] as RGB);
                renderWave(canvasContext, current[0].x, current[0].y, current[0].height, waveThickness, alignment, showMirrorWave, fill, prev?.[0] ?? null);
            }
            if (sample[1] !== 0) {
                if (fillColor.length > 0) {
                    canvasContext.setFillColorRgb(fillColor[1] as RGB);
                    canvasContext.setStrokeColorRgb(fillColor[1] as RGB);
                }
                renderWave(canvasContext, current[1].x, current[1].y, current[1].height, waveThickness, alignment, showMirrorWave, fill, prev?.[1] ?? null);
            }
            prev = current;

            // Link first left sample with first right sample
            if (i === 0) {
                renderWave(canvasContext, current[0].x, current[0].y, current[0].height, waveThickness, alignment, showMirrorWave, fill, current[1]);
            }

            canvasContext.restore();
        });
    }
}
