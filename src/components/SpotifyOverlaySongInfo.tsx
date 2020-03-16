import _ from 'lodash';
import ColorConvert from 'color-convert';
import React, { RefObject, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import Log from '../common/Log';
import { cssColorToRgba } from '../common/Css';
import WallpaperContext, { WallpaperContextType } from '../app/WallpaperContext';
import useAutoScrollHTMLElement, { UseAutoScrollHTMLElementOptions } from '../hooks/useAutoScrollHTMLElement';
import useScrollHTMLElement from '../hooks/useScrollHTMLElement';

const BRIGHTNESS_R = 0.4;
function darkenOrLighten(cssColor: string): string {
    const rgba = cssColorToRgba(cssColor);
    if (rgba === undefined) return cssColor;

    const hsv = ColorConvert.rgb.hsv([ rgba[0], rgba[1], rgba[2] ]);
    hsv[2] = hsv[2] > 50 ? hsv[2] * (1 - BRIGHTNESS_R) : hsv[2] * (1 + BRIGHTNESS_R);

    const rgb = ColorConvert.hsv.rgb(hsv);
    return rgba[3] !== 1 ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${rgba[3]})` : `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

interface SpotifyOverlaySongInfoProps {
    currentlyPlaying: SpotifyCurrentlyPlayingObject;
    width: number;
    color: string;
    fontSize: number;
    style?: any;
}

function getComputedFontSize(el: HTMLElement) {
    return Number(getComputedStyle(el).fontSize.slice(0, -2));
}

// ==============
//  Scroll Hooks
// ==============
// TODO: Refactor into separate files

function useFieldScrollWidthState<TField extends HTMLElement, TScroll extends HTMLElement>(
    fieldRef: RefObject<TField>,
    scrollRef: RefObject<TScroll>,
    fieldText: string,
    containerWidth: number, fontSize: number,
) {
    const [ fieldScrollWidth, setfieldScrollWidth ] = useState<number | undefined>(fieldRef.current?.scrollWidth ?? 0);
    useEffect(() => {
        // Update scroll width when any of the following changes
        ((..._deps: any[]) => {})(containerWidth, fontSize, fieldText);

        if (fieldRef.current !== null && scrollRef.current !== null) {
            const fieldComputedFontSize = getComputedFontSize(fieldRef.current);
            fieldRef.current.innerHTML = fieldText;
            if (fieldComputedFontSize > 0) {
                const paddingPx = 1.5 * fieldComputedFontSize;
                setfieldScrollWidth(fieldRef.current.scrollWidth + paddingPx + scrollRef.current.offsetWidth);
                if (scrollRef.current.scrollWidth > scrollRef.current.offsetWidth) {
                    fieldRef.current.innerHTML = `${fieldText}<span style="margin-left: ${paddingPx}px;">${fieldText}</span>`;
                }
            } else {
                setfieldScrollWidth(undefined);
            }
        } else {
            setfieldScrollWidth(undefined);
        }
    }, [ containerWidth, fieldRef, fieldText, fontSize, scrollRef ]);

    return fieldScrollWidth;
}

function useSongFieldAutoScroll<TField extends HTMLElement, TScroll extends HTMLElement>(
    currentlyPlayingObject: SpotifyCurrentlyPlayingObject,
    fieldTextFactory: (spotifyTrack: SpotifyTrack | null) => string,
    scrollOptions: Partial<UseAutoScrollHTMLElementOptions>,
    render: (callback: () => void) => void,
    containerWidth: number, fontSize: number,
): [
    string,
    RefObject<TField>,
    RefObject<TScroll>,
] {
    const fieldRef = useRef<TField>(null);
    const scrollRef = useRef<TScroll>(null);
    const fieldText = useMemo(() => fieldTextFactory(currentlyPlayingObject.item), [ currentlyPlayingObject.item, fieldTextFactory ]);
    const fieldScrollWidth = useFieldScrollWidthState(fieldRef, scrollRef, fieldText, containerWidth, fontSize);

    useAutoScrollHTMLElement(scrollRef, 50, { ...scrollOptions, render, axis: 'x', scrollWidth: fieldScrollWidth });

    return [ fieldText, fieldRef, scrollRef ];
}

function useSongFieldManualScroll<TField extends HTMLElement, TScroll extends HTMLElement>(
    currentlyPlayingObject: SpotifyCurrentlyPlayingObject,
    fieldTextFactory: (spotifyTrack: SpotifyTrack | null) => string,
    render: (callback: () => void) => void,
    containerWidth: number, fontSize: number,
): [
    string,
    RefObject<TField>,
    RefObject<TScroll>,
    (ondone?: () => void) => void,
    () => void,
] {
    const fieldRef = useRef<TField>(null);
    const scrollRef = useRef<TScroll>(null);
    const fieldText = useMemo(() => fieldTextFactory(currentlyPlayingObject.item), [ currentlyPlayingObject.item, fieldTextFactory ]);
    const fieldScrollWidth = useFieldScrollWidthState(fieldRef, scrollRef, fieldText, containerWidth, fontSize);

    const [ scrollX, stopScrollX ] = useScrollHTMLElement(scrollRef, 50, { render, axis: 'x', scrollWidth: fieldScrollWidth, thresholdPx: 3, resetDelayMs: 0 });

    return [ fieldText, fieldRef, scrollRef, scrollX, stopScrollX ];
}

export default function SpotifyOverlaySongInfo(props: SpotifyOverlaySongInfoProps) {
    const context = useContext(WallpaperContext);

    // =============
    //  Auto scroll
    // =============
    const scrollTrackRenderCallback = useCallback((callback: () => void) => context?.renderer.queue('SpotifyOverlaySongInfo-ScrollTrack', callback), [context]);
    const scrollArtistsRenderCallback = useCallback((callback: () => void) => context?.renderer.queue('SpotifyOverlaySongInfo-ScrollArtists', callback), [context]);
    const scrollOptions: Partial<UseAutoScrollHTMLElementOptions> = { msDelayStart: 3000, msDelayReset: 0 };
    const [ track, trackFieldRef, trackScrollRef ] = useSongFieldAutoScroll<HTMLSpanElement, HTMLDivElement>(
        props.currentlyPlaying,
        spotifyTrack => (spotifyTrack?.name ?? ''),
        scrollOptions,
        scrollTrackRenderCallback,
        props.width, props.fontSize,
    );
    const [ artists, artistsFieldRef, artistsScrollRef ] = useSongFieldAutoScroll<HTMLSpanElement, HTMLDivElement>(
        props.currentlyPlaying,
        spotifyTrack => (spotifyTrack === null ? '' : spotifyTrack.artists.reduce((acc, artist) => (acc ? `${acc}, ${artist.name}` : artist.name), '')),
        scrollOptions,
        scrollArtistsRenderCallback,
        props.width, props.fontSize,
    );

    const songInfoStyle = _.merge({}, {
        width: props.width,
    }, props.style);
    const trackStyle = {};
    const artistsStyle = {
        color: darkenOrLighten(props.color),
    };

    return (
      <div className="song-info pr-2" style={songInfoStyle}>
        <div className="scrollable-x lh-0" ref={trackScrollRef}>
          <span className="song-info-field track" style={trackStyle} ref={trackFieldRef}>{track}</span>
        </div>
        <div className="scrollable-x lh-0" ref={artistsScrollRef}>
          <span className="song-info-field artists" style={artistsStyle} ref={artistsFieldRef}>{artists}</span>
        </div>
      </div>
    );
}
