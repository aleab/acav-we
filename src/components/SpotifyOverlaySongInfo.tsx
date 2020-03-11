import React, { useState } from 'react';

interface SpotifyOverlaySongInfoProps {
    currentlyPlaying: SpotifyCurrentlyPlayingObject | null;
    fontSize: number;
    color: string;
}

export default function SpotifyOverlaySongInfo(props: SpotifyOverlaySongInfoProps) {
    if (props.currentlyPlaying === null || props.currentlyPlaying.item === null) {
        return <div />;
    }

    // TODO: Show all artists
    // TODO: Make color of artist field 30% darker (HSV)
    return (
      <div className="song-info py-3 pr-2" style={{ color: props.color }}>
        <div style={{ lineHeight: `${props.fontSize + 4}px` }}>
          <span className="song-info-item">{props.currentlyPlaying.item.name}</span>
        </div>
        <div style={{ lineHeight: `${props.fontSize + 2}px` }}>
          <span className="song-info-item artist" style={{ fontSize: props.fontSize - 2 }}>{props.currentlyPlaying.item.artists[0].name}</span>
        </div>
      </div>
    );
}
