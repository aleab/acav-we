import _ from 'lodash';
import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';

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

interface SpotifyOverlaySongInfoProps {
    currentlyPlaying: SpotifyCurrentlyPlayingObject;
    width: number;
    color: string;
    fontSize: number;
    style?: any;
    className?: string;
}

// ===========
//  Component
// ===========
export default function SpotifyOverlaySongInfo(props: SpotifyOverlaySongInfoProps) {
    const context = useContext(WallpaperContext)!;
    const O = useRef(context.wallpaperProperties.spotify.scroll);

    const [ scrollEnabled, setScrollEnabled ] = useState(O.current.enabled);
    const [ scrollType, setScrollType ] = useState(O.current.type);
    const [ scrollSpeed, setScrollSpeed ] = useState(O.current.speed);
    const [ scrollStartDelay, setScrollStartDelay ] = useState(O.current.autoDelay);

    // =====================
    //  PROPERTIES LISTENER
    // =====================
    useUserPropertiesListener(p => p.spotify?.scroll, scrollProps => {
        if (scrollProps.enabled !== undefined) setScrollEnabled(scrollProps.enabled);
        if (scrollProps.type !== undefined) setScrollType(scrollProps.type);
        if (scrollProps.speed !== undefined) setScrollSpeed(scrollProps.speed);
        if (scrollProps.autoDelay !== undefined) setScrollStartDelay(scrollProps.autoDelay);
    }, []);

    const TRACK_RENDER_ID = useMemo(() => `SpotifyOverlaySongInfo-ScrollTrack-${(Math.random() * (10 ** 6)).toFixed(6)}`, []);
    const scrollTrackRenderCallback = useCallback((callback: () => void) => context.renderer.queue(TRACK_RENDER_ID, callback), [ TRACK_RENDER_ID, context.renderer ]);
    const scrollTrackCancelRender = useCallback(() => context.renderer.cancel(TRACK_RENDER_ID), [ TRACK_RENDER_ID, context.renderer ]);
    const track = useMemo(() => (props.currentlyPlaying.item?.name ?? ''), [props.currentlyPlaying.item]);

    const ARTISTS_RENDER_ID = useMemo(() => `SpotifyOverlaySongInfo-ScrollArtists-${(Math.random() * (10 ** 6)).toFixed(6)}`, []);
    const scrollArtistsRenderCallback = useCallback((callback: () => void) => context.renderer.queue(ARTISTS_RENDER_ID, callback), [ ARTISTS_RENDER_ID, context.renderer ]);
    const scrollArtistsCancelRender = useCallback(() => context.renderer.cancel(ARTISTS_RENDER_ID), [ ARTISTS_RENDER_ID, context.renderer ]);
    const artists = useMemo(() => {
        if (props.currentlyPlaying.item === null) return '';
        return props.currentlyPlaying.item.artists.reduce((acc, artist) => (acc ? `${acc}, ${artist.name}` : artist.name), '');
    }, [props.currentlyPlaying.item]);

    const songInfoStyle = _.merge({}, {
        width: props.width,
    }, props.style);

    return (
      <div className={_.join([ 'song-info', props.className ], ' ').trim()} style={songInfoStyle}>
        <ScrollableLoopingText
          className="lh-0 scrollable-x song-info-mask" textClassName="song-info-field track"
          scrollType={scrollEnabled ? scrollType : false} scrollSpeed={scrollSpeed} scrollStartDelayMs={scrollStartDelay} loopMarginEm={2}
          text={track} maxWidth={props.width} fontSize={props.fontSize}
          render={scrollTrackRenderCallback} cancelRender={scrollTrackCancelRender}
        />
        <ScrollableLoopingText
          className="lh-0 scrollable-x song-info-mask" textClassName="song-info-field artists" textStyle={{ color: darkenOrLighten(props.color) }}
          scrollType={scrollEnabled ? scrollType : false} scrollSpeed={scrollSpeed} scrollStartDelayMs={scrollStartDelay} loopMarginEm={2}
          text={artists} maxWidth={props.width} fontSize={props.fontSize}
          render={scrollArtistsRenderCallback} cancelRender={scrollArtistsCancelRender}
        />
      </div>
    );
}