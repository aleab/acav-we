import _ from 'lodash';
import React, { useCallback, useContext, useMemo, useReducer, useRef, useState } from 'react';

import { parseCustomCss } from '../../common/Css';
import { calculatePivotTransform } from '../../common/Pivot';
import { ClockType } from '../../app/ClockType';
import WallpaperContext from '../../app/WallpaperContext';
import useUserPropertiesListener from '../../hooks/useUserPropertiesListener';

import AnalogClock from './AnalogClock';
import DigitalClock from './DigitalClock';
import useBassShakeEffect from '../../hooks/useBassShakeEffect';

type ClockStyle = {
    left: number;
    top: number;
    transform: string;
};

interface ClockProps {
    _ref?: React.RefObject<HTMLDivElement>;
}

export default function Clock(props: ClockProps) {
    const RENDER_ID = useMemo(() => `Clock-${(Math.random() * (10 ** 6)).toFixed(6)}`, []);
    const context = useContext(WallpaperContext)!;

    const O = useRef(context.wallpaperProperties.clock);

    const [ clockType, setClockType ] = useState(O.current.type);
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
        if (clockProps.type !== undefined) setClockType(clockProps.type);

        const s: Partial<ClockStyle> = {};
        if (clockProps.left !== undefined) s.left = Math.round(window.innerWidth * (clockProps.left / 100));
        if (clockProps.top !== undefined) s.top = Math.round(window.innerHeight * (clockProps.top / 100));
        if (clockProps.pivot !== undefined) s.transform = calculatePivotTransform(clockProps.pivot).transform;
        setStyle(s);

        if (clockProps.customCss !== undefined) setCustomCss(clockProps.customCss);

        if (clockProps.bassEffect !== undefined) {
            if (clockProps.bassEffect.enabled !== undefined) setBassEffectEnabled(clockProps.bassEffect.enabled);
            if (clockProps.bassEffect.frequency !== undefined) setBassEffectFrequency(clockProps.bassEffect.frequency);
            if (clockProps.bassEffect.smoothing !== undefined) setBassEffectSmoothing(clockProps.bassEffect.smoothing);
        }
    }, []);

    // ========================
    //  AUDIO SAMPLES LISTENER
    // ========================
    const [ _bassRef, bass ] = useBassShakeEffect({
        renderId: RENDER_ID,
        enabled: bassEffectEnabled,
        frequency: bassEffectFrequency,
        smoothing: bassEffectSmoothing,
        context,
    });

    const ClockComponent = useCallback(() => {
        switch (clockType) {
            case ClockType.Digital:
                return <DigitalClock customCss={parsedCustomCss} />;
            case ClockType.Analog:
                return <AnalogClock />;
            default:
                return null;
        }
    }, [ clockType, parsedCustomCss ]);

    return (
      <div ref={props._ref} id="clock" style={{ ...style, transform: `perspective(1px) translateZ(0) ${style.transform} scale(${bassEffectEnabled ? 1 + bass : 1})` }}>
        <ClockComponent />
      </div>
    );
}
