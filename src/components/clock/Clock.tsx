import _ from 'lodash';
import React, { useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { parseCustomCss } from '../../common/Css';
import { calculatePivotTransform } from '../../common/Pivot';
import { getClosestFrequencyIndex } from '../../app/freq-utils';
import WallpaperContext from '../../app/WallpaperContext';
import useUserPropertiesListener from '../../hooks/useUserPropertiesListener';

import DigitalClock from './DigitalClock';

type ClockStyle = {
    left: number;
    top: number;
    transform: string;
};

export default function Clock() {
    const RENDER_ID = useMemo(() => `Clock-${(Math.random() * (10 ** 6)).toFixed(6)}`, []);
    const context = useContext(WallpaperContext)!;

    const O = useRef(context.wallpaperProperties.clock);

    const [ showSeconds, setShowSeconds ] = useState(O.current.showSeconds);
    const [ style, setStyle ] = useReducer((prevStyle: ClockStyle, newStyle: Partial<ClockStyle>) => {
        if (_.isMatch(prevStyle, newStyle)) return prevStyle;
        return _.merge({}, prevStyle, newStyle);
    }, {
        left: Math.round(window.innerWidth * (O.current.left / 100)),
        top: Math.round(window.innerHeight * (O.current.top / 100)),
        transform: calculatePivotTransform(O.current.pivot).transform,
    });

    const [ customCss, setCustomCss ] = useState(O.current.customCss);
    const parsedCustomCss = useMemo(() => parseCustomCss(customCss), [customCss]);

    const [ bassEffectEnabled, setBassEffectEnabled ] = useState(O.current.bassEffect.enabled);
    const [ bassEffectFrequency, setBassEffectFrequency ] = useState(O.current.bassEffect.frequency);
    const [ bassEffectSmoothing, setBassEffectSmoothing ] = useState(O.current.bassEffect.smoothing);

    // =====================
    //  PROPERTIES LISTENER
    // =====================
    useUserPropertiesListener(p => p.clock, clockProps => {
        const s: Partial<ClockStyle> = {};
        if (clockProps.left !== undefined) s.left = Math.round(window.innerWidth * (clockProps.left / 100));
        if (clockProps.top !== undefined) s.top = Math.round(window.innerHeight * (clockProps.top / 100));
        if (clockProps.pivot !== undefined) s.transform = calculatePivotTransform(clockProps.pivot).transform;
        setStyle(s);

        if (clockProps.customCss !== undefined) setCustomCss(clockProps.customCss);
        if (clockProps.showSeconds !== undefined) setShowSeconds(clockProps.showSeconds);

        if (clockProps.bassEffect !== undefined) {
            if (clockProps.bassEffect.enabled !== undefined) setBassEffectEnabled(clockProps.bassEffect.enabled);
            if (clockProps.bassEffect.frequency !== undefined) setBassEffectFrequency(clockProps.bassEffect.frequency);
            if (clockProps.bassEffect.smoothing !== undefined) setBassEffectSmoothing(clockProps.bassEffect.smoothing);
        }
    }, []);

    // ========================
    //  AUDIO SAMPLES LISTENER
    // ========================
    const [ bass, setBass ] = useState(0);
    useEffect(() => {
        if (!bassEffectEnabled) return () => {};

        const audioSamplesEventCallback = (args: AudioSamplesEventArgs) => {
            const bassIndex = getClosestFrequencyIndex(bassEffectFrequency);

            const currSample = args.samples.slice(0, bassIndex + 1).raw;
            const currentMean = _.mean(currSample);
            const smoothedPrevMean = args.samplesBuffer.raw.reduce((avg, samples, i, rawArray) => {
                return avg + _.mean(samples.slice(0, bassIndex + 1).raw) / rawArray.length;
            }, 0);

            context?.renderer.queue(RENDER_ID, () => {
                setBass(Math.lerp(smoothedPrevMean, currentMean, Math.clamp(1 - bassEffectSmoothing / 100, 0, 1)));
            });
        };
        context?.wallpaperEvents.onAudioSamples.subscribe(audioSamplesEventCallback);

        return () => {
            context?.renderer.cancel(RENDER_ID);
            context?.wallpaperEvents.onAudioSamples.unsubscribe(audioSamplesEventCallback);
        };
    }, [ RENDER_ID, bassEffectEnabled, bassEffectFrequency, bassEffectSmoothing, context ]);

    return (
      <div id="clock" style={{ ...style, transform: `perspective(1px) translateZ(0) ${style.transform} scale(${bassEffectEnabled ? 1 + bass : 1})` }}>
        <DigitalClock showSeconds={showSeconds} customCss={parsedCustomCss} />
      </div>
    );
}
