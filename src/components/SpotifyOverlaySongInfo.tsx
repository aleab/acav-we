import _ from 'lodash';
import ColorConvert from 'color-convert';
import React from 'react';

const BRIGHTNESS_R = 0.4;
function darkenOrLighten(cssColor: string): string {
    let rgba: RGBA = [ 255, 255, 255, 1 ];
    if (cssColor.startsWith('#')) {
        const _rgb = ColorConvert.hex.rgb(cssColor);
        rgba = [ _rgb[0], _rgb[1], _rgb[2], 255 ];
    } else if (cssColor.startsWith('rgb')) {
        const _rgba = cssColor.replace(/^rgba?\((.+?)\)$/, '$1').split(',').map(v => Number(v));
        rgba = [ _rgba[0], _rgba[1], _rgba[2], _rgba[3] ?? 1 ];
    }

    const hsv = ColorConvert.rgb.hsv([ rgba[0], rgba[1], rgba[2] ]);
    hsv[2] = hsv[2] > 50 ? hsv[2] * (1 - BRIGHTNESS_R) : hsv[2] * (1 + BRIGHTNESS_R);

    const rgb = ColorConvert.hsv.rgb(hsv);
    return rgba[3] !== 1 ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${rgba[3]})` : `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

interface SpotifyOverlaySongInfoProps {
    currentlyPlaying: SpotifyCurrentlyPlayingObject | null;
    width: number;
    color: string;
    style?: any;
}

export default function SpotifyOverlaySongInfo(props: SpotifyOverlaySongInfoProps) {
    if (props.currentlyPlaying === null || props.currentlyPlaying.item === null) {
        return null;
    }

    // TODO: Show all artists

    const songInfoStyle = _.merge({}, {
        width: props.width,
    }, props.style);
    const trackStyle = {};
    const artistsStyle = {
        color: darkenOrLighten(props.color),
    };

    return (
      <div className="song-info pr-2" style={songInfoStyle}>
        <div className="scrollable-x lh-0">
          <span className="song-info-field track" style={trackStyle}>{props.currentlyPlaying.item.name}</span>
        </div>
        <div className="scrollable-x lh-0">
          <span className="song-info-field artists" style={artistsStyle}>{props.currentlyPlaying.item.artists[0].name}</span>
        </div>
      </div>
    );
}
