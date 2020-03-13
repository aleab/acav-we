import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpotify } from '@fortawesome/free-brands-svg-icons';

interface SpotifyOverlayIconProps {
    style?: any;
}

export default function SpotifyOverlayIcon(props: SpotifyOverlayIconProps) {
    // https://developer.spotify.com/branding-guidelines/
    // Spotify Light Green: #1ED760
    // Spotify White:       #FFFFFF
    // Spotify Black:       #191414

    // TODO: Change color automatically depending on the background color to respect Spotify giudelines
    //       - Green, when the background is black/white/gray
    //       - Black, when the background is light
    //       - White, when the background is dark

    return (
      <span className="spotify-icon" style={props.style}>
        <FontAwesomeIcon icon={faSpotify} color="#1ED760" />
      </span>
    );
}
