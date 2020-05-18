/* eslint-disable react/no-danger */
import _ from 'lodash';
import ColorConvert from 'color-convert';
import { RGB } from 'color-convert/conversions';
import React, { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import WallpaperContext from '../../app/WallpaperContext';
import useUserPropertiesListener from '../../hooks/useUserPropertiesListener';
import { ClockFontFamily } from '../../app/ClockFontFamily';

type DigitalClockStyle = {
    fontFamily: string;
    fontSize: number;
    color: string;
};

interface DigitalClockProps {
    showSeconds: boolean;
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

function getMimeType(byteArray: ArrayBuffer) {
    let header = '';
    let headerArray = new Uint8Array(byteArray).subarray(0, 4);
    headerArray.forEach(v => { header += toHex(v); });

    let mimeType = null;
    switch (header) {
        case '00000000':
            // This may be EOT; we need the following 30 bytes to be sure.
            header = '';
            headerArray = (new Uint8Array(byteArray)).subarray(0, 34);
            headerArray.forEach(v => { header += toHex(v); });
            if (header.endsWith('4C50')) { mimeType = FontMimeTypes.EOT; }
            break;
        case '00010000': mimeType = FontMimeTypes.TTF; break;
        case '4F54544F': mimeType = FontMimeTypes.OTF; break;
        case '774F4646': mimeType = FontMimeTypes.WOFF; break;
        case '774F4632': mimeType = FontMimeTypes.WOFF2; break;
        default: break;
    }

    return mimeType;
}

function setCachedLocalClockFont(dataUrl: string | null) {
    if (dataUrl === null) {
        window.localStorage.removeItem('aleab.acav.clock.font');
    } else {
        window.localStorage.setItem('aleab.acav.clock.font', dataUrl);
    }
}

async function getCachedLocalClockFont() {
    const dataUrl = localStorage.getItem('aleab.acav.clock.font');
    return dataUrl !== null && dataUrl.startsWith('data:') ? fetch(dataUrl).then(res => res.blob()) : null;
}

export default function DigitalClock(props: DigitalClockProps) {
    const context = useContext(WallpaperContext)!;
    const O = useRef(context.wallpaperProperties.clock.digital);

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

    const [ now, setNow ] = useState(new Date());

    const [ showBrowseFontButton, setShowBrowseFontButton ] = useState(false);
    const [ localFontBlobUrl, setLocalFontBlobUrl ] = useState<string | null>(null);

    const [ loaded, setLoaded ] = useState(false);

    // =====================
    //  PROPERTIES LISTENER
    // =====================
    useUserPropertiesListener(p => p.clock?.digital, digitalProps => {
        const s: Partial<DigitalClockStyle> = {};
        if (digitalProps.font !== undefined) {
            s.fontFamily = digitalProps.font === ClockFontFamily.LocalFont ? 'inherit' : digitalProps.font;
            setShowBrowseFontButton(digitalProps.font === ClockFontFamily.LocalFont);
        }
        if (digitalProps.fontSize !== undefined) s.fontSize = digitalProps.fontSize;
        if (digitalProps.textColor !== undefined) s.color = `#${ColorConvert.rgb.hex(digitalProps.textColor as RGB)}`;
        setStyle(s);

        if (digitalProps.locale !== undefined) setLocale(digitalProps.locale);
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
            second: props.showSeconds ? '2-digit' : undefined,
            hour12: !locale ? !is24h : locale.toLowerCase().includes('hc-h12'),
        };

        try {
            return now.toLocaleTimeString(locale || [], opts).toUpperCase();
        } catch {
            return now.toLocaleTimeString([], opts).toUpperCase();
        }
    }, [ is24h, locale, now, props.showSeconds ]);

    useEffect(() => {
        if (O.current.font === ClockFontFamily.LocalFont) {
            getCachedLocalClockFont().then(blob => {
                const blobUrl = blob !== null ? URL.createObjectURL(blob) : null;
                setLocalFontBlobUrl(blobUrl);

                if (blobUrl === null) {
                    setShowBrowseFontButton(true);
                    setStyle({ fontFamily: 'inherit' });
                } else {
                    setShowBrowseFontButton(false);
                    setStyle({ fontFamily: ClockFontFamily.LocalFont });
                }
                setLoaded(true);
            });
        } else {
            setLoaded(true);
        }
    }, []);

    const onLocalFontChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file !== undefined) {
            const fileReader = new FileReader();
            fileReader.onload = ev => {
                const result = ev.target?.result as ArrayBuffer | null | undefined;
                if (result !== null && result !== undefined) {
                    const mimeType = getMimeType(result) || file.type;
                    if (Object.getOwnPropertyNames(FontMimeTypes).some(v => (FontMimeTypes as any)[v] === mimeType)) {
                        const base64 = window.btoa(new Uint8Array(result).reduce((b64, byte) => b64 + String.fromCharCode(byte), ''));
                        const data = `data:${mimeType};base64,${base64}`;
                        setCachedLocalClockFont(`data:${mimeType};base64,${base64}`);

                        fetch(data).then(res => res.blob()).then(blob => {
                            setLocalFontBlobUrl(URL.createObjectURL(blob));
                            setShowBrowseFontButton(false);
                            setStyle({ fontFamily: ClockFontFamily.LocalFont });
                        });
                    } else {
                        // Invalid font file
                        setShowBrowseFontButton(false);
                        setStyle({ fontFamily: 'inherit' });
                    }
                } else {
                    // ???
                    setShowBrowseFontButton(false);
                    setStyle({ fontFamily: 'inherit' });
                }
            };
            fileReader.readAsArrayBuffer(file);
        } else {
            setCachedLocalClockFont(null);
            setLocalFontBlobUrl(null);
            setShowBrowseFontButton(false);
            setStyle({ fontFamily: 'inherit' });
        }
    }, []);

    return loaded ? (
      <>
        {showBrowseFontButton ? <input id="browseFont" type="file" style={{ color: style.color }} accept=".ttf, .otf, .eot, .woff, .woff2" onChange={onLocalFontChange} /> : null}
        {localFontBlobUrl !== null ? <style dangerouslySetInnerHTML={{ __html: `@font-face { font-family: "LocalFont"; src: url(${localFontBlobUrl}); }` }} /> : null}
        <div className="digital" style={{ ...style, ...props.customCss }}>
          {time}
        </div>
      </>
    ) : null;
}
