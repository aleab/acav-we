/* eslint-disable no-multi-spaces */
import _ from 'lodash';
import { RGB } from 'color-convert/conversions';
import React, { useContext, useEffect, useRef, useState } from 'react';

import Log from '../common/Log';
import AudioSamplesArray from '../common/AudioSamplesArray';
import AudioSamplesBuffer from '../common/AudioSamplesBuffer';
import { AudioResponsiveValueProviderFactory } from '../app/AudioResponsiveValueProvider';
import { ColorReactionFactory, ColorReactionType } from '../app/ColorReactionType';
import WallpaperContext from '../app/WallpaperContext';

const Logc = Log.getLogger('BarVisualizer', 'darkblue');

export default function BarVisualizer() {
    const context = useContext(WallpaperContext)!;
    const O = useRef(context.wallpaperProperties.barVisualizer);

    const canvas = useRef<HTMLCanvasElement>(null);
    const [ canvasContext, setCanvasContext ] = useState<CanvasRenderingContext2D>();

    // ==========
    //  <canvas>
    // ==========
    useEffect(() => {
        Logc.debug('Initializing canvas...');
        canvas.current!.width = window.innerWidth;
        canvas.current!.height = window.innerHeight;
        const _canvasContext = canvas.current?.getContext('2d', { desynchronized: true });
        setCanvasContext(_canvasContext ?? undefined);
    }, []); // just once

    // =====================
    //  PROPERTIES LISTENER
    // =====================
    useEffect(() => {
        Logc.debug('Registering on*PropertiesChanged callbacks...');
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

    // ========================
    //  AUDIO SAMPLES LISTENER
    // ========================
    useEffect(() => {
        Logc.debug('Registering onAudioSamples and render callbacks...');

        const reduxSamplesWeightedMean = (_samples: AudioSamplesArray[], _smoothFactor: number): number[] => {
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
        const lerpSamples = (_samples: AudioSamplesArray, _prevSamples: AudioSamplesArray, _smoothFactor: number): number[] => {
            const _prevRaw = _prevSamples.raw;
            const s = 0.35 * _smoothFactor;
            return _samples.raw.map((v, i) => Math.lerp(_prevRaw[i], v, 1 - s));
        };

        let samplesBuffer: AudioSamplesBuffer | undefined;
        let samples: AudioSamplesArray | undefined;
        let peak = 1;

        let prevSamples: AudioSamplesArray | undefined;
        let prevSamplesCount = 0;

        // Audio samples callback
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
            const smoothFactor = O.current.smoothing / 100;
            const smoothSamples = samplesBuffer.size > 1
                ? reduxSamplesWeightedMean(samplesBuffer.samples, smoothFactor)
                : prevSamples !== undefined && samplesBuffer.size === 1
                    ? lerpSamples(args.samples, prevSamples, smoothFactor)
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
        context?.wallpaperEvents.onAudioSamples.subscribe(audioSamplesEventCallback);

        // Render frame callback
        let requestAnimationFrameId = 0;
        const frameRequestCallback = (time: number) => {
            requestAnimationFrameId = window.requestAnimationFrame(frameRequestCallback);
            if (!canvasContext) return;

            canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
            if (!context.wallpaperProperties.audioprocessing) {
                samples?.clear();
            } else if (samples) {
                const N_BARS = samples.length * 2;

                // Snapshot current properties, to render all bars consistently with the same settings
                const width = canvasContext.canvas.width * (O.current.width / 100);
                const flipFrequencies = O.current.flipFrequencies;
                const alignment = O.current.bars.alignment;
                const position = canvasContext.canvas.height * (O.current.position / 100);
                const barWidth = (width / N_BARS) * (O.current.bars.width / 100);
                const barHeight = Math.min(
                    (2 / (1 - alignment)) * position,                                   // (1-a)/2: section of the bar below the pivot point
                    (2 / (1 + alignment)) * (canvasContext.canvas.height - position),   // (1+a)/2: section of the bar above the pivot point
                ) * (O.current.bars.height / 100);

                const barColorRgb: Readonly<RGB> = [ O.current.bars.color[0], O.current.bars.color[1], O.current.bars.color[2] ];
                const barColorReaction = O.current.bars.responseType !== ColorReactionType.None
                    ? ColorReactionFactory.buildColorReaction(O.current.bars.responseType, {
                        fromRgb: barColorRgb,
                        toRgb: [ O.current.bars.responseToHue[0], O.current.bars.responseToHue[1], O.current.bars.responseToHue[2] ],
                        degree: O.current.bars.responseDegree,
                        range: O.current.bars.responseRange,
                    }) : undefined;
                const barColorReactionValueProvider = AudioResponsiveValueProviderFactory.buildAudioResponsiveValueProvider(O.current.bars.responseProvider, O.current.bars.responseValueGain);

                const spacing = (width - N_BARS * barWidth) / (N_BARS - 1);

                if (barColorReaction === undefined) {
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

                    if (barColorReaction !== undefined) {
                        const value = barColorReactionValueProvider([ sample[0], sample[1] ], i, { samplesBuffer, peak });

                        if (sample[0] !== 0) {
                            canvasContext.setFillColorRgb(barColorReaction(value[0]) as RGB);
                            canvasContext.fillRect(canvasContext.canvas.width / 2 - dx - barWidth, y[0], barWidth, sample[0] * barHeight);
                        }
                        if (sample[1] !== 0) {
                            canvasContext.setFillColorRgb(barColorReaction(value[1]) as RGB);
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
        requestAnimationFrameId = window.requestAnimationFrame(frameRequestCallback);

        return () => {
            window.cancelAnimationFrame(requestAnimationFrameId);
            context?.wallpaperEvents.onAudioSamples.unsubscribe(audioSamplesEventCallback);
        };
    }, [ context, canvasContext ]);

    return (
      <canvas ref={canvas} />
    );
}
