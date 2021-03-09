import _ from 'lodash';
import React, { RefObject, useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { CacheStorage } from 'html2canvas/background-parser';

import { FaSpotify } from '../../fa';
import SpotifyUtils from '../../app/spotify-utils';
import { CancellationTokenSource } from '../../common/CancellationToken';
import { getComputedBackgroundProperties } from '../../common/Css';

type ComputedBackgroundProperties = ReturnType<typeof getComputedBackgroundProperties>;

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
    const [ iconColor, setIconColor ] = useState(SpotifyUtils.SPOTIFY_LIGHT_GREEN);
    const iconRef = useRef<HTMLElement>(null);

    const html2canvasCache = useRef<ReturnType<typeof CacheStorage.create>>();
    useEffect(() => {
        const [ cache, destroyCache ] = SpotifyUtils.createHtml2canvasCache('SpotifyOverlayIcon');
        html2canvasCache.current =  cache;
        return () => {
            destroyCache();
            html2canvasCache.current = undefined;
        };
    }, []);

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
    }, [ overlayBackgroundProperties, props.backgroundHtmlRef, props.overlayHtmlRef, wallpaperBackgroundProperties ]);

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
