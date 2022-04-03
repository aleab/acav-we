import _ from 'lodash';
import { useEffect, useRef, useState } from 'react';

import { getClosestFrequencyIndex } from '../app/freq-utils';
import { WallpaperContextType } from '../app/WallpaperContext';

export interface UseBassShakeEffectOptions {
    renderId: string;
    enabled: boolean;
    frequency: number;
    smoothing: number;
    context: WallpaperContextType;
}

function calcBassShakeEffect(args: AudioSamplesEventArgs, frequency: number, smoothing: number) {
    const bassIndex = getClosestFrequencyIndex(frequency);

    const currSample = args.samples.slice(0, bassIndex + 1).raw;
    const currentMean = _.mean(currSample);
    const smoothedPrevMean = args.samplesBuffer.reduce((avg, samples, i, rawArray) => {
        return avg + _.mean(samples.slice(0, bassIndex + 1).raw) / rawArray.length;
    }, 0);

    return Math.lerp(smoothedPrevMean, currentMean, Math.clamp(1 - smoothing / 100, 0, 1));
}

export default function useBassShakeEffect(options: UseBassShakeEffectOptions): [React.MutableRefObject<number>, number] {
    const RENDER_ID = options.renderId;
    const enabled = options.enabled;
    const frequency = options.frequency;
    const smoothing = options.smoothing;
    const context = options.context;

    const [ bass, setBass ] = useState(0);
    const bassRef = useRef(0);
    useEffect(() => {
        if (!enabled) return () => {};

        const audioSamplesEventCallback = (args: AudioSamplesEventArgs) => {
            context?.renderer.queue(RENDER_ID, () => {
                bassRef.current = calcBassShakeEffect(args, frequency, smoothing);
                setBass(bassRef.current);
            });
        };
        context?.wallpaperEvents.onAudioSamples.subscribe(audioSamplesEventCallback);

        return () => {
            context?.renderer.cancel(RENDER_ID);
            context?.wallpaperEvents.onAudioSamples.unsubscribe(audioSamplesEventCallback);
            bassRef.current = 0;
            setBass(0);
        };
    }, [ RENDER_ID, context?.renderer, context?.wallpaperEvents.onAudioSamples, enabled, frequency, smoothing ]);

    return [ bassRef, bass ];
}
