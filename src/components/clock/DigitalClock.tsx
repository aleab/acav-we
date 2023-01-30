/* eslint-disable react/no-danger */
import _ from 'lodash';
import ColorConvert from 'color-convert';
import { RGB } from 'color-convert/conversions';
import React, { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { ClockFontFamily } from '../../app/ClockFontFamily';
import WallpaperContext from '../../app/WallpaperContext';
import useComplexStateMerging from '../../hooks/useComplexStateMerging';
import useLocalFontFile from '../../hooks/useLocalFontFile';
import useUserPropertiesListener from '../../hooks/useUserPropertiesListener';

type DigitalClockStyle = {
    fontFamily: string;
    fontSize: number;
    color: string;
};

type DigitalClockBorderStyle = {
    borderWidth: number;
    borderStyle: string;
    borderColor: string;
    paddingTop: number;
    paddingBottom: number;
    paddingLeft: number;
    paddingRight: number;
};

interface DigitalClockProps {
    customCss: { [key: string]: string; };
}

const FontMimeTypes = {
    get TTF() { return 'application/x-font-truetype'; },
    get OTF() { return 'application/x-font-opentype'; },
    get EOT() { return 'application/vnd.ms-fontobject'; },
    get WOFF() { return 'application/font-woff'; },
    get WOFF2() { return 'application/font-woff2'; },
};

function toHex(n: number) {
    return `0${n.toString(16)}`.slice(-2).toUpperCase();
}

const LOCALSTORAGE_FONT = 'aleab.acav.clock_digital.font';

export default function DigitalClock(props: DigitalClockProps) {
    const context = useContext(WallpaperContext)!;
    const O = useRef(context.wallpaperProperties.clock.digital);

    const [ showSeconds, setShowSeconds ] = useState(O.current.showSeconds);
    const [ is24h, setIs24h ] = useState(O.current.is24h);
    const [ locale, setLocale ] = useState(O.current.locale);
    const [ style, setStyle ] = useReducer((prevStyle: DigitalClockStyle, newStyle: Partial<DigitalClockStyle>) => {
        if (_.isMatch(prevStyle, newStyle)) return prevStyle;
        return _.merge({}, prevStyle, newStyle);
    }, {
        fontFamily: O.current.font,
        fontSize: O.current.fontSize,
        color: `#${ColorConvert.rgb.hex(O.current.textColor as RGB)}`,
    });
    const [ showBorder, setShowBorder ] = useState(O.current.border.enabled);
    const [ borderStyle, setBorderStyle ] = useComplexStateMerging<DigitalClockBorderStyle>({
        borderWidth: O.current.border.thickness,
        borderStyle: O.current.border.style,
        borderColor: `#${ColorConvert.rgb.hex(O.current.border.color as RGB)}`,
        paddingTop: O.current.border.paddingVertical,
        paddingBottom: O.current.border.paddingVertical,
        paddingLeft: O.current.border.paddingHorizontal,
        paddingRight: O.current.border.paddingHorizontal,
    });

    const [ now, setNow ] = useState(new Date());
    const [ loaded, setLoaded ] = useState(false);

    // NOTE: Compatibility with older versions
    useEffect(() => {
        const value = window.localStorage.getItem('aleab.acav.clock.font');
        window.localStorage.removeItem('aleab.acav.clock.font');
        if (value && value.startsWith('data:')) {
            window.localStorage.setItem(LOCALSTORAGE_FONT, value);
        }
    }, []);

    const _shouldUseLocalFontFile = O.current.font === ClockFontFamily.LocalFont;
    const _onLoaded = useCallback(() => setLoaded(true), []);
    const _onLocalFontSet = useCallback(() => setStyle({ fontFamily: ClockFontFamily.LocalFont }), []);
    const _onLocalFontUnset = useCallback(() => setStyle({ fontFamily: 'inherit' }), []);
    const [ showBrowseFontButton, setShowBrowseFontButton, localFontBlobUrl, onLocalFontChange ] = useLocalFontFile(_shouldUseLocalFontFile, LOCALSTORAGE_FONT, _onLoaded, _onLocalFontSet, _onLocalFontUnset);

    // =====================
    //  PROPERTIES LISTENER
    // =====================
    useUserPropertiesListener(p => p.clock?.digital, digitalProps => {
        {
            const s: Partial<DigitalClockStyle> = {};
            if (digitalProps.font !== undefined) {
                s.fontFamily = digitalProps.font === ClockFontFamily.LocalFont ? 'inherit' : digitalProps.font;
                setShowBrowseFontButton(digitalProps.font === ClockFontFamily.LocalFont);
            }
            if (digitalProps.fontSize !== undefined) s.fontSize = digitalProps.fontSize;
            if (digitalProps.textColor !== undefined) s.color = `#${ColorConvert.rgb.hex(digitalProps.textColor as RGB)}`;
            setStyle(s);
        }

        if (digitalProps.border) {
            if (digitalProps.border.enabled !== undefined) setShowBorder(digitalProps.border.enabled);
            const s: Partial<DigitalClockBorderStyle> = {};
            if (digitalProps.border.thickness !== undefined) s.borderWidth = digitalProps.border.thickness;
            if (digitalProps.border.style !== undefined) s.borderStyle = digitalProps.border.style;
            if (digitalProps.border.color !== undefined) s.borderColor = `#${ColorConvert.rgb.hex(digitalProps.border.color as RGB)}`;
            if (digitalProps.border.paddingVertical !== undefined) {
                s.paddingTop = digitalProps.border.paddingVertical;
                s.paddingBottom = digitalProps.border.paddingVertical;
            }
            if (digitalProps.border.paddingHorizontal !== undefined) {
                s.paddingLeft = digitalProps.border.paddingHorizontal;
                s.paddingRight = digitalProps.border.paddingHorizontal;
            }
            setBorderStyle(s);
        }

        if (digitalProps.locale !== undefined) setLocale(digitalProps.locale);
        if (digitalProps.showSeconds !== undefined) setShowSeconds(digitalProps.showSeconds);
        if (digitalProps.is24h !== undefined) setIs24h(digitalProps.is24h);
    }, []);

    useEffect(() => {
        const intervalId = setInterval((() => setNow(new Date())) as TimerHandler, 1000);
        return () => clearInterval(intervalId);
    }, []);

    const time = useMemo(() => {
        const opts: Intl.DateTimeFormatOptions = {
            hour: '2-digit',
            minute: '2-digit',
            second: showSeconds ? '2-digit' : undefined,
            hourCycle: is24h ? 'h23' : 'h11',
            hour12: locale?.toLowerCase()?.includes('hc-h12') ? true : undefined,
        };

        try {
            return now.toLocaleTimeString(locale || [], opts).toUpperCase();
        } catch {
            return now.toLocaleTimeString([], opts).toUpperCase();
        }
    }, [ is24h, locale, now, showSeconds ]);

    return loaded ? (
      <>
        {showBrowseFontButton ? <input id="browseFont" type="file" style={{ color: style.color }} accept=".ttf, .otf, .eot, .woff, .woff2" onChange={onLocalFontChange} /> : null}
        {localFontBlobUrl !== null ? <style dangerouslySetInnerHTML={{ __html: `@font-face { font-family: "LocalFont"; src: url(${localFontBlobUrl}); }` }} /> : null}
        <div className="digital" style={{ ...style, ...(showBorder ? borderStyle : {}), ...props.customCss }}>
          {time}
        </div>
      </>
    ) : null;
}
