/* eslint-disable camelcase */

import _ from 'lodash';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useMachine } from '@xstate/react';

import Log from '../common/Log';
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
        Logc.info("Registering StateMachine's state listener...");
        let refreshTimeoutId = 0;
        const s = service.subscribe(newState => {
            if (newState.value === SpotifyStateMachineState.LsIdle) {
                const expiresIn = (newState.context.spotifyToken!.expires_at - Date.now() - 10 * 1000) || 0;
                const timeout = expiresIn >= 0 ? expiresIn : 0;
                refreshTimeoutId = setTimeout((() => {
                    send(SpotifyStateMachineEvent.SpotifyTokenExpired);
                }) as TimerHandler, timeout);
                Logc.debug(`Scheduled next token refresh in ${Math.round(timeout / 1000)}s.`);
            }
        });
        return () => {
            s.unsubscribe();
            clearTimeout(refreshTimeoutId);
        };
    }, [ send, service ]);

    // =====================
    //  PROPERTIES LISTENER
    // =====================
    const firstUserPropertiesUpdate = useRef(true);
    useEffect(() => {
        Logc.info('Registering onUserPropertiesChanged callback...');
        const userPropertiesChangedCallback = (args: UserPropertiesChangedEventArgs) => {
            if (args.newProps.spotify?.token !== undefined) {
                token.current = args.newProps.spotify.token;
                if (token.current) {
                    send(SpotifyStateMachineEvent.EnteredToken);
                }
            }

            // Properly initialize the SM only after the user properties are applied
            if (firstUserPropertiesUpdate.current) {
                firstUserPropertiesUpdate.current = false;
                send(SpotifyStateMachineEvent.Initialize);
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
    const [ currentlyPlaying, setCurrentlyPlaying ] = useState<SpotifyCurrentlyPlayingObject | null>(null);
    useEffect(() => {
        const INTERVAL = 2 * 1000;
        let timeoutId = 0;
        if (state.value === SpotifyStateMachineState.Ls || state.value === SpotifyStateMachineState.LsIdle) {
            Logc.info('Starting track refresh loop...');
            const refreshLoop = () => {
                if (!state.context.spotifyToken || state.context.spotifyToken.expires_at < Date.now()) {
                    send(SpotifyStateMachineEvent.SpotifyTokenExpired);
                } else {
                    fetch('https://api.spotify.com/v1/me/player/currently-playing?market=from_token', {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${state.context.spotifyToken.access_token}`,
                        },
                    }).then(res => {
                        if (res.status === 429) { // Rate Limiting
                            // TODO: Display some message or informational icon about rate limiting?
                            const retryAfterSeconds = Number(res.headers.get('Retry-After') ?? 4) + 1;
                            Logc.warn(`Rate Limit reached; retry after ${retryAfterSeconds}s!`);
                            clearTimeout(timeoutId);
                            timeoutId = setTimeout(refreshLoop as TimerHandler, retryAfterSeconds * 1000);
                        } else if (res.status !== 200 && res.status !== 204) {
                            // TODO: Handle responses !== 20*
                            res.json().then(json => {
                                Log.error(`Spotify's /currently-playing returned ${res.status}:`, json);
                            });
                            return null;
                        }
                        return res.json();
                    }).then((json: SpotifyCurrentlyPlayingObject | null) => {
                        setCurrentlyPlaying(prev => {
                            const newUrl = (json?.item?.external_urls?.['spotify'] ?? json?.item?.uri);
                            if (newUrl !== (prev?.item?.external_urls?.['spotify'] ?? prev?.item?.uri)) {
                                Logc.debug('Currently playing:', json?.item);
                            }
                            return json;
                        });
                    });
                    timeoutId = setTimeout(refreshLoop as TimerHandler, INTERVAL);
                }
            };
            timeoutId = setTimeout(refreshLoop as TimerHandler, INTERVAL);
        }

        return () => clearTimeout(timeoutId);
    }, [ send, state.value, state.context.spotifyToken ]);

    const style = {
        bottom: 42,
        right: 0,
        backgroundColor: 'rgba(6,70,50,0.6)',
        width: 200,
        minHeight: '4em',
    };

    switch (state.value) {
        case SpotifyStateMachineState.Ls:
        case SpotifyStateMachineState.LsIdle:
            return (
              <div id="spotify" className="overlay" style={style}>
                <SpotifyOverlayIcon />
                <SpotifyOverlaySongInfo currentlyPlaying={currentlyPlaying} fontSize={14} color="#FFFFFF" />
              </div>
            );

        default: return null;
    }
}
