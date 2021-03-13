import _ from 'lodash';
import React, { RefObject, useCallback, useEffect, useReducer, useRef } from 'react';

import { FaSpotify } from '../../fa';
import SpotifyUtils from '../../app/spotify-utils';
import { CancellationTokenSource } from '../../common/CancellationToken';
import { getComputedBackgroundProperties } from '../../common/Css';

type ComputedBackgroundProperties = ReturnType<typeof getComputedBackgroundProperties>;
type Color = typeof SpotifyUtils.SPOTIFY_LIGHT_GREEN;

interface SpotifyOverlayIconProps {
    style?: any;
    overlayHtmlRef: RefObject<HTMLElement>;
    backgroundHtmlRef: RefObject<HTMLElement>;
}

// ===========
//  COMPONENT
// ===========

export default function SpotifyOverlayIcon(props: SpotifyOverlayIconProps) {
    // Spotify's Branding Guidelines: https://developer.spotify.com/branding-guidelines/
    const iconRef = useRef<HTMLElement>(null);
    const [ iconColor, setIconColor ] = useReducer((prevColor: Color, newColor: Color) => {
        if (prevColor.hex === newColor.hex) return prevColor;
        return newColor;
    }, SpotifyUtils.SPOTIFY_LIGHT_GREEN);

    const html2canvasCache = SpotifyUtils.useHtml2canvasCache('SpotifyOverlayIcon');

    const computedBackgroundPropertiesReducer = useCallback((prevProps: ComputedBackgroundProperties, newProps: ComputedBackgroundProperties) => {
        if (prevProps !== null && newProps !== null && _.isMatch(prevProps, newProps)) return prevProps;
        return newProps;
    }, []);
    const [ overlayBackgroundProperties, setOverlayBackgroundProperties ] = useReducer(computedBackgroundPropertiesReducer, getComputedBackgroundProperties(props.overlayHtmlRef.current));
    const [ wallpaperBackgroundProperties, setWallpaperBackgroundProperties ] = useReducer(computedBackgroundPropertiesReducer, getComputedBackgroundProperties(props.backgroundHtmlRef.current));

    // Change the icon's color based on the background to respect Spotify's guidelines
    const cts = useRef(new CancellationTokenSource());
    useEffect(() => {
        SpotifyUtils.chooseAppropriateSpotifyColor(
            html2canvasCache,
            [ props.backgroundHtmlRef, props.overlayHtmlRef ],
            [ wallpaperBackgroundProperties, overlayBackgroundProperties ],
            iconRef,
            cts,
            color => setIconColor(color),
        );
    }, [ html2canvasCache, overlayBackgroundProperties, props.backgroundHtmlRef, props.overlayHtmlRef, wallpaperBackgroundProperties ]);

    useEffect(() => {
        setOverlayBackgroundProperties(getComputedBackgroundProperties(props.overlayHtmlRef.current));
        setWallpaperBackgroundProperties(getComputedBackgroundProperties(props.backgroundHtmlRef.current));
    });

    return (
      <span className="spotify-icon" style={props.style} ref={iconRef}>
        <FaSpotify color={iconColor.hex} />
      </span>
    );
}
