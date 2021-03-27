/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

import _ from 'lodash';
import React, { CSSProperties, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FaChevronCircleDown } from '../../fa';
import MusicTrack, { getAlbumHashCode } from '../../app/MusicTrack';
import PreferredLocalArtStore from '../../app/PreferredLocalArtStore';
import { CancellationTokenSource } from '../../common/CancellationToken';
import Log from '../../common/Log';
import { IMusicbrainzClient, MusicbrainzReleaseCoverArt } from '../../services/musicbrainz-client';
import { IMusicbrainzClientCache } from '../../services/musicbrainz-client-cache-decorator';

import SpotifyOverlayPreferredLocalArtChooser, { SpotifyOverlayPreferredLocalArtChooserProps } from './SpotifyOverlayPreferredLocalArtChooser';

const Logc = Log.getLogger('SpotifyAlbumArt', '#1DB954');

interface SpotifyAlbumArtProps {
    style?: CSSProperties;
    className?: string;
    width: number;
    track: SpotifyTrack | SpotifyLocalTrack;

    mbClient: IMusicbrainzClient | undefined;
    mbClientCache: IMusicbrainzClientCache | undefined;
    fetchLocalCovers: boolean;

    preferrectLocalArtChooserElementRef: RefObject<HTMLElement>;
    preferrectLocalArtChooserSize: { width: number; height: number };

    onLoad?: React.ReactEventHandler<HTMLImageElement>;
}

function testCachedUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        img.onerror = () => reject();
        img.onload = () => resolve();
        img.src = url;
    });
}

function followRedirectsAndCacheFinalUrl(
    url: string,
    mbClientCache: IMusicbrainzClientCache | undefined,
    cts: React.MutableRefObject<CancellationTokenSource>,
): Promise<string> {
    return new Promise((resolve, reject) => {
        fetch(url).then(res => {
            if (cts.current.token.isCancelled()) {
                reject();
            } else if (mbClientCache !== undefined) {
                mbClientCache.cacheRealUrl(url, res.url);
                resolve(res.url);
            } else {
                reject();
            }
        }).catch(e => reject(e));
    });
}

export default function SpotifyAlbumArt(props: SpotifyAlbumArtProps) {
    const { mbClient, mbClientCache, fetchLocalCovers, preferrectLocalArtChooserElementRef, preferrectLocalArtChooserSize } = props;

    const preferredLocalArtStore = useMemo(() => new PreferredLocalArtStore('aleab.acav.preferred-covers', 1), []);

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

    const [ mbReleaseCoverArts, setMbReleaseCoverArts ] = useState<MusicbrainzReleaseCoverArt[] | null>(null);
    const [ currentMbReleaseCoverArt, setCurrentMbReleaseCoverArt ] = useState<MusicbrainzReleaseCoverArt | null>(null);
    const currentMbReleaseCoverArtId = currentMbReleaseCoverArt?.release ?? null;

    const localTrack = useMemo<MusicTrack | undefined>(() => {
        if (!props.track.is_local) return undefined;
        const _localTrack = {
            title: props.track.name,
            album: props.track.album.name,
            artists: props.track.artists.map(artist => artist.name),
        };
        //Logc.debug('Local track changed:', _localTrack);
        return _localTrack;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ _artists, props.track.album.name, props.track.is_local, props.track.name ]);

    const cts = useRef(new CancellationTokenSource());
    const setLocalCoverArt = useCallback((mbReleaseCoverArt: MusicbrainzReleaseCoverArt | null) => {
        //Logc.debug('Setting local cover art:', _.cloneDeep(mbReleaseCoverArt));
        if (mbReleaseCoverArt === null) {
            setLocalSrc('');
            setCurrentMbReleaseCoverArt(null);
        } else {
            const images = mbReleaseCoverArt.cover.slice().sort((a, b) => b.size - a.size); // Sort in descending order by size
            const image = _.findLast(images, x => x.size !== null && x.size >= props.width) ?? images[0];

            if (mbClientCache !== undefined) {
                mbClientCache.getCachedRealUrl(image.url).then(cachedRedirectedUrl => {
                    //Logc.debug(`Retrieving cached real url of '${image.url}':`, cachedRedirectedUrl);
                    if (cts.current.token.isCancelled()) return;
                    if (cachedRedirectedUrl !== undefined) {
                        // The cached value may become unavailable after a while and return 403;
                        // if that happens, invalidate the cache and fetch a new value from MusicBrainz
                        testCachedUrl(cachedRedirectedUrl).then(() => {
                            setLocalSrc(cachedRedirectedUrl);
                        }).catch(() => {
                            //Logc.debug('Cached url was invalid; fetching new one...');
                            mbClientCache.clearCachedRealUrl(image.url).then(() => {
                                followRedirectsAndCacheFinalUrl(image.url, mbClientCache, cts).then(url => {
                                    setLocalSrc(url);
                                });
                            });
                        });
                    } else {
                        followRedirectsAndCacheFinalUrl(image.url, mbClientCache, cts).then(url => {
                            setLocalSrc(url);
                        });
                    }
                });
            } else {
                setLocalSrc(image.url);
            }

            setCurrentMbReleaseCoverArt(mbReleaseCoverArt);
        }
    }, [ mbClientCache, props.width ]);

    useEffect(() => {
        cts.current.cancel();
        cts.current = new CancellationTokenSource();

        if (fetchLocalCovers && props.track.is_local && localTrack !== undefined) {
            mbClient?.findCoverArtByReleaseGroup(localTrack).then(_mbReleaseCoverArts => {
                //Logc.debug('Fetching local covers:', _.cloneDeep(_mbReleaseCoverArts));
                if (_mbReleaseCoverArts === null || _mbReleaseCoverArts === undefined || _mbReleaseCoverArts.length === 0) {
                    setLocalCoverArt(null);
                    setMbReleaseCoverArts(null);
                } else {
                    preferredLocalArtStore.get(getAlbumHashCode(localTrack)).then(release => {
                        const mbReleaseCoverArt = release === undefined ? _mbReleaseCoverArts[0] : _mbReleaseCoverArts.find(v => v.release === release);
                        setLocalCoverArt(mbReleaseCoverArt ?? _mbReleaseCoverArts[0]);
                        setMbReleaseCoverArts(_mbReleaseCoverArts);
                    });
                }
            });
        }
        return () => { setLocalSrc(''); };
    }, [ fetchLocalCovers, localTrack, mbClient, preferredLocalArtStore, props.track.is_local, setLocalCoverArt ]);

    // <img> attributes
    const src = useMemo(() => (props.track.is_local ? localSrc : spotifySrc), [ localSrc, props.track.is_local, spotifySrc ]);
    const imgStyle: CSSProperties = {
        width: props.width,
        height: props.width,
        objectFit: 'contain',
        backgroundColor: !src ? 'rgba(0, 0, 0, 0.1)' : undefined,
    };

    // ========================================
    //  SpotifyOverlayPreferredLocalArtChooser
    // ========================================
    const [ showPreferredCoverArtChooser, setShowPreferredCoverArtChooser ] = useState(false);
    const choosePreferredArtCallback = useCallback((mbReleaseCoverArt: MusicbrainzReleaseCoverArt) => setLocalCoverArt(mbReleaseCoverArt), [setLocalCoverArt]);

    const canShowPreferredLocalArtChooser = useMemo(() => localTrack !== undefined && mbReleaseCoverArts !== null && mbReleaseCoverArts.length > 1, [ localTrack, mbReleaseCoverArts ]);
    const preferredLocalArtChooserProps = useMemo<SpotifyOverlayPreferredLocalArtChooserProps>(() => ({
        track: localTrack,
        mbReleaseCoverArts,
        currentMbReleaseCoverArt: currentMbReleaseCoverArtId,
        store: preferredLocalArtStore,
        choosePreferredArtCallback,

        width: preferrectLocalArtChooserSize.width,
        maxHeight: preferrectLocalArtChooserSize.height,
        hidden: !showPreferredCoverArtChooser,
        portalElementRef: preferrectLocalArtChooserElementRef,
    }), [ choosePreferredArtCallback, currentMbReleaseCoverArtId, localTrack, mbReleaseCoverArts, preferrectLocalArtChooserElementRef, preferrectLocalArtChooserSize.height, preferrectLocalArtChooserSize.width, preferredLocalArtStore, showPreferredCoverArtChooser ]);

    useEffect(() => {
        // Keep the window open (if it was open to begin with) when the track changes and its cover art can be changed; close it when it cannot be changed.
        if (!canShowPreferredLocalArtChooser) setShowPreferredCoverArtChooser(false);
    }, [canShowPreferredLocalArtChooser]);

    const onClick = useCallback(() => setShowPreferredCoverArtChooser(canShowPreferredLocalArtChooser ? (prev => !prev) : false), [canShowPreferredLocalArtChooser]);

    const classNames: string[] = [];
    if (canShowPreferredLocalArtChooser) classNames.push('has-alt-covers');
    if (props.className) classNames.push(props.className);

    return (
      <>
        <div className={classNames.join(' ')} style={{ ...props.style, lineHeight: 0 }} onClick={onClick}>
          <img style={imgStyle} src={src} alt="" onLoad={props.onLoad} onError={props.onLoad} />
          {canShowPreferredLocalArtChooser ? (
            <span className={showPreferredCoverArtChooser ? 'chevron up' : 'chevron'}>
              <FaChevronCircleDown />
            </span>
          ) : null}
        </div>
        <SpotifyOverlayPreferredLocalArtChooser {...preferredLocalArtChooserProps} />
      </>
    );
}
