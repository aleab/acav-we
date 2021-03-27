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
    logoPosition: 'top' | 'bottom';
    logoAlignment: 'left' | 'right';
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
    const mbExtraMargin = useMemo(() => (props.showLogo && props.currentlyPlayingTrack.is_local ? (logoHeight - mbLogoHeight) / 2 : undefined), [ logoHeight, mbLogoHeight, props.currentlyPlayingTrack.is_local, props.showLogo ]);

    const logoMargin = useMemo(() => {
        const extraMarginY = props.currentlyPlayingTrack.is_local ? (mbExtraMargin ?? 0) : 0;

        const top = props.logoPosition === 'bottom' ? 6 : -6 + extraMarginY;
        const right = props.logoAlignment === 'right' ? logoHeight / 2 : 0;
        const bottom = props.logoPosition === 'bottom' ? -6 + extraMarginY : 6;
        const left = props.logoAlignment === 'right' ? 0 : props.logoMarginLeft ?? 0;

        return `${top}px ${right}px ${bottom}px ${left}px`;
    }, [ logoHeight, mbExtraMargin, props.currentlyPlayingTrack.is_local, props.logoAlignment, props.logoMarginLeft, props.logoPosition ]);
    const logoAlignSelf = useMemo(() => (props.logoAlignment === 'right' ? 'flex-end' : undefined), [props.logoAlignment]);

    const style = useMemo<React.CSSProperties>(() => ({
        width: props.width,
        marginLeft: props.marginLeft,
        marginRight: props.marginRight,
        alignSelf: props.alignSelf,
        flexDirection: props.logoPosition === 'bottom' ? 'column-reverse' : undefined,
    }), [ props.alignSelf, props.logoPosition, props.marginLeft, props.marginRight, props.width ]);
    const songInfoStyle = useMemo<React.CSSProperties>(() => ({
        marginTop: props.logoPosition === 'bottom' ? undefined : mbExtraMargin,
        marginBottom: props.logoPosition === 'bottom' ? mbExtraMargin : undefined,
    }), [ mbExtraMargin, props.logoPosition ]);

    return (
      <div className="overlay-content" style={style}>
        {
            props.showLogo ? (
              props.currentlyPlayingTrack.is_local ? (
                <img
                  src="./images/musicbrainz-logo.svg" alt="MusicBrainz Logo" height={mbLogoHeight}
                  style={{ margin: logoMargin, visibility: props.showMusicbrainzLogoOnLocalTrack ? undefined : 'hidden', alignSelf: logoAlignSelf }}
                />
              ) : (
                <SpotifyLogo preferMonochrome={props.preferMonochromeLogo ?? false} src="./images/spotify-logo.png" height={logoHeight} style={{ margin: logoMargin, alignSelf: logoAlignSelf }} />
              )
            ) : null
        }
        <SpotifyOverlaySongInfo
          currentlyPlaying={props.currentlyPlayingTrack} forceRefreshScrollableArea={props.forceRefreshScrollableArea}
          width={width} fontSize={fontSize} color={color} style={songInfoStyle}
        />
      </div>
    );
}
