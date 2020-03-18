import _ from 'lodash';
import ColorConvert from 'color-convert';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { DeepReadonly } from 'utility-types';

import Log from '../common/Log';
import { cssColorToRgba } from '../common/Css';
import WallpaperContext from '../app/WallpaperContext';
import useUserPropertiesListener from '../hooks/useUserPropertiesListener';

import ScrollableLoopingText from './ScrollableLoopingText';

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

    const songInfoStyle = _.merge({}, {
        width: props.width,
    }, props.style);
    const trackStyle = {};
    const artistsStyle = {
        color: darkenOrLighten(props.color),
    };

    const scrollTrackRenderCallback = useCallback((callback: () => void) => context.renderer.queue('SpotifyOverlaySongInfo-ScrollTrack', callback), [context]);
    const scrollTrackCancelRender = useCallback(() => context.renderer.cancel('SpotifyOverlaySongInfo-ScrollTrack'), [context]);
    const track = props.currentlyPlaying.item?.name ?? '';

    const scrollArtistsRenderCallback = useCallback((callback: () => void) => context.renderer.queue('SpotifyOverlaySongInfo-ScrollArtists', callback), [context]);
    const scrollArtistsCancelRender = useCallback(() => context.renderer.cancel('SpotifyOverlaySongInfo-ScrollArtists'), [context]);
    const artists = props.currentlyPlaying.item === null ? '' : props.currentlyPlaying.item.artists.reduce((acc, artist) => (acc ? `${acc}, ${artist.name}` : artist.name), '');

    return (
      <div className="song-info pr-2" style={songInfoStyle}>
        <ScrollableLoopingText
          className="scrollable-x lh-0" textClassName="song-info-field track" textStyle={trackStyle}
          scrollType={scrollType} scrollSpeed={scrollSpeed} scrollStartDelayMs={scrollStartDelay} loopMarginEm={2}
          text={track} maxWidth={props.width} fontSize={props.fontSize}
          render={scrollTrackRenderCallback} cancelRender={scrollTrackCancelRender}
        />
        <ScrollableLoopingText
          className="scrollable-x lh-0" textClassName="song-info-field artists" textStyle={artistsStyle}
          scrollType={scrollType} scrollSpeed={scrollSpeed} scrollStartDelayMs={scrollStartDelay} loopMarginEm={2}
          text={artists} maxWidth={props.width} fontSize={props.fontSize}
          render={scrollArtistsRenderCallback} cancelRender={scrollArtistsCancelRender}
        />
      </div>
    );
}
