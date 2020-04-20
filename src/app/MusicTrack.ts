export default interface MusicTrack {
    readonly title: string | undefined;
    readonly album: string | undefined;
    readonly artists: string[] | undefined;
}

function getHashCode(...args: string[]) {
    const s = args.join('.');
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        const character = s.charCodeAt(i);
        hash = ((hash << 5) - hash) + character;
        hash &= hash; // Convert to 32bit integer
    }
    return hash;
}

export function getTrackHashCode(track: MusicTrack) {
    const _title = track.title ?? '';
    const _album = track.album ?? '';
    const _artist = track.artists !== undefined && track.artists.length > 0 ? track.artists[0] : '';
    return getHashCode(_title, _album, _artist);
}

export function getAlbumHashCode(track: MusicTrack) {
    const _album = track.album ?? '';
    const _artist = track.artists !== undefined && track.artists.length > 0 ? track.artists[0] : '';
    return getHashCode(_album, _artist);
}
