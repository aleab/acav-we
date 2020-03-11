import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpotify } from '@fortawesome/free-brands-svg-icons';

export default function SpotifyOverlayIcon() {
    // Spotify Light Green: #1ED760
    // Spotify White:       #FFFFFF
    // Spotify Black:       #191414

    // TODO: Change color automatically depending on the background color to respect Spotify giudelines
    //       - Green, when the background is black/white/gray
    //       - Black, when the background is light
    //       - White, when the background is dark

    const style = {
        margin: 14,
        fontSize: 28,
        color: '#1ED760',
    };

    return (
      <span>
        <FontAwesomeIcon icon={faSpotify} style={style} />
      </span>
    );
}
