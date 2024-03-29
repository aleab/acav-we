import _ from 'lodash';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';

import Log from '../../common/Log';
import AudioSamplesArray from '../../common/AudioSamplesArray';
import { CircularVisualizerType, ThreeDimensionalVisualizerType, VerticalVisualizerType, VisualizerType } from '../../app/VisualizerType';
import WallpaperContext from '../../app/WallpaperContext';
import useBassShakeEffect from '../../hooks/useBassShakeEffect';
import useUserPropertiesListener from '../../hooks/useUserPropertiesListener';

import { IVisualizerRenderer, NullRenderer } from './VisualizerBaseRenderer';
import getVerticalBarsVisualizerRenderer from './getVerticalBarsVisualizerRenderer';
import getCircularVisualizerRenderer from './getCircularVisualizerRenderer';
import get3dVisualizerRenderer from './get3dVisualizerRenderer';

const Logc = Log.getLogger('Visualizer', 'darkblue');

interface VisualizerProps {
    onRendered?: (e: [PerformanceEventArgs, PerformanceEventArgs, PerformanceEventArgs]) => void;
}

export default function Visualizer(props: VisualizerProps) {
    const RENDER_ID = useMemo(() => `Visualizer-${(Math.random() * (10 ** 6)).toFixed(6)}`, []);
    const context = useContext(WallpaperContext)!;

    const O = useRef(context.wallpaperProperties.visualizer);
    const audioSamplesOptions = useRef(context.wallpaperProperties.audioSamples);
    const verticalVisualizerOptions = useRef(context.wallpaperProperties.verticalVisualizer);
    const circularVisualizerOptions = useRef(context.wallpaperProperties.circularVisualizer);
    const threeDVisualizerOptions = useRef(context.wallpaperProperties.threeDVisualizer);

    const [ visualizerType, setVisualizerType ] = useState(O.current.type);
    const [ bassEffectEnabled, setBassEffectEnabled ] = useState(O.current.bassEffect.enabled);
    const [ bassEffectFrequency, setBassEffectFrequency ] = useState(O.current.bassEffect.frequency);
    const [ bassEffectSmoothing, setBassEffectSmoothing ] = useState(O.current.bassEffect.smoothing);

    const onRendered = useMemo(() => props.onRendered, [props.onRendered]);
    const onRenderedCallback = useRef((e: [PerformanceEventArgs, PerformanceEventArgs, PerformanceEventArgs]) => { if (onRendered) onRendered(e); });
    useEffect(() => {
        onRenderedCallback.current = (e: [PerformanceEventArgs, PerformanceEventArgs, PerformanceEventArgs]) => { if (onRendered) onRendered(e); };
    }, [onRendered]);

    // =====================
    //  PROPERTIES LISTENER
    // =====================
    useUserPropertiesListener(p => p.visualizer, visualizerProps => {
        if (visualizerProps.type !== undefined) setVisualizerType(visualizerProps.type);

        if (visualizerProps.bassEffect !== undefined) {
            if (visualizerProps.bassEffect.enabled !== undefined) setBassEffectEnabled(visualizerProps.bassEffect.enabled);
            if (visualizerProps.bassEffect.frequency !== undefined) setBassEffectFrequency(visualizerProps.bassEffect.frequency);
            if (visualizerProps.bassEffect.smoothing !== undefined) setBassEffectSmoothing(visualizerProps.bassEffect.smoothing);
        }
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

    // ===================
    //  BASS SHAKE EFFECT
    // ===================
    const [ bassRef, _bass ] = useBassShakeEffect({
        renderId: RENDER_ID,
        enabled: bassEffectEnabled,
        frequency: bassEffectFrequency,
        smoothing: bassEffectSmoothing,
        context,
    });

    // =================================
    //  AUDIO SAMPLES LISTENER + RENDER
    // =================================
    const visualizerRenderer = useMemo<IVisualizerRenderer>(() => {
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

            default: return NullRenderer;
        }
    }, [ context, visualizerType ]);

    useEffect(() => {
        Logc.info('Registering onAudioSamples and render callbacks...');

        const weightFn = (n: number, k: number) => (n < 1 ? (6 ** ((n - 1) / k)) : 1);
        const reduceSamplesBufferToArrayOfWeightedMeans = (_samples: AudioSamplesArray[], _smoothFactor: number): number[] => {
            let totalWeight = 0;
            return _samples.reduce<number[]>((acc, curr, i, arr) => {
                const x = i / (arr.length - 1);
                const w = arr.length > 1 ? weightFn(x, _smoothFactor) : 1;
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

        let samplesBuffer: AudioSamplesArray[] | undefined;
        let samples: AudioSamplesArray | undefined;
        let peak = 1;

        // Audio samples callback
        const audioSamplesEventCallback = (e: AudioSamplesEventArgs) => {
            samplesBuffer = e.samplesBuffer;

            if (e.peak > 1) {
                Log.warn('Current peak > 1!', {
                    peak: e.peak,
                    samples: e.samples.raw,
                });
            }

            // Reduce the buffer of arrays to a single array containing the weighted means
            // of the frequency samples for each frequency of both channels: [L R]
            //   L = [f₀ f₁ ... fₙ]
            //   R = [f₀ f₁ ... fₙ]
            //   fᵢ: weighted mean of frequency i samples
            const smoothFactor = audioSamplesOptions.current.temporalSmoothingFactor;                       // TEMPORAL SMOOTHING
            const smoothSamples = samplesBuffer.length > 1
                ? reduceSamplesBufferToArrayOfWeightedMeans(samplesBuffer.concat(e.samples), smoothFactor)
                : samplesBuffer.length === 1
                    ? lerpSamples(e.samples, samplesBuffer[0], smoothFactor)
                    : e.samples.raw;

            // If any value is above 1, normalize
            const max = _.max(smoothSamples) ?? 0;
            if (max > 1) {
                smoothSamples.forEach((_v, i) => { smoothSamples[i] /= max; });
            }

            // Find peak and whether there is any non-null sample
            peak = 0;
            let isSilent = true;
            smoothSamples.forEach(v => {
                peak = v > peak ? v : peak;
                isSilent = isSilent && v <= 0;
            });

            samples = new AudioSamplesArray(smoothSamples, 2);
            samples.smooth(audioSamplesOptions.current.spatialSmoothingFactor);                             // SPATIAL SMOOTHING

            // render job
            const renderArgs = { samplesBuffer, samples, peak, isSilent, bass: bassRef.current, bassEffectIntensity: O.current.bassEffect.intensity };
            const t0 = performance.now();
            const visualizerReturnArgs = visualizerRenderer.render(e.eventTimestamp, renderArgs);
            const t1 = performance.now();
            context.pluginManager.processAudioData(e.eventTimestamp, renderArgs);
            if (canvas.current !== null && visualizerReturnArgs !== null) {
                context.pluginManager.processVisualizerSamplesData(e.eventTimestamp, visualizerReturnArgs, samplesBuffer);
            }
            const t2 = performance.now();

            onRenderedCallback.current([
                { timestamp: t2, time: t0 - e.eventTimestamp },
                { timestamp: t2, time: t1 - t0 },
                { timestamp: t2, time: t2 - t1 },
            ]);
        };
        context?.wallpaperEvents.onAudioSamples.subscribe(audioSamplesEventCallback);

        return () => {
            context?.wallpaperEvents.onAudioSamples.unsubscribe(audioSamplesEventCallback);
            visualizerRenderer.clear();
        };
    }, [ bassRef, context.pluginManager, context?.wallpaperEvents.onAudioSamples, visualizerRenderer ]);

    const is3d = useMemo(() => visualizerType === VisualizerType['3DBars'], [visualizerType]);
    return (
      <>
        <canvas id="2dCanvas" ref={canvas} style={{ display: is3d ? 'none' : undefined }} />
        <canvas id="3dCanvas" ref={canvas3d} style={{ display: !is3d ? 'none' : undefined }} />
      </>
    );
}
