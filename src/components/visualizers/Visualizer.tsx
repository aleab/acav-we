import _ from 'lodash';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';

import Log from '../../common/Log';
import CircularBuffer from '../../common/CircularBuffer';
import AudioSamplesArray from '../../common/AudioSamplesArray';
import { CircularVisualizerType, ThreeDimensionalVisualizerType, VerticalVisualizerType, VisualizerType } from '../../app/VisualizerType';
import WallpaperContext from '../../app/WallpaperContext';
import useUserPropertiesListener from '../../hooks/useUserPropertiesListener';

import VisualizerRenderArgs from './VisualizerRenderArgs';
import VisualizerRenderReturnArgs from './VisualizerRenderReturnArgs';
import getVerticalBarsVisualizerRenderer from './getVerticalBarsVisualizerRenderer';
import getCircularVisualizerRenderer from './getCircularVisualizerRenderer';
import get3dVisualizerRenderer from './get3dVisualizerRenderer';

const Logc = Log.getLogger('Visualizer', 'darkblue');

export default function Visualizer() {
    const RENDER_ID = useMemo(() => `Visualizer-${(Math.random() * (10 ** 6)).toFixed(6)}`, []);
    const context = useContext(WallpaperContext)!;

    const O = useRef(context.wallpaperProperties.visualizer);
    const verticalVisualizerOptions = useRef(context.wallpaperProperties.verticalVisualizer);
    const circularVisualizerOptions = useRef(context.wallpaperProperties.circularVisualizer);
    const threeDVisualizerOptions = useRef(context.wallpaperProperties.threeDVisualizer);

    const [ visualizerType, setVisualizerType ] = useState(O.current.type);

    // =====================
    //  PROPERTIES LISTENER
    // =====================
    useUserPropertiesListener(p => p.visualizer, visualizerProps => {
        if (visualizerProps.type !== undefined) setVisualizerType(visualizerProps.type);
    }, []);

    // ==========
    //  <canvas>
    // ==========
    const canvas = useRef<HTMLCanvasElement>(null);
    const canvas3d = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        Logc.info('Initializing canvas...');
        if (canvas.current !== null) {
            canvas.current!.width = window.innerWidth;
            canvas.current!.height = window.innerHeight;
        }

        if (canvas3d.current !== null) {
            canvas3d.current.width = window.innerWidth;
            canvas3d.current.height = window.innerHeight;
        }
    }, []); // just once

    // =================================
    //  AUDIO SAMPLES LISTENER + RENDER
    // =================================
    const render = useMemo<((timestamp: number, args: VisualizerRenderArgs) => VisualizerRenderReturnArgs | null)>(() => {
        switch (visualizerType) {
            case VisualizerType.VerticalBars:
                return getVerticalBarsVisualizerRenderer(context, canvas, O, verticalVisualizerOptions, VerticalVisualizerType.Bars);
            case VisualizerType.VerticalBlocks:
                return getVerticalBarsVisualizerRenderer(context, canvas, O, verticalVisualizerOptions, VerticalVisualizerType.Blocks);
            case VisualizerType.VerticalWave:
                return getVerticalBarsVisualizerRenderer(context, canvas, O, verticalVisualizerOptions, VerticalVisualizerType.Wave);

            case VisualizerType.CircularBars:
                return getCircularVisualizerRenderer(context, canvas, O, circularVisualizerOptions, CircularVisualizerType.Bars);
            case VisualizerType.CircularBlocks:
                return getCircularVisualizerRenderer(context, canvas, O, circularVisualizerOptions, CircularVisualizerType.Blocks);
            case VisualizerType.CircularWave:
                return getCircularVisualizerRenderer(context, canvas, O, circularVisualizerOptions, CircularVisualizerType.Wave);

            case VisualizerType['3DBars']:
                return get3dVisualizerRenderer(context, canvas3d, O, threeDVisualizerOptions, ThreeDimensionalVisualizerType.Bars);

            default: return (_timestamp: number, _args: VisualizerRenderArgs) => null;
        }
    }, [ context, visualizerType ]);

    useEffect(() => {
        Logc.info('Registering onAudioSamples and render callbacks...');

        // Clear
        //canvas.current?.getContext('2d')?.clearRect(0, 0, canvas.current.width, canvas.current.height);

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

        let samplesBuffer: CircularBuffer<AudioSamplesArray> | undefined;
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
                ? reduxSamplesWeightedMean(samplesBuffer.raw, smoothFactor)
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

            // Queue render job
            const renderArgs = { samplesBuffer, samples, peak };
            context.renderer.queue(RENDER_ID, ts => {
                const visualizerReturnArgs = render(ts, renderArgs);

                context.pluginManager.processAudioData(renderArgs);
                if (canvas.current !== null && visualizerReturnArgs !== null) {
                    context.pluginManager.processVisualizerSamplesData(visualizerReturnArgs, samplesBuffer);
                }
            });
        };
        context?.wallpaperEvents.onAudioSamples.subscribe(audioSamplesEventCallback);

        return () => {
            context?.renderer.cancel(RENDER_ID);
            context?.wallpaperEvents.onAudioSamples.unsubscribe(audioSamplesEventCallback);
        };
    }, [ RENDER_ID, context, render ]);

    const is3d = useMemo(() => visualizerType === VisualizerType['3DBars'], [visualizerType]);
    return (
      <>
        <canvas ref={canvas} style={{ display: is3d ? 'none' : undefined }} />
        <canvas ref={canvas3d} style={{ display: !is3d ? 'none' : undefined }} />
      </>
    );
}
