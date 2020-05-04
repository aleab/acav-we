import _ from 'lodash';
import React, { useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { calculatePivotTransform } from '../../common/Pivot';
import WallpaperContext from '../../app/WallpaperContext';
import useUserPropertiesListener from '../../hooks/useUserPropertiesListener';

import DigitalClock from './DigitalClock';
import { parseCustomCss } from '../../common/Css';

type ClockStyle = {
    left: number;
    top: number;
    transform: string;
};

export default function Clock() {
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
    }, []);

    return (
      <div id="clock" style={{ ...style, transform: `perspective(1px) translateZ(0) ${style.transform}` }}>
        <DigitalClock showSeconds={showSeconds} customCss={parsedCustomCss} />
      </div>
    );
}
