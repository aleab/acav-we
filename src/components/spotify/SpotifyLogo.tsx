import _ from 'lodash';
import React, { useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';

import SpotifyUtils from '../../app/spotify-utils';
import Bounds from '../../common/Bounds';
import { CancellationTokenSource } from '../../common/CancellationToken';
import { getComputedBackgroundProperties } from '../../common/Css';
import SpotifyOverlayContext from './SpotifyOverlayContext';

type ComputedBackgroundProperties = ReturnType<typeof getComputedBackgroundProperties>;
type Color = typeof SpotifyUtils.SPOTIFY_LIGHT_GREEN;

interface SpotifyLogoProps {
    preferMonochrome: boolean;
    src: string;
    height: number;
    style?: React.CSSProperties;
}

function ColorMatrixFilter(props: { color: Readonly<Color> }) {
    const r = props.color.rgb[0] / 255;
    const g = props.color.rgb[1] / 255;
    const b = props.color.rgb[2] / 255;

    return (
      <svg height="0px" width="0px" style={{ display: 'none' }}>
        <defs>
          <filter id="filter-spotify" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={`0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 1 0`} />
          </filter>
        </defs>
      </svg>
    );
}

export default function SpotifyLogo(props: SpotifyLogoProps) {
    const context = useContext(SpotifyOverlayContext)!;

    const selfRef = useRef<HTMLImageElement>(null);
    const [ logoColor, setLogoColor ] = useReducer((prevColor: Color, newColor: Color) => {
        if (prevColor.hex === newColor.hex) return prevColor;
        return newColor;
    }, SpotifyUtils.SPOTIFY_LIGHT_GREEN);

    const html2canvasCache = SpotifyUtils.useHtml2canvasCache(new Bounds(0, 0, window.innerWidth, window.innerHeight));

    const computedBackgroundPropertiesReducer = useCallback((prevProps: ComputedBackgroundProperties, newProps: ComputedBackgroundProperties) => {
        if (prevProps !== null && newProps !== null && _.isMatch(prevProps, newProps)) return prevProps;
        return newProps;
    }, []);
    const [ overlayBackgroundProperties, setOverlayBackgroundProperties ] = useReducer(computedBackgroundPropertiesReducer, getComputedBackgroundProperties(context.overlayHtmlRef.current));
    const [ wallpaperBackgroundProperties, setWallpaperBackgroundProperties ] = useReducer(computedBackgroundPropertiesReducer, getComputedBackgroundProperties(context.backgroundHtmlRef.current));

    const cts = useRef(new CancellationTokenSource());
    useEffect(() => {
        SpotifyUtils.chooseAppropriateSpotifyColor(
            html2canvasCache,
            [ context.backgroundHtmlRef, context.overlayHtmlRef ],
            [ wallpaperBackgroundProperties, overlayBackgroundProperties ],
            selfRef,
            props.preferMonochrome,
            cts,
            color => setLogoColor(color),
        );
    }, [ context.backgroundHtmlRef, context.overlayHtmlRef, html2canvasCache, overlayBackgroundProperties, props.preferMonochrome, wallpaperBackgroundProperties ]);

    useEffect(() => {
        setOverlayBackgroundProperties(getComputedBackgroundProperties(context.overlayHtmlRef.current));
        setWallpaperBackgroundProperties(getComputedBackgroundProperties(context.backgroundHtmlRef.current));
    });

    const style = useMemo(() => {
        const filter = 'url(#filter-spotify)';
        return props.style ? { filter, ...props.style } : { filter };
    }, [props.style]);

    return (
      <>
        <ColorMatrixFilter color={logoColor} />
        <img ref={selfRef} src={props.src} alt="Spotify Logo" height={props.height} style={style} />
      </>
    );
}
