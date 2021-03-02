import { RGB } from 'color-convert/conversions';

import AudioSamplesArray from '../../../common/AudioSamplesArray';
import { VerticalVisualizerType } from '../../../app/VisualizerType';
import VisualizerRenderArgs from '../VisualizerRenderArgs';
import VerticalRenderer, { VisualizerParams } from './VerticalRenderer';

import { curveTo, getCurveToPoints, stroke } from '../wave-util';

/**
 * @param {number} x x coordinate of the top-left corner of the bar.
 * @param {number} y y coordinate of the top-left corner of the bar.
 */
function renderWave(
    canvasContext: CanvasRenderingContext2D,
    x: number, y: number, height: number,
    alignment: number,
    thickness: number,
    smoothness: number,
    showMirrorWave: boolean, fill: boolean,
    prev: { x: number, y: number, height: number } | null,
    next: { x: number, y: number, height: number } | null,
) {
    if (prev === null) return;

    canvasContext.beginPath();

    const main = alignment >= 0 ? { x, y } : { x, y: y + height };
    const prevMain = alignment >= 0 ? { x: prev.x, y: prev.y } : { x: prev.x, y: prev.y + prev.height };
    const nextMain = next !== null ? (alignment >= 0 ? { x: next.x, y: next.y } : { x: next.x, y: next.y + next.height }) : null;

    const [ mainCurveStart, mainCurveEnd ] = getCurveToPoints(prevMain, main, nextMain, smoothness);
    canvasContext.moveTo(mainCurveStart.x, mainCurveStart.y);
    curveTo(canvasContext, prevMain, main, nextMain, mainCurveEnd, smoothness);

    if (showMirrorWave) {
        const mirror = alignment >= 0 ? { x, y: y + height } : { x, y };
        const prevMirror = alignment >= 0 ? { x: prev.x, y: prev.y + prev.height } : { x: prev.x, y: prev.y };
        const nextMirror = next !== null ? (alignment >= 0 ? { x: next.x, y: next.y + next.height } : { x: next.x, y: next.y }) : null;

        const d1 = Math.sqrt((prevMain.x - prevMirror.x) ** 2 + (prevMain.y - prevMirror.y) ** 2);
        const d2 = Math.sqrt((main.x - mirror.x) ** 2 + (main.y - mirror.y) ** 2);
        const shouldFill = fill && (d1 >= 1 || d2 >= 1);

        const [ mirrorCurveStart, mirrorCurveEnd ] = getCurveToPoints(prevMirror, mirror, nextMirror, smoothness);
        if (shouldFill) {
            canvasContext.lineTo(mirrorCurveEnd.x, mirrorCurveEnd.y);
            canvasContext.closePath();
            canvasContext.fill();
            canvasContext.moveTo(mainCurveStart.x, mainCurveStart.y);
            canvasContext.lineTo(mirrorCurveStart.x, mirrorCurveStart.y);
            curveTo(canvasContext, prevMirror, mirror, nextMirror, mirrorCurveEnd, smoothness);
            canvasContext.closePath();
            canvasContext.fill();

            // Fix gap between wave sections, probably caused by the use of floating point coordinates
            canvasContext.moveTo(mainCurveEnd.x, mainCurveEnd.y);
            canvasContext.lineTo(mirrorCurveEnd.x, mirrorCurveEnd.y);
            stroke(canvasContext, 1);
        } else {
            canvasContext.moveTo(mirrorCurveStart.x, mirrorCurveStart.y);
            curveTo(canvasContext, prevMirror, mirror, nextMirror, mirrorCurveEnd, smoothness);
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

    private getSampleRenderProps(samples: AudioSamplesArray, i: number, visualizerParams: VisualizerParams, args: VisualizerRenderArgs, spacing: number) {
        if (i >= samples.length) return null;

        const sample = samples.getSample(i);

        const {
            canvasContext,
            flipFrequencies,
            visualizerPosition,
            alignment,
            height,
            colorRgb,
            colorReaction,
            colorReactionValueProvider,
        } = visualizerParams;

        // y = H - p - h∙(1+a)/2
        const y = [
            canvasContext.canvas.height - visualizerPosition - 0.5 * (1 + alignment) * (sample[0] * height),
            canvasContext.canvas.height - visualizerPosition - 0.5 * (1 + alignment) * (sample[1] * height),
        ];

        const index = flipFrequencies ? (samples.length - 1 - i) : i;
        const dx = spacing / 2 + index * spacing;
        const fillColor = this.computeFillColor(i, args, colorRgb, colorReaction, colorReactionValueProvider);

        return {
            fillColor,
            position: [
                { x: canvasContext.canvas.width / 2 - dx, y: y[0] },
                { x: canvasContext.canvas.width / 2 + dx, y: y[1] },
            ],
            height: [ sample[0] * height, sample[1] * height ],
        };
    }

    renderSamples(args: VisualizerRenderArgs, visualizerParams: VisualizerParams): void {
        if (args.samples === undefined) return;

        const O = this.options.options;
        if (args.isSilent && O.hideWhenSilent) return;

        const {
            canvasContext,
            N: N_BARS,
            flipFrequencies,
            visualizerWidth,
            alignment,
        } = visualizerParams;

        const waveThickness = O.thickness;
        const smoothness = O.smoothness;
        const showMirrorWave = O.showMirrorWave;
        const fill = O.fill;

        const spacing = visualizerWidth / N_BARS;

        let prev: { x: number, y: number, height: number }[] | null = null;
        args.samples.forEach((sample, i, samples) => {
            const sampleRenderProps = this.getSampleRenderProps(samples, i, visualizerParams, args, spacing);
            if (sampleRenderProps === null) return;

            const { fillColor, position: samplePosition, height: sampleHeight } = sampleRenderProps;
            const current = [
                { x: samplePosition[0].x, y: samplePosition[0].y, height: sampleHeight[0] },
                { x: samplePosition[1].x, y: samplePosition[1].y, height: sampleHeight[1] },
            ];

            const nextSampleRenderProps = this.getSampleRenderProps(samples, i + 1, visualizerParams, args, spacing);
            const next = nextSampleRenderProps !== null ? [
                { x: nextSampleRenderProps.position[0].x, y: nextSampleRenderProps.position[0].y, height: nextSampleRenderProps.height[0] },
                { x: nextSampleRenderProps.position[1].x, y: nextSampleRenderProps.position[1].y, height: nextSampleRenderProps.height[1] },
            ] : null;

            // Render left and right samples
            canvasContext.save();

            canvasContext.setFillColorRgb(fillColor[0] as RGB);
            canvasContext.setStrokeColorRgb(fillColor[0] as RGB);
            renderWave(canvasContext, current[0].x, current[0].y, current[0].height, alignment, waveThickness, smoothness, showMirrorWave, fill, prev?.[0] ?? null, next?.[0] ?? null);

            if (fillColor.length > 0) {
                canvasContext.setFillColorRgb(fillColor[1] as RGB);
                canvasContext.setStrokeColorRgb(fillColor[1] as RGB);
            }
            renderWave(canvasContext, current[1].x, current[1].y, current[1].height, alignment, waveThickness, smoothness, showMirrorWave, fill, prev?.[1] ?? null, next?.[1] ?? null);

            prev = current;

            // Link first left sample with first right sample
            if ((i === 0 && !flipFrequencies) || (i === samples.length - 1 && flipFrequencies)) {
                renderWave(canvasContext, current[0].x, current[0].y, current[0].height, alignment, waveThickness, smoothness, showMirrorWave, fill, current[1], next?.[0] ?? null);
                renderWave(canvasContext, current[1].x, current[1].y, current[1].height, alignment, waveThickness, smoothness, showMirrorWave, fill, current[0], next?.[1] ?? null);
            }

            canvasContext.restore();
        });
    }
}
