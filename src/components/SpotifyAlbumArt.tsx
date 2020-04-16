import _ from 'lodash';
import React, { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';

import { CancellationTokenSource } from '../common/CancellationToken';
import { IMusicbrainzClient } from '../services/musicbrainz-client';
import { IMusicbrainzClientCache } from '../services/musicbrainz-client-cache-decorator';

interface SpotifyAlbumArtProps {
    style?: CSSProperties;
    className?: string;
    width: number;
    track: SpotifyTrack | SpotifyLocalTrack;

    mbClient: IMusicbrainzClient | undefined;
    mbClientCache: IMusicbrainzClientCache | undefined;
    fetchLocalCovers: boolean;
}

export default function SpotifyAlbumArt(props: SpotifyAlbumArtProps) {
    const spotifySrc = useMemo(() => {
        if (props.track.is_local) return '';
        // NOTE: Widest image is always first
        const img: SpotifyImage | undefined = _.findLast(props.track.album.images, x => x.width !== null && x.width >= props.width) ?? props.track.album.images[0];
        return img?.url ?? '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ props.track.album.id, props.track.is_local, props.width ]);

    // ==================================================
    //  Fetch cover art for local file using MusicBrainz
    // ==================================================
    const _artists = props.track.artists.join(', ');
    const [ localSrc, setLocalSrc ] = useState<string>('');
    const localTrack = useMemo(() => {
        if (!props.track.is_local) return undefined;
        return {
            title: props.track.name,
            album: props.track.album.name,
            artists: props.track.artists.map(artist => artist.name),
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ _artists, props.track.album.name, props.track.is_local, props.track.name ]);

    const cts = useRef(new CancellationTokenSource());
    useEffect(() => {
        cts.current.cancel();
        cts.current = new CancellationTokenSource();

        if (props.fetchLocalCovers && props.track.is_local && localTrack !== undefined) {
            props.mbClient?.findCoverArtByReleaseGroup(localTrack).then(mbReleaseCoverArts => {
                if (mbReleaseCoverArts === null || mbReleaseCoverArts === undefined || mbReleaseCoverArts.length === 0) {
                    setLocalSrc('');
                } else {
                    // Choose first release for now. TODO: Implement interface to select the preferred release for this album
                    const images = mbReleaseCoverArts[0].cover.slice().sort((a, b) => b.size - a.size); // Sort in descending order by size
                    const img = _.findLast(images, x => x.size !== null && x.size >= props.width) ?? images[0];

                    if (props.mbClientCache !== undefined) {
                        props.mbClientCache.getCachedRealUrl(img.url).then(cachedRedirectedUrl => {
                            if (cts.current.token.isCancelled()) return;
                            if (cachedRedirectedUrl !== undefined) {
                                setLocalSrc(cachedRedirectedUrl);
                            } else {
                                // Get the real redirected url and cache it
                                fetch(img.url).then(res => {
                                    if (cts.current.token.isCancelled()) return;
                                    if (props.mbClientCache !== undefined) {
                                        props.mbClientCache.cacheRealUrl(img.url, res.url);
                                        setLocalSrc(res.url);
                                    }
                                });
                            }
                        });
                    } else {
                        setLocalSrc(img.url);
                    }
                }
            });
        }
        return () => { setLocalSrc(''); };
    }, [ localTrack, props.fetchLocalCovers, props.mbClient, props.mbClientCache, props.track.is_local, props.width ]);

    const src = useMemo(() => (props.track.is_local ? localSrc : spotifySrc), [ localSrc, props.track.is_local, spotifySrc ]);
    const imgStyle: CSSProperties = {
        width: props.width,
        height: props.width,
        objectFit: 'contain',
        backgroundColor: !src ? 'rgba(0, 0, 0, 0.1)' : undefined,
        ...props.style,
    };

    return (
      <img className={props.className} style={imgStyle} src={src} alt="" />
    );
}
