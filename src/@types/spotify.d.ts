/* eslint-disable camelcase */

type SpotifyToken = { access_token: string; refresh_token: string; expires_at: number; };

type SpotifyContext = {
    /** The uri of the context. */
    uri: string;
    /** The href of the context, or null if not available. */
    href: string | null;
    /** The external_urls of the context, or null if not available. */
    external_urls: { [name: string]: string; } | null;
    /** The object type of the item’s context. */
    type: 'album' | 'artist' | 'playlist';
};

type SpotifyCurrentlyPlayingObject = {
    context: SpotifyContext | null;
    /** Unix Millisecond Timestamp when data was fetched. */
    timestamp: number;
    /** Progress into the currently playing track. Can be null. */
    progress_ms: number | null;
    /** If something is currently playing. */
    is_playing: boolean;
    /** The currently playing track. Can be null. */
    item: SpotifyTrack | null;
    /** The object type of the currently playing item. */
    currently_playing_type: 'track' | 'episode' | 'ad' | 'unknown';
};

// track object (full)
type SpotifyTrack = {
    /** The album on which the track appears. */
    album: SpotifyAlbum;
    /** The artists who performed the track. */
    artists: Array<SpotifyArtist>;
    /** A list of the countries in which the track can be played, identified by their ISO 3166-1 alpha-2 code. */
    available_markets: Array<string>;
    /** The disc number */
    disc_number: number;
    /** The track length in milliseconds. */
    duration_ms: number;
    /** Whether or not the track has explicit lyrics */
    explicit: boolean;
    /** Known external URLs for this track. */
    external_urls: { [name: string]: string; };
    /** A link to the Web API endpoint providing full details of the track. */
    href: string;
    /** The Spotify ID for the track. */
    id: string;
    /** If true, the track is playable in the given market. Otherwise false. */
    is_playable: boolean;
    /** The name of the track. */
    name: string;
    /** The popularity of the track. The value will be between 0 and 100. */
    popularity: number;
    /** The number of the track. If an album has several discs, the track number is the number on the specified disc. */
    track_number: number;
    /** The Spotify URI for the track. */
    uri: string;
    /** Whether or not the track is from a local file. */
    is_local: boolean;
};

// album object (simplified)
type SpotifyAlbum = {
    artists: Array<SpotifyArtist>;
    available_markets: Array<string>;
    external_urls: { [name: string]: string; };
    href: string;
    id: string;
    images: Array<string>;
    name: string;
    release_date: string;
    release_date_precision: 'year' | 'month' | 'day';
    uri: string;
};

// artist object (simplified)
type SpotifyArtist = {
    external_urls: { [name: string]: string; };
    href: string;
    id: string;
    name: string;
    uri: string;
};
