import ColorConvert from 'color-convert';
import { RGB } from 'color-convert/conversions';
import React, { useState } from 'react';

interface SpotifyOverlaySongInfoProps {
    currentlyPlaying: SpotifyCurrentlyPlayingObject | null;
    fontSize: number;
    color: string;
}

function darken(cssColor: string): string {
    let rgba: RGBA = [ 255, 255, 255, 1 ];
    if (cssColor.startsWith('#')) {
        const _rgb = ColorConvert.hex.rgb(cssColor);
        rgba = [ _rgb[0], _rgb[1], _rgb[2], 255 ];
    } else if (cssColor.startsWith('rgb')) {
        const _rgba = cssColor.replace(/^rgba?\((.+?)\)$/, '$1').split(',').map(v => Number(v));
        rgba = [ _rgba[0], _rgba[1], _rgba[2], _rgba[3] ?? 1 ];
    }
    const hsv = ColorConvert.rgb.hsv([ rgba[0], rgba[1], rgba[2] ]);
    hsv[2] *= 0.7;

    const rgb = ColorConvert.hsv.rgb(hsv);
    return rgba[3] !== 1 ? `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${rgba[3]})` : `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

export default function SpotifyOverlaySongInfo(props: SpotifyOverlaySongInfoProps) {
    if (props.currentlyPlaying === null || props.currentlyPlaying.item === null) {
        return <div />;
    }

    // TODO: Show all artists

    const songInfoStyle = { color: props.color };
    const titleStyle = { lineHeight: `${props.fontSize + 4}px` };
    const artistStyle = {
        fontSize: props.fontSize - 2,
        lineHeight: `${props.fontSize + 2}px`,
        color: darken(props.color),
    };

    return (
      <div className="song-info py-3 pr-2" style={songInfoStyle}>
        <div style={titleStyle}>
          <span className="song-info-item">{props.currentlyPlaying.item.name}</span>
        </div>
        <div style={artistStyle}>
          <span className="song-info-item artist">{props.currentlyPlaying.item.artists[0].name}</span>
        </div>
      </div>
    );
}
