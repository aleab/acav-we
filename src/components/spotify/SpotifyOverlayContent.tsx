import React, { useMemo } from 'react';

import SpotifyLogo from './SpotifyLogo';
import SpotifyOverlaySongInfo from './SpotifyOverlaySongInfo';

type OverlayStyle = {
    maxWidth: number;
    fontSize: number;
    color: string;
};

export interface SpotifyOverlayContentProps {
    width: number;
    marginLeft?: number;
    marginRight?: number;
    overlayStyle: OverlayStyle;
    showLogo?: boolean;
    preferMonochromeLogo?: boolean;
    logoMarginLeft?: number;
    logoHeight?: number;
    alignSelf?: 'flex-start' | 'flex-end';

    currentlyPlayingTrack: SpotifyTrack;
    showMusicbrainzLogoOnLocalTrack: boolean;

    forceRefreshScrollableArea?: React.MutableRefObject<(() => void) | undefined>;
}

export default function SpotifyOverlayContent(props: SpotifyOverlayContentProps) {
    const width = useMemo(() => props.overlayStyle.maxWidth, [props.overlayStyle.maxWidth]);
    const fontSize = useMemo(() => props.overlayStyle.fontSize, [props.overlayStyle.fontSize]);
    const color = useMemo(() => props.overlayStyle.color, [props.overlayStyle.color]);

    const logoHeight = useMemo(() => props.logoHeight ?? 0, [props.logoHeight]);
    const mbLogoHeight = useMemo(() => 0.75 * logoHeight, [logoHeight]);
    const mbMargin = useMemo(() => (props.showLogo && props.currentlyPlayingTrack.is_local ? (logoHeight - mbLogoHeight) / 2 : undefined), [ logoHeight, mbLogoHeight, props.currentlyPlayingTrack.is_local, props.showLogo ]);

    const style = useMemo<React.CSSProperties>(() => ({
        width: props.width,
        marginLeft: props.marginLeft,
        marginRight: props.marginRight,
        alignSelf: props.alignSelf,
    }), [ props.alignSelf, props.marginLeft, props.marginRight, props.width ]);

    return (
      <div className="overlay-content" style={style}>
        {
            props.showLogo ? (
              props.currentlyPlayingTrack.is_local ? (
                <img
                  src="./images/musicbrainz-logo.svg" alt="MusicBrainz Logo" height={mbLogoHeight}
                  style={{ margin: `${-6 + (mbMargin ?? 0)}px 0 6px ${props.logoMarginLeft ?? 0}px`, visibility: props.showMusicbrainzLogoOnLocalTrack ? undefined : 'hidden' }}
                />
              ) : (
                <SpotifyLogo preferMonochrome={props.preferMonochromeLogo ?? false} src="./images/spotify-logo.png" height={logoHeight} style={{ margin: `-6px 0 6px ${props.logoMarginLeft ?? 0}px` }} />
              )
            ) : null
        }
        <SpotifyOverlaySongInfo
          currentlyPlaying={props.currentlyPlayingTrack} forceRefreshScrollableArea={props.forceRefreshScrollableArea}
          width={width} fontSize={fontSize} color={color} style={{ marginTop: mbMargin }}
        />
      </div>
    );
}
