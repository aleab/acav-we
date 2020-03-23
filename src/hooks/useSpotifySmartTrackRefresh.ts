/* eslint-disable camelcase */
/* eslint-disable no-lonely-if */

import _ from 'lodash';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import Log, { Logger } from '../common/Log';
import CircularBuffer from '../common/CircularBuffer';
import { WallpaperContextType } from '../app/WallpaperContext';

const BUFFER_SIZE = 5;
const SILENCE_THRESHOLD = 7.315e-7;

export default function useSpotifySmartTrackRefresh(
    context: WallpaperContextType | undefined,
    smartRefreshMaxRefreshRateMs: number,
    regularRefreshIntervalMs: number,
    spotifyToken: SpotifyToken | undefined,
    canRefresh: () => boolean,
    setCurrentlyPlaying: React.Dispatch<React.SetStateAction<SpotifyCurrentlyPlayingObject | null | undefined>>,
    setLastResponseCode: React.Dispatch<React.SetStateAction<number>>,
    tokenHasExpiredCallback?: () => void,
    fetchErrorCallback?: () => void,
    logger?: Logger,
) {
    const Logc = useMemo(() => (logger !== undefined ? logger : Log.getLogger('useSpotifySmartTrackRefresh', '#1DB954')), [logger]);

    const setCurrentlyPlayingStateAction = useCallback((prev: SpotifyCurrentlyPlayingObject | null | undefined, current: SpotifyCurrentlyPlayingObject | null) => {
        const newUrl = (current?.item?.external_urls?.['spotify'] ?? current?.item?.uri);
        if (newUrl !== (prev?.item?.external_urls?.['spotify'] ?? prev?.item?.uri)) {
            Logc.debug('Currently playing:', current);
        }
        return current;
    }, [Logc]);

    const lastIntervalBasedRefreshTimestamp = useRef(0);
    const lastSmartRefreshTimestamp = useRef(0);
    const rateLimitEndTime = useRef(0);

    useEffect(() => {
        if (context === undefined) return undefined;

        // ========================
        //  Refresh async function
        // ========================
        let disposed = false;
        const refreshTrack = async () => {
            if (!canRefresh()) return;
            if (rateLimitEndTime.current >= Date.now()) return; // Do nothing if we are still rate-limited

            if (!spotifyToken || spotifyToken.expires_at < Date.now()) {
                tokenHasExpiredCallback?.();
            } else {
                // https://developer.spotify.com/documentation/web-api/reference/player/get-the-users-currently-playing-track/
                const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing?market=from_token', {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${spotifyToken.access_token}`,
                    },
                }).catch(err => {
                    return null;
                });

                if (disposed) return;
                if (!res) {
                    fetchErrorCallback?.();
                    return;
                }

                setLastResponseCode(res.status);

                switch (res.status) {
                    case 200:
                        res.json().then((json: SpotifyCurrentlyPlayingObject) => {
                            setCurrentlyPlaying(prev => setCurrentlyPlayingStateAction(prev, json));
                        });
                        break;

                    case 204: // No track playing or private session
                        setCurrentlyPlaying(prev => setCurrentlyPlayingStateAction(prev, null));
                        break;

                    case 401: // The token has expired; it has NOT been revoked: generally a revoked token continues to work until expiration
                        res.json().then(json => Logc.warn('/currently-playing returned 401:', json));
                        tokenHasExpiredCallback?.();
                        break;

                    case 429: { // Rate limit
                        const retryAfterSeconds = Number(res.headers.get('Retry-After') ?? 4) + 1;
                        Logc.warn(`Rate Limit reached; retry after ${retryAfterSeconds}s!`);
                        rateLimitEndTime.current = Date.now() + retryAfterSeconds * 1000;
                        break;
                    }

                    default:
                        setCurrentlyPlaying(prev => setCurrentlyPlayingStateAction(prev, null));
                        res.json().then(json => Logc.error(`/currently-playing returned ${res.status}:`, json));
                        break;
                }
            }
        };

        // ---
        const tryDumbRefresh = (ts: number) => {
            if (ts >= lastIntervalBasedRefreshTimestamp.current + regularRefreshIntervalMs) {
                lastIntervalBasedRefreshTimestamp.current = ts;
                refreshTrack();
            }
        };
        const trySmartRefresh = (ts: number) => {
            if (ts >= lastSmartRefreshTimestamp.current + smartRefreshMaxRefreshRateMs) {
                lastSmartRefreshTimestamp.current = ts;
                lastIntervalBasedRefreshTimestamp.current = ts; // Smart refresh also resets the regular interval
                setTimeout(() => refreshTrack(), 100); // Wait a bit before refresh since the track may not have actually changed yet
            }
        };

        // ========================
        //  onAudioSamplesListener
        // ========================
        let silenceStartTimestamp = 0;
        const latestMeanValues = new CircularBuffer<number>(BUFFER_SIZE);
        const onAudioSamplesListener = (args: AudioSamplesEventArgs) => {
            const timestamp = Date.now();

            // TODO: Median or mean?
            // const rawMean = _.mean(args.rawSamples.raw);
            // latestMeanValues.push(rawMean);
            // if (latestMeanValues.length < latestMeanValues.size) return;

            // const buffer = latestMeanValues.raw.sort((a, b) => a - b).slice(0, latestMeanValues.size - Math.round(0.15 * latestMeanValues.size)); // Ignore top 15%
            // const k = Math.median(buffer, true);
            const k = args.mean;

            if (silenceStartTimestamp > 0) {
                //>There was silence...
                if (k <= SILENCE_THRESHOLD) {
                    //>There is still silence...
                    // Do nothing: probably nothing is playing and we don't want to trigger unnecessay updates
                } else {
                    //>There's no silence anymore...
                    // Refresh track. There's no need to worry about double updates for the same transition (i.e. no-silence [1]> silence [2]> no-silence)
                    // because `smartRefreshMaxRefreshRateMs` will most likely prevent that.
                    silenceStartTimestamp = 0;
                    trySmartRefresh(timestamp);
                }
            } else {
                //>There was no silence...
                if (k <= SILENCE_THRESHOLD) {
                    //>There is silence now...
                    // Refresh track. This may still be the same track: padding at the end or random drop in the middle
                    silenceStartTimestamp = timestamp;
                    trySmartRefresh(timestamp);
                } else {
                    //>There's still no silence...
                    // Regular interval-based refresh.
                    tryDumbRefresh(timestamp);
                }
            }
        };
        context.wallpaperEvents.onAudioSamples.subscribe(onAudioSamplesListener);

        return () => {
            disposed = true;
            context.wallpaperEvents.onAudioSamples.unsubscribe(onAudioSamplesListener);
        };
    }, [ Logc, canRefresh, context, fetchErrorCallback, regularRefreshIntervalMs, setCurrentlyPlaying, setCurrentlyPlayingStateAction, setLastResponseCode, smartRefreshMaxRefreshRateMs, spotifyToken, tokenHasExpiredCallback ]);
}
