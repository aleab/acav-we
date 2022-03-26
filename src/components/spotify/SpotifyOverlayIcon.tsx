import _ from 'lodash';
import React, { useCallback, useContext, useEffect, useReducer, useRef } from 'react';

import { FaSpotify } from '../../fa';
import SpotifyUtils from '../../app/spotify-utils';
import { CancellationTokenSource } from '../../common/CancellationToken';
import { getComputedBackgroundProperties } from '../../common/Css';
import SpotifyOverlayContext from './SpotifyOverlayContext';
import Bounds from '../../common/Bounds';

type ComputedBackgroundProperties = ReturnType<typeof getComputedBackgroundProperties>;
type Color = typeof SpotifyUtils.SPOTIFY_LIGHT_GREEN;

interface SpotifyOverlayIconProps {
    preferMonochrome: boolean;
    style?: any;
}

// ===========
//  COMPONENT
// ===========

export default function SpotifyOverlayIcon(props: SpotifyOverlayIconProps) {
    const context = useContext(SpotifyOverlayContext)!;

    // Spotify's Branding Guidelines: https://developer.spotify.com/branding-guidelines/
    const iconRef = useRef<HTMLElement>(null);
    const [ iconColor, setIconColor ] = useReducer((prevColor: Color, newColor: Color) => {
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

    // Change the icon's color based on the background to respect Spotify's guidelines
    const cts = useRef(new CancellationTokenSource());
    useEffect(() => {
        SpotifyUtils.chooseAppropriateSpotifyColor(
            html2canvasCache,
            [ context.backgroundHtmlRef, context.overlayHtmlRef ],
            [ wallpaperBackgroundProperties, overlayBackgroundProperties ],
            iconRef,
            props.preferMonochrome,
            cts,
            color => setIconColor(color),
        );
    }, [ context.backgroundHtmlRef, context.overlayHtmlRef, html2canvasCache, overlayBackgroundProperties, props.preferMonochrome, wallpaperBackgroundProperties ]);

    useEffect(() => {
        setOverlayBackgroundProperties(getComputedBackgroundProperties(context.overlayHtmlRef.current));
        setWallpaperBackgroundProperties(getComputedBackgroundProperties(context.backgroundHtmlRef.current));
    });

    return (
      <span className="spotify-icon" style={props.style} ref={iconRef}>
        <FaSpotify color={iconColor.hex} />
      </span>
    );
}
