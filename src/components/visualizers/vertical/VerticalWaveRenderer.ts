import { RGB, rgb } from 'color-convert/conversions';

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

function getPrimaryAndMirrorParts(alignment: number, x: number, y: number, height: number, prev: WavePointProps, next: WavePointProps | null): Tuple<[Point, Point, Point | null], 2> {
    const top = { x, y };
    const bottom = { x, y: y + height };
    const prevTop = { x: prev.x, y: prev.y };
    const prevBottom = { x: prev.x, y: prev.y + prev.height };
    const nextTop = next !== null ? { x: next.x, y: next.y } : null;
    const nextBottom = next !== null ? { x: next.x, y: next.y + next.height } : null;

    return alignment >= 0
        ? [ [ top, prevTop, nextTop ], [ bottom, prevBottom, nextBottom ] ]
        : [ [ bottom, prevBottom, nextBottom ], [ top, prevTop, nextTop ] ];
}

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

    const [ [ currentPrimary, prevPrimary, nextPrimary ], [ currentMirror, prevMirror, nextMirror ] ] = getPrimaryAndMirrorParts(alignment, x, y, height, prev, next);

    const [ primaryCurveStart, primaryCurveEnd ] = getCurveToPoints(prevPrimary, currentPrimary, nextPrimary, smoothness);

    const baseline = y + 0.5 * (1 + alignment) * height;
    const dx = primaryCurveEnd.x - primaryCurveStart.x;

    if (smoothColorTransitions) {
        const gradient = canvasContext.createLinearGradient(primaryCurveStart.x - dx / 2, baseline, primaryCurveEnd.x + dx / 2, baseline);

        gradient.addColorStop(0.0, '#' + rgb.hex(prev.color as RGB));
        gradient.addColorStop(0.5, '#' + rgb.hex(color as RGB));
        gradient.addColorStop(1.0, '#' + rgb.hex((next?.color ?? color) as RGB));

        canvasContext.fillStyle = gradient;
        canvasContext.strokeStyle = gradient;
    } else {
        canvasContext.setFillColorRgb(color as RGB);
        canvasContext.setStrokeColorRgb(color as RGB);
    }

    canvasContext.beginPath();
    canvasContext.moveTo(primaryCurveStart.x, primaryCurveStart.y);
    curveTo(canvasContext, prevPrimary, currentPrimary, nextPrimary, primaryCurveEnd, smoothness);

    if (showMirrorWave) {
        const shouldFill = fill && (Math.abs(currentPrimary.y - currentMirror.y) >= 1 || Math.abs(prevPrimary.y - prevMirror.y) >= 1);

        const [ mirrorCurveStart, mirrorCurveEnd ] = getCurveToPoints(prevMirror, currentMirror, nextMirror, smoothness);
        if (shouldFill) {
            canvasContext.lineTo(primaryCurveEnd.x, baseline);
            canvasContext.lineTo(primaryCurveStart.x, baseline);
            canvasContext.closePath();
            canvasContext.fill();

            canvasContext.moveTo(mirrorCurveStart.x, mirrorCurveStart.y);
            curveTo(canvasContext, prevMirror, currentMirror, nextMirror, mirrorCurveEnd, smoothness);
            canvasContext.lineTo(mirrorCurveEnd.x, baseline);
            canvasContext.lineTo(mirrorCurveStart.x, baseline);
            canvasContext.closePath();
            canvasContext.fill();

            // Fix gap between wave sections, probably caused by the use of floating point coordinates
            canvasContext.moveTo(primaryCurveEnd.x, primaryCurveEnd.y);
            canvasContext.lineTo(mirrorCurveEnd.x, mirrorCurveEnd.y);
            stroke(canvasContext, 1);
        } else {
            canvasContext.moveTo(mirrorCurveStart.x, mirrorCurveStart.y);
            curveTo(canvasContext, prevMirror, currentMirror, nextMirror, mirrorCurveEnd, smoothness);
            stroke(canvasContext, fill ? 1 : thickness);
        }
    } else {
        stroke(canvasContext, fill ? 1 : thickness);
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
