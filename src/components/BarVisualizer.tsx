/* eslint-disable no-multi-spaces */
import _ from 'lodash';
import ColorConvert from 'color-convert';
import { RGB } from 'color-convert/conversions';
import React, { useContext, useEffect, useRef, useState } from 'react';

import Log from '../common/Log';
import WallpaperContext from '../app/WallpaperContext';
import { ResponseType, ResponseTypeArgs, ResponseTypes } from '../app/ColorReactiveMode';
import { ColorReactiveValueProvider, ColorReactiveValueProviders } from '../app/ColorReactiveValueProvider';
import AudioSamplesArray from '../common/AudioSamplesArray';
import AudioSamplesBuffer from '../common/AudioSamplesBuffer';

export default function BarVisualizer() {
    useEffect(() => Log.debug('[BarVisualizer]'));
    const context = useContext(WallpaperContext)!;

    const canvas = useRef<HTMLCanvasElement>(null);
    const [ canvasContext, setCanvasContext ] = useState<CanvasRenderingContext2D>();

    const O = context.wallpaperProperties.barVisualizer;

    // <canvas>
    useEffect(() => {
        canvas.current!.width = window.innerWidth;
        canvas.current!.height = window.innerHeight;
    }, []);
    useEffect(() => {
        const _canvasContext = canvas.current?.getContext('2d', { desynchronized: true });
        setCanvasContext(_canvasContext ?? undefined);
    }, []);

    // onUserPropertiesChanged
    useEffect(() => {
        const userPropertiesChangedCallback = (args: UserPropertiesChangedEventArgs) => {
            if (args.newProps.audioprocessing !== undefined) {
                if (!args.newProps.audioprocessing && canvasContext) {
                    window.requestAnimationFrame(() => {
                        canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
                    });
                }
            }
        };

        context?.wallpaperEvents.onUserPropertiesChanged.subscribe(userPropertiesChangedCallback);
        return () => {
            context?.wallpaperEvents.onUserPropertiesChanged.unsubscribe(userPropertiesChangedCallback);
        };
    }, [ context, canvasContext ]);

    // onAudioSamples
    useEffect(() => {
        let samplesBuffer: AudioSamplesBuffer | undefined;
        let samples: AudioSamplesArray | undefined;
        let peak = 1;

        let prevSamples: AudioSamplesArray | undefined;
        let prevSamplesCount = 0;

        const _reduxSamplesWeightedMean = (_samples: AudioSamplesArray[], _smoothFactor: number): number[] => {
            let totalWeight = 0;
            return _samples.reduce<number[]>((acc, curr, i, arr) => {
                const x = i / (arr.length - 1);
                const w = arr.length > 1
                    ? x < 1 ? (6 ** ((x - 1) / _smoothFactor)) : 1
                    : 1;
                totalWeight += w;

                curr.raw.forEach((v, j) => {
                    acc[j] = (acc[j] ?? 0) + v * w;
                });
                return acc;
            }, []).map(v => v / totalWeight);
        };
        const _lerpSamples = (_samples: AudioSamplesArray, _prevSamples: AudioSamplesArray, _smoothFactor: number): number[] => {
            const _prevRaw = _prevSamples.raw;
            const s = 0.35 * _smoothFactor;
            return _samples.raw.map((v, i) => Math.lerp(_prevRaw[i], v, 1 - s));
        };

        const audioSamplesEventCallback = (args: AudioSamplesEventArgs) => {
            samplesBuffer = args.samplesBuffer;

            if (args.peak > 1) {
                Log.warn('Current peak > 1!', {
                    peak: args.peak,
                    samples: args.samples.raw,
                });
            }

            // Reduce the buffer of arrays to a single array containing the weighted means
            // of the frequency samples for each frequency of both channels: [L R]
            //   L = [f₀ f₁ ... fₙ]
            //   R = [f₀ f₁ ... fₙ]
            //   fᵢ: weighted mean of frequency i samples
            const smoothFactor = O.smoothing / 100;
            const smoothSamples = samplesBuffer.size > 1
                ? _reduxSamplesWeightedMean(samplesBuffer.samples, smoothFactor)
                : prevSamples !== undefined && samplesBuffer.size === 1
                    ? _lerpSamples(args.samples, prevSamples, smoothFactor)
                    : args.samples.raw;

            // If any value is above 1, normalize
            const max = _.max(smoothSamples) ?? 0;
            if (max > 1) {
                smoothSamples.forEach((_v, i) => {
                    smoothSamples[i] /= max;
                });
            }

            peak = _.max(smoothSamples) ?? 0;
            samples = new AudioSamplesArray(smoothSamples, 2);
            if (++prevSamplesCount >= 2) {
                prevSamples = args.samples;
                prevSamplesCount = 0;
            }
        };

        let $animationFrameId = 0;
        const renderCallback = (time: number) => {
            $animationFrameId = window.requestAnimationFrame(renderCallback);
            if (!canvasContext) return;

            canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
            if (!context.wallpaperProperties.audioprocessing) {
                samples?.clear();
            } else if (samples) {
                const N_BARS = samples.length * 2;

                // Snapshot current properties, to render all bars consistently with the same settings
                const width = canvasContext.canvas.width * (O.width / 100);
                const flipFrequencies = O.flipFrequencies;
                const alignment = O.bars.alignment;
                const position = canvasContext.canvas.height * (O.position / 100);
                const barWidth = (width / N_BARS) * (O.bars.width / 100);
                const barHeight = Math.min(
                    (2 / (1 - alignment)) * position,                                   // (1-a)/2: section of the bar below the pivot point
                    (2 / (1 + alignment)) * (canvasContext.canvas.height - position),   // (1+a)/2: section of the bar above the pivot point
                ) * (O.bars.height / 100);

                const barColorRgb: Readonly<RGB> = [ O.bars.color.r, O.bars.color.g, O.bars.color.b ];
                const barResponseType = O.bars.responseType !== ResponseType.None ? (ResponseTypes[O.bars.responseType] ?? undefined) : undefined;
                const barResponseProvider = ColorReactiveValueProviders[O.bars.responseProvider] ?? ColorReactiveValueProviders[ColorReactiveValueProvider.Value];
                const barResponseValueGain = O.bars.responseValueGain;
                const barResponseDegree = O.bars.responseDegree;
                const barResponseTypeArgs: ResponseTypeArgs = {
                    fromRgb: barColorRgb,
                    fromHsv: ColorConvert.rgb.hsv(barColorRgb as RGB),
                    fromHsl: ColorConvert.rgb.hsl(barColorRgb as RGB),
                    toRgb: [ O.bars.responseToHue.r, O.bars.responseToHue.g, O.bars.responseToHue.b ],
                    range: O.bars.responseRange,
                };

                const spacing = (width - N_BARS * barWidth) / (N_BARS - 1);

                if (barResponseType === undefined) {
                    canvasContext.setFillColorRgb(barColorRgb as RGB);
                }
                samples.forEach((sample, i) => {
                    if (sample[0] === 0 && sample[1] === 0) return;
                    if (sample[0] > peak || sample[1] > peak) {
                        Log.warn('A sample is > the current peak!', { sample, peak });
                    } else if (sample[0] > 1 || sample[1] > 1) {
                        Log.warn('A sample is > 1!', sample);
                    }

                    // y = H - p - h∙(1+a)/2
                    const y = [
                        canvasContext.canvas.height - position - 0.5 * (1 + alignment) * (sample[0] * barHeight),
                        canvasContext.canvas.height - position - 0.5 * (1 + alignment) * (sample[1] * barHeight),
                    ];

                    const index = flipFrequencies ? (samples!.length - 1 - i) : i;
                    const dx = spacing / 2 + index * (barWidth + spacing);

                    if (barResponseType !== undefined) {
                        const value = barResponseProvider([ sample[0], sample[1] ], i, barResponseValueGain, { samplesBuffer, peak });

                        if (sample[0] !== 0) {
                            canvasContext.setFillColorRgb(barResponseType(value[0], barResponseDegree, barResponseTypeArgs) as RGB);
                            canvasContext.fillRect(canvasContext.canvas.width / 2 - dx - barWidth, y[0], barWidth, sample[0] * barHeight);
                        }
                        if (sample[1] !== 0) {
                            canvasContext.setFillColorRgb(barResponseType(value[1], barResponseDegree, barResponseTypeArgs) as RGB);
                            canvasContext.fillRect(canvasContext.canvas.width / 2 + dx, y[1], barWidth, sample[1] * barHeight);
                        }
                    } else {
                    canvasContext.setFillColorRgb(barColorRgb as RGB);
                        if (sample[0] !== 0) {
                            canvasContext.fillRect(canvasContext.canvas.width / 2 - dx - barWidth, y[0], barWidth, sample[0] * barHeight);
                        }
                        if (sample[1] !== 0) {
                            canvasContext.fillRect(canvasContext.canvas.width / 2 + dx, y[1], barWidth, sample[1] * barHeight);
                        }
                    }
                });
            }
        };

        $animationFrameId = window.requestAnimationFrame(renderCallback);
        context?.wallpaperEvents.onAudioSamples.subscribe(audioSamplesEventCallback);

        return () => {
            if ($animationFrameId) {
                window.cancelAnimationFrame($animationFrameId);
            }
            context?.wallpaperEvents.onAudioSamples.unsubscribe(audioSamplesEventCallback);
        };
    }, [ context, canvasContext, O ]);

    return (
      <canvas ref={canvas} />
    );
}
