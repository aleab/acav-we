import { RGB } from 'color-convert/conversions';

import AudioSamplesArray from '../../../common/AudioSamplesArray';
import { VisualizerFlipType } from '../../../app/VisualizerFlipType';
import { VerticalVisualizerType } from '../../../app/VisualizerType';
import VisualizerRenderArgs from '../VisualizerRenderArgs';
import { RenderWaveOptions } from '../circular/CircularRenderer';
import VerticalRenderer, { VisualizerParams } from './VerticalRenderer';

import { curveTo, getCurveToPoints, stroke } from '../wave-util';

type WavePointProps = {
    /** X coordinate of the top-left corner of the bar. */
    x: number;
    /** Y coordinate of the top-left corner of the bar. */
    y: number;
    height: number;
    color: Readonly<RGB>;
};

function renderWave(
    canvasContext: CanvasRenderingContext2D,
    props: WavePointProps,
    alignment: number,
    options: RenderWaveOptions,
    prev: WavePointProps | null,
    next: WavePointProps | null,
) {
    if (prev === null) return;

    const { x, y, height, color } = props;
    const { showMirrorWave, fill, thickness, smoothness, smoothColorTransitions } = options;

    canvasContext.setFillColorRgb(color as RGB);
    canvasContext.setStrokeColorRgb(color as RGB);

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

    private getSampleRenderProps(samples: AudioSamplesArray, i: number, visualizerParams: VisualizerParams, args: VisualizerRenderArgs, spacing: number): Tuple<WavePointProps, 2> | null {
        if (i >= samples.length) return null;

        const sample = samples.getSample(i);

        const {
            canvasContext,
            flip,
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

        const dx = this.getSampleDx(samples.length, i, flip, spacing);
        const fillColor = this.computeFillColor(i, args, colorRgb, colorReaction, colorReactionValueProvider);

        return [
            { x: canvasContext.canvas.width / 2 - dx[0], y: y[0], height: sample[0] * height, color: fillColor[0] },
            { x: canvasContext.canvas.width / 2 + dx[1], y: y[1], height: sample[1] * height, color: fillColor[1] },
        ];
    }

    renderSamples(args: VisualizerRenderArgs, visualizerParams: VisualizerParams): void {
        if (args.samples === undefined) return;

        const O = this.options.options;
        if (args.isSilent && O.hideWhenSilent) return;

        const {
            canvasContext,
            N: N_BARS,
            flip,
            visualizerWidth,
            alignment,
        } = visualizerParams;

        const spacing = visualizerWidth / N_BARS;

        let prev: Tuple<WavePointProps, 2> | null = null;
        let first: Tuple<WavePointProps, 2> | null = null;
        let second: Tuple<WavePointProps, 2> | null = null;
        args.samples.forEach((sample, i, samples) => {
            const sampleRenderProps = this.getSampleRenderProps(samples, i, visualizerParams, args, spacing);
            if (sampleRenderProps === null) return;

            const current = sampleRenderProps;
            const next = this.getSampleRenderProps(samples, i + 1, visualizerParams, args, spacing);

            if (first === null) {
                first = current;
            } else if (second === null) {
                second = current;
            }

            // Render left and right samples
            canvasContext.save();

            renderWave(canvasContext, current[0], alignment, O, prev?.[0] ?? null, next?.[0] ?? null);
            renderWave(canvasContext, current[1], alignment, O, prev?.[1] ?? null, next?.[1] ?? null);

            prev = current;

            const q: Array<[ WavePointProps, WavePointProps | null, WavePointProps | null ]> = [];
            switch (flip) {
                case VisualizerFlipType.LeftChannel:
                    // Link last L to first R
                    if (i === samples.length - 1) {
                        q.push([ current[0], prev![0], first![1] ], [ first![1], current[0], second![1] ]);
                    }
                    break;

                case VisualizerFlipType.RightChannel:
                    // Link first L to last R
                    if (i === samples.length - 1) {
                        q.push([ first![0], second![0], current[1] ], [ current[1], first![0], prev![1] ]);
                    }
                    break;

                case VisualizerFlipType.Both:
                    // Link last L to last R
                    if (i === samples.length - 1) {
                        q.push([ current[0], prev![0], current[1] ], [ current[1], current[0], prev![1] ]);
                    }
                    break;

                case VisualizerFlipType.None:
                    // Link first L to first R
                    if (i === 0) {
                        q.push([ current[0], current[1], next![0] ], [ current[1], current[0], next![1] ]);
                    }
                    break;
                default: break;
            }

            q.forEach(o => {
                renderWave(canvasContext, o[0], alignment, O, o[1], o[2]);
            });

            canvasContext.restore();
        });
    }
}
