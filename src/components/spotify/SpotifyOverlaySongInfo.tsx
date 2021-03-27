import _ from 'lodash';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { darkenOrLightenRgbColor } from '../../common/Colors';
import { cssColorToRgba } from '../../common/Css';
import WallpaperContext from '../../app/WallpaperContext';
import useUserPropertiesListener from '../../hooks/useUserPropertiesListener';

import ScrollableLoopingText from '../ScrollableLoopingText';

const BRIGHTNESS_R = 0.4;
function darkenOrLighten(cssColor: string): string {
    const rgba = cssColorToRgba(cssColor);
    if (rgba === undefined) return cssColor;
    const rgb = darkenOrLightenRgbColor([ rgba[0], rgba[1], rgba[2] ], BRIGHTNESS_R);
    return rgba[3] !== 1 ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${rgba[3]})` : `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

export interface SpotifyOverlaySongInfoProps {
    currentlyPlaying: SpotifyTrack;
    width: number;
    color: string;
    fontSize: number;
    style?: React.CSSProperties;
    className?: string;
    forceRefreshScrollableArea?: React.MutableRefObject<(() => void) | undefined>;
}

// ===========
//  Component
// ===========
export default function SpotifyOverlaySongInfo(props: SpotifyOverlaySongInfoProps) {
    const context = useContext(WallpaperContext)!;
    const O = useRef(context.wallpaperProperties.spotify.scroll);

    const [ scrollType, setScrollType ] = useState(O.current.type);
    const [ scrollSpeed, setScrollSpeed ] = useState(O.current.speed);
    const [ scrollStartDelay, setScrollStartDelay ] = useState(O.current.autoDelay);

    // =====================
    //  PROPERTIES LISTENER
    // =====================
    useUserPropertiesListener(p => p.spotify?.scroll, scrollProps => {
        if (scrollProps.type !== undefined) setScrollType(scrollProps.type);
        if (scrollProps.speed !== undefined) setScrollSpeed(scrollProps.speed);
        if (scrollProps.autoDelay !== undefined) setScrollStartDelay(scrollProps.autoDelay);
    }, []);

    const TRACK_RENDER_ID = useMemo(() => `SpotifyOverlaySongInfo-ScrollTrack-${(Math.random() * (10 ** 6)).toFixed(6)}`, []);
    const scrollTrackRenderCallback = useCallback((callback: () => void) => context.renderer.queue(TRACK_RENDER_ID, callback), [ TRACK_RENDER_ID, context.renderer ]);
    const scrollTrackCancelRender = useCallback(() => context.renderer.cancel(TRACK_RENDER_ID), [ TRACK_RENDER_ID, context.renderer ]);
    const track = useMemo(() => (props.currentlyPlaying.name ?? ''), [props.currentlyPlaying.name]);

    const ARTISTS_RENDER_ID = useMemo(() => `SpotifyOverlaySongInfo-ScrollArtists-${(Math.random() * (10 ** 6)).toFixed(6)}`, []);
    const scrollArtistsRenderCallback = useCallback((callback: () => void) => context.renderer.queue(ARTISTS_RENDER_ID, callback), [ ARTISTS_RENDER_ID, context.renderer ]);
    const scrollArtistsCancelRender = useCallback(() => context.renderer.cancel(ARTISTS_RENDER_ID), [ ARTISTS_RENDER_ID, context.renderer ]);
    const artists = useMemo(() => {
        if (props.currentlyPlaying.artists === null) return '';
        return props.currentlyPlaying.artists.reduce((acc, artist) => (acc ? `${acc}, ${artist.name}` : artist.name), '');
    }, [props.currentlyPlaying.artists]);

    // forceRefreshScrollableArea
    const forceRefreshScrollableAreaTrack = useRef<() => void>();
    const forceRefreshScrollableAreaArtists = useRef<() => void>();
    useEffect(() => {
        if (props.forceRefreshScrollableArea) {
            props.forceRefreshScrollableArea.current = () => {
                forceRefreshScrollableAreaTrack.current?.();
                forceRefreshScrollableAreaArtists.current?.();
            };
        }
    }, [props.forceRefreshScrollableArea]);

    const songInfoStyle = _.merge({}, {
        //width: props.width,
    }, props.style);

    return (
      <div className={_.join([ 'song-info', props.className ], ' ').trim()} style={songInfoStyle}>
        <ScrollableLoopingText
          className="lh-0 scrollable-x song-info-mask" textClassName="song-info-field track"
          scrollType={scrollType} scrollSpeed={scrollSpeed} scrollStartDelayMs={scrollStartDelay} loopMarginEm={2}
          text={track} maxWidth={props.width} fontSize={props.fontSize}
          render={scrollTrackRenderCallback} cancelRender={scrollTrackCancelRender}
          forceRefreshScrollableArea={forceRefreshScrollableAreaTrack}
        />
        <ScrollableLoopingText
          className="lh-0 scrollable-x song-info-mask" textClassName="song-info-field artists" textStyle={{ color: darkenOrLighten(props.color) }}
          scrollType={scrollType} scrollSpeed={scrollSpeed} scrollStartDelayMs={scrollStartDelay} loopMarginEm={2}
          text={artists} maxWidth={props.width} fontSize={props.fontSize}
          render={scrollArtistsRenderCallback} cancelRender={scrollArtistsCancelRender}
          forceRefreshScrollableArea={forceRefreshScrollableAreaArtists}
        />
      </div>
    );
}
