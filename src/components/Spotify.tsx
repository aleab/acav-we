/* eslint-disable camelcase */

import _ from 'lodash';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';

import Log from '../common/Log';
import { checkInternetConnection } from '../common/Network';
import SpotifyStateMachine, { SpotifyStateMachineEvent, SpotifyStateMachineState } from '../app/SpotifyStateMachine';
import WallpaperContext from '../app/WallpaperContext';

import SpotifyOverlayIcon from './SpotifyOverlayIcon';
import SpotifyOverlaySongInfo from './SpotifyOverlaySongInfo';

const Logc = Log.getLogger('Spofity', '#1DB954');

export default function Spotify() {
    const context = useContext(WallpaperContext);
    const token = useRef(context!.wallpaperProperties.spotify.token);

    // ===============
    //  STATE MACHINE
    // ===============
    const [ state, send, service ] = useMachine(SpotifyStateMachine.withContext({ token }));
    useEffect(() => {
        send(SpotifyStateMachineEvent.Init);

        Logc.info("Registering StateMachine's state listener...");
        const timeoutIds = new Map<string, number>();

        const stateListener = service.subscribe(newState => {
            switch (newState.value) {
                case SpotifyStateMachineState.S5HasATIdle: {
                    const expiresIn = (newState.context.spotifyToken!.expires_at - Date.now() - 10 * 1000) || 0;
                    const timeout = expiresIn >= 0 ? expiresIn : 0;

                    clearTimeout(timeoutIds.get('refreshTimeoutId'));
                    const refreshTimeoutId = setTimeout((() => {
                        timeoutIds.delete('refreshTimeoutId');
                        send(SpotifyStateMachineEvent.SpotifyTokenExpired);
                    }) as TimerHandler, timeout);
                    timeoutIds.set('refreshTimeoutId', refreshTimeoutId);

                    Logc.debug(`Scheduled next token refresh in ${Math.round(timeout / 1000)} seconds.`);
                }
                break;

                case SpotifyStateMachineState.S6CantGetTokenErrorIdle:
                    // TODO: Handle state 6
                    break;

                case SpotifyStateMachineState.S7RetryWaiting:
                    // TODO: Handle state 7
                    break;

                case SpotifyStateMachineState.SNNoInternetConnection: {
                    const onsuccess = () => send(SpotifyStateMachineEvent.InternetConnectionRestored);
                    const onfail = () => {
                        clearTimeout(timeoutIds.get('retryTimeoutId'));
                        const retryTimeoutId = setTimeout((() => {
                            timeoutIds.delete('retryTimeoutId');
                            checkInternetConnection(onsuccess, onfail);
                        }) as TimerHandler, 2 * 1000);
                        timeoutIds.set('retryTimeoutId', retryTimeoutId);
                    };
                    checkInternetConnection(onsuccess, onfail);
                }
                break;

                default: break;
            }
        });

        return () => {
            stateListener.unsubscribe();
            timeoutIds.forEach((tid, tname) => {
                clearTimeout(tid);
                Logc.debug(`Timeout cancelled: ${tname} (#${tid})`);
            });
        };
    }, [ send, service ]);

    // =====================
    //  PROPERTIES LISTENER
    // =====================
    useEffect(() => {
        Logc.info('Registering onUserPropertiesChanged callback...');
        const userPropertiesChangedCallback = (args: UserPropertiesChangedEventArgs) => {
            if (args.newProps.spotify?.token !== undefined) {
                token.current = args.newProps.spotify.token;
                if (token.current) {
                    send(SpotifyStateMachineEvent.UserEnteredToken);
                }
            }
        };

        context?.wallpaperEvents.onUserPropertiesChanged.subscribe(userPropertiesChangedCallback);
        return () => {
            context?.wallpaperEvents.onUserPropertiesChanged.unsubscribe(userPropertiesChangedCallback);
        };
    }, [ context, send ]);

    // =========
    //  OVERLAY
    // =========
    // currentlyPlaying is undefined until the first refresh; it's null when no track is playing
    const [ currentlyPlaying, setCurrentlyPlaying ] = useState<SpotifyCurrentlyPlayingObject | null | undefined>(undefined);
    const setCurrentlyPlayingAction = useCallback((prev: SpotifyCurrentlyPlayingObject | null | undefined, current: SpotifyCurrentlyPlayingObject | null) => {
        const newUrl = (current?.item?.external_urls?.['spotify'] ?? current?.item?.uri);
        if (newUrl !== (prev?.item?.external_urls?.['spotify'] ?? prev?.item?.uri)) {
            Logc.debug('Currently playing:', current);
        }
        return current;
    }, []);
    useEffect(() => {
        // TODO: Implement dynamically changing interval.
        //       - previous playing state; is it paused now? is Spotify even open?
        //       - user is changing track; there's probably gonna be some flat/zero sample values
        const INTERVAL = 2 * 1000;
        let timeoutId = 0;
        let cancel = false;

        if (state.value === SpotifyStateMachineState.S5HasATIdle) {
            Logc.debug('Currently-playing loop started.');
            const refreshLoop = async () => {
                if (!state.context.spotifyToken || state.context.spotifyToken.expires_at < Date.now()) {
                    send(SpotifyStateMachineEvent.SpotifyTokenExpired);
                } else {
                    // https://developer.spotify.com/documentation/web-api/reference/player/get-the-users-currently-playing-track/
                    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing?market=from_token', {
                        method: 'GET',
                        headers: {
                            Accept: 'application/json',
                            Authorization: `Bearer ${state.context.spotifyToken.access_token}`,
                        },
                    }).catch(err => {
                        // TODO: No internet connection ?
                        return null;
                    });

                    if (cancel) return;
                    if (!res) {
                        send(SpotifyStateMachineEvent.NoInternetConnection);
                        return;
                    }

                    timeoutId = setTimeout(refreshLoop as TimerHandler, INTERVAL);
                    switch (res.status) {
                        case 200:
                            res.json().then((json: SpotifyCurrentlyPlayingObject) => {
                                setCurrentlyPlaying(prev => setCurrentlyPlayingAction(prev, json));
                            });
                            break;

                        case 204: // No track playing or private session
                            setCurrentlyPlaying(prev => setCurrentlyPlayingAction(prev, null));
                            break;

                        case 401: // The token has expired; it has NOT been revoked: generally a revoked token continues to work until expiration
                            res.json().then(json => Logc.warn('/currently-playing returned 401:', json));
                            clearTimeout(timeoutId);
                            send(SpotifyStateMachineEvent.SpotifyTokenExpired);
                            break;

                        case 429: { // Rate limit
                                // TODO: Display some message or informational icon about rate limiting?
                                const retryAfterSeconds = Number(res.headers.get('Retry-After') ?? 4) + 1;
                                Logc.warn(`Rate Limit reached; retry after ${retryAfterSeconds}s!`);
                                clearTimeout(timeoutId);
                                timeoutId = setTimeout(refreshLoop as TimerHandler, retryAfterSeconds * 1000);
                            }
                            break;

                        default:
                            setCurrentlyPlaying(prev => setCurrentlyPlayingAction(prev, null));
                            res.json().then(json => Logc.error(`/currently-playing returned ${res.status}:`, json));
                            break;
                    }
                }
            };

            refreshLoop();
        }

        return () => {
            if (timeoutId !== 0) {
                cancel = true;
                clearTimeout(timeoutId);
                Logc.debug('Currently-playing loop stopped.');
            }
        };
    }, [ send, setCurrentlyPlayingAction, state.context.spotifyToken, state.value ]);

    const style = {
        bottom: 42,
        right: 0,
        fontSize: 14,
        backgroundColor: 'rgba(6,70,50,0.6)',
    };

    switch (state.value) {
        case SpotifyStateMachineState.S4CheckingAT:
        case SpotifyStateMachineState.S5HasATIdle:
            return currentlyPlaying !== undefined ? (
              <div id="spotify" className="d-flex align-items-center overlay overflow-hidden" style={style}>
                <SpotifyOverlayIcon />
                <SpotifyOverlaySongInfo currentlyPlaying={currentlyPlaying} width={160} color="#FFFFFF" />
              </div>
            ) : null;

        default: return null;
    }
}
