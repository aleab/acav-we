import React, { useContext, useMemo } from 'react';

import SpotifyLogo from './SpotifyLogo';
import SpotifyOverlaySongInfo from './SpotifyOverlaySongInfo';
import SpotifyOverlayContext from './SpotifyOverlayContext';

type OverlayStyle = {
    maxWidth: number;
    fontSize: number;
    color: string;
};

export interface SpotifyOverlayContentProps {
    width: number;
    marginLeft?: number;
    overlayStyle: OverlayStyle;
    showLogo?: boolean;
    logoMarginLeft?: number;
    logoHeight?: number;
    alignSelf?: 'flex-start' | 'flex-end';

    currentlyPlayingTrack: SpotifyTrack;
}

export default function SpotifyOverlayContent(props: SpotifyOverlayContentProps) {
    const width = useMemo(() => props.overlayStyle.maxWidth, [props.overlayStyle.maxWidth]);
    const fontSize = useMemo(() => props.overlayStyle.fontSize, [props.overlayStyle.fontSize]);
    const color = useMemo(() => props.overlayStyle.color, [props.overlayStyle.color]);

    return (
      <div className="overlay-content" style={{ width: props.width, marginLeft: props.marginLeft, alignSelf: props.alignSelf }}>
        {
            props.showLogo ? (
              <SpotifyLogo src="./images/spotify-logo.png" height={props.logoHeight ?? 0} style={{ margin: `-6px 0 6px ${props.logoMarginLeft ?? 0}px` }} />
            ) : null
        }
        <SpotifyOverlaySongInfo currentlyPlaying={props.currentlyPlayingTrack} width={width} fontSize={fontSize} color={color} />
      </div>
    );
}
