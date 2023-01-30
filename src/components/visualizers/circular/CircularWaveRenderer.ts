import { RGB, rgb } from 'color-convert/conversions';

import AudioSamplesArray from '../../../common/AudioSamplesArray';
import { VisualizerFlipType } from '../../../app/VisualizerFlipType';
import { CircularVisualizerType } from '../../../app/VisualizerType';
import VisualizerRenderArgs from '../VisualizerRenderArgs';
import CircularRenderer, { RenderWaveOptions, VisualizerParams } from './CircularRenderer';

import { curveTo, getCurveToPoints, stroke } from '../wave-util';

type WavePointProps = {
    height: number;
    angle: number,
    color: Readonly<RGB>;
};

function getPointOnCircle(radius: number, x: number, y: number, angleRad: number): Point {
    return {
        x: radius * Math.cos(angleRad) + x,
        y: -(radius * Math.sin(angleRad) - y),
    };
}

/**
 * @param {number} x x coordinate of the center of the circle.
 * @param {number} y y coordinate of the center of the circle.
 */
function renderWave(
    canvasContext: CanvasRenderingContext2D,
    x: number, y: number, radius: number,
    props: WavePointProps,
    options: RenderWaveOptions,
    prev: WavePointProps | null,
    next: WavePointProps | null,
) {
    if (prev === null) return;

    const { height, angle, color } = props;
    const { showMirrorWave, fill, thickness, smoothness, smoothColorTransitions } = options;

    const mirrorHeight = Math.clamp(height / 2, 0, radius / 2);
    const prevMirrorHeight = Math.clamp(prev.height / 2, 0, radius / 2);

    const currentAngle = -(angle - Math.PI_2);
    const prevAngle = -(prev.angle - Math.PI_2);
    const nextAngle = next !== null ? -(next.angle - Math.PI_2) : undefined;

    const currentPrimary = getPointOnCircle(radius + height, x, y, currentAngle);
    const prevPrimary = getPointOnCircle(radius + prev.height, x, y, prevAngle);
    const nextPrimary = next !== null ? getPointOnCircle(radius + next.height, x, y, nextAngle!) : null;

    const [ primaryCurveStart, primaryCurveEnd ] = getCurveToPoints(prevPrimary, currentPrimary, nextPrimary, smoothness);

    const dθ = currentAngle - prevAngle;

    if (smoothColorTransitions) {
        const from = getPointOnCircle(radius, x, y, prevAngle - dθ / 2);
        const to = getPointOnCircle(radius, x, y, currentAngle + dθ / 2);
        const gradient = canvasContext.createLinearGradient(from.x, from.y, to.x, to.y);

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
        const currentMirror = getPointOnCircle(radius - mirrorHeight, x, y, currentAngle);
        const prevMirror = getPointOnCircle(radius - prevMirrorHeight, x, y, prevAngle);
        const nextMirror = next !== null ? getPointOnCircle(radius - Math.clamp(next.height / 2, 0, radius / 2), x, y, nextAngle!) : null;

        const shouldFill = fill && (prevMirrorHeight + prev.height >= 1 || mirrorHeight + height >= 1);

        const [ mirrorCurveStart, mirrorCurveEnd ] = getCurveToPoints(prevMirror, currentMirror, nextMirror, smoothness);
        if (shouldFill) {
            canvasContext.lineTo(mirrorCurveEnd.x, mirrorCurveEnd.y);
            canvasContext.closePath();
            canvasContext.fill();

            canvasContext.moveTo(primaryCurveStart.x, primaryCurveStart.y);
            canvasContext.lineTo(mirrorCurveStart.x, mirrorCurveStart.y);
            curveTo(canvasContext, prevMirror, currentMirror, nextMirror, mirrorCurveEnd, smoothness);
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

export default class CircularWaveRenderer extends CircularRenderer<CircularVisualizerType.Wave> {
    getHeight(maxHeight: number): number {
        return maxHeight * (this.options.options.height / 100);
    }

    private getSampleRenderProps(samples: AudioSamplesArray, i: number, visualizerParams: VisualizerParams, args: VisualizerRenderArgs): Tuple<WavePointProps, 2> | null {
        if (i >= samples.length) return null;

        const sample = samples.getSample(i);

        const {
            angularDelta,
            flip,
            rotation,
            height,
            colorRgb,
            colorReaction,
            colorReactionValueProvider,
        } = visualizerParams;

        const angle = this.getSampleAngle(samples.length, i, flip, angularDelta);
        const fillColor = this.computeFillColor(i, args, colorRgb, colorReaction, colorReactionValueProvider);

        return [
            { height: sample[0] * height, angle: rotation - angle[0], color: fillColor[0] },
            { height: sample[1] * height, angle: rotation + angle[1], color: fillColor[1] },
        ];
    }

    renderSamples(args: VisualizerRenderArgs, visualizerParams: VisualizerParams): void {
        if (args.samples === undefined) return;

        const O = this.options.options;
        if (args.isSilent && O.hideWhenSilent) return;

        const N_SAMPLES = args.samples.length;
        const {
            canvasContext,
            flip,
            visualizerAngle,
            x,
            y,
            radius,
        } = visualizerParams;

        let prev: Tuple<WavePointProps, 2> | null = null;
        let first: Tuple<WavePointProps, 2> | null = null;
        let second: Tuple<WavePointProps, 2> | null = null;
        args.samples.forEach((sample, i, samples) => {
            const sampleRenderProps = this.getSampleRenderProps(samples, i, visualizerParams, args);
            if (sampleRenderProps === null) return;

            const current = sampleRenderProps;
            const next = this.getSampleRenderProps(samples, i + 1, visualizerParams, args);

            if (first === null) {
                first = current;
            } else if (second === null) {
                second = current;
            }

            canvasContext.save();

            renderWave(canvasContext, x, y, radius, current[0], O, prev?.[0] ?? null, next?.[0] ?? null);
            renderWave(canvasContext, x, y, radius, current[1], O, prev?.[1] ?? null, next?.[1] ?? null);

            prev = current;

            const q: Array<[ WavePointProps, WavePointProps | null, WavePointProps | null ]> = [];
            switch (flip) {
                case VisualizerFlipType.LeftChannel:
                    if (i === N_SAMPLES - 1) {
                        // Link last L to first R
                        q.push([ current[0], prev![0], first![1] ], [ first![1], current[0], second![1] ]);
                        if (visualizerAngle === 360) {
                            // Link first L to last R to close the circle
                            q.push([ first![0], current[1], second![0] ], [ current[1], prev![1], first![0] ]);
                        }
                    }
                    break;

                case VisualizerFlipType.RightChannel:
                    if (i === N_SAMPLES - 1) {
                        // Link first L to last R
                        q.push([ first![0], second![0], current[1] ], [ current[1], first![0], prev![1] ]);
                        if (visualizerAngle === 360) {
                            // Link last L to first R to close the circle
                            q.push([ current[0], first![1], prev![0] ], [ first![1], second![1], current[0] ]);
                        }
                    }
                    break;

                case VisualizerFlipType.Both:
                    if (i === N_SAMPLES - 1) {
                        // Link last L to last R
                        q.push([ current[0], prev![0], current[1] ], [ current[1], current[0], prev![1] ]);
                    } else if (i === 0 && visualizerAngle === 360) {
                        // Link first L to first R to close the circle
                        q.push([ current[0], current[1], next?.[0] ?? null ], [ current[1], next?.[1] ?? null, current[0] ]);
                    }
                    break;

                case VisualizerFlipType.None:
                    // Link first L to first R  AND
                    // Link last L to last R to close the circle
                    if (i === 0 || (i === N_SAMPLES - 1 && visualizerAngle === 360)) {
                        q.push([ current[0], current[1], next?.[0] ?? null ], [ current[1], current[0], next?.[1] ?? null ]);
                    }
                    break;
                default: break;
            }

            q.forEach(o => {
                renderWave(canvasContext, x, y, radius, o[0], O, o[1], o[2]);
            });

            canvasContext.restore();
        });
    }
}
