import _ from 'lodash';
import { EventObject, InvokeConfig, Machine, RaiseAction, SendAction } from 'xstate';
import { raise } from 'xstate/lib/actions';

import Log from '../common/Log';

const Logc = Log.getLogger('SpofitySM', '#1DB954', 'background-color: #191414;');

const BACKEND_API_BASEURL = 'https://localhost:8080/api';
const LOCALSTORAGE_SPOTIFY_TOKEN = 'aleab.acav.spotify';

enum SsmState {
    Unknown = 'Unknown',
    NoLsNoToken = 'NoLsNoToken',
    NoLsOldToken = 'NoLsOldToken',
    NoLsNewToken = 'NoLsNewToken',
    Ls = 'Ls',
    LsIdle = 'LsIdle',
}

enum SsmEvent {
    Initialize = 'Initialize',                                      // 0 -> {1|2|4}
    EnteredToken = 'EnteredToken',                                  // 1 -> 3
    ErrorGettingSpotifyToken = 'ErrorGettingSpotifyToken',          // {2,3} -> 1
    InvalidToken = 'InvalidToken',                                  // 2 -> 1
    GotSpotifyToken = 'GotSpotifyToken',                            // {2,3} -> 4
    SpotifyTokenRefreshed = 'SpotifyTokenRefreshed',                // 4 -> 4
    ErrorWhileRefreshingSpotifyToken = 'ErrorWhileRefreshingToken', // 4 -> 2
    LsIdle = 'LsIdle',                                              // 4 -> 5
    SpotifyTokenExpired = 'SpotifyTokenExpired',                    // 5 -> 4
}

interface SsmContext {
    token: { current: string | null };
    spotifyToken?: SpotifyToken;
}

function isValidLsToken(lsToken: any): boolean {
    return _.isObjectLike(lsToken) && lsToken['access_token'] && lsToken['refresh_token'] && lsToken['expires_at'];
}

/**
 * Exchange the given encrypted token with a valid Spotify token (AT+RF).
 * If the API returns successfully, this function will store the token object in the LS.
 */
async function decryptToken(token: string): Promise<[Response, RaiseAction<EventObject> | SendAction<unknown, EventObject> | undefined]> {
    Logc.debug('Exchanging encrypted token...');
    const res = await fetch(`${BACKEND_API_BASEURL}/token`, {
        method: 'POST',
        body: new URLSearchParams({ token }),
    });
    let target: RaiseAction<EventObject> | SendAction<unknown, EventObject> | undefined;
    if (res.status === 200) {
        target = await res.json().then(json => {
            if (!isValidLsToken(json)) {
                Log.error('The backend returned an invalid decrypted token (!?):', json);
                return raise(SsmEvent.ErrorGettingSpotifyToken);
            }

            Logc.debug('Got Spotify token:', json);
            window.localStorage.setItem(LOCALSTORAGE_SPOTIFY_TOKEN, JSON.stringify(json));
            return raise(SsmEvent.GotSpotifyToken);
        });
    }
    return [ res, target ];
}

const SpotifyStateMachine = Machine<SsmContext>({
    id: 'spotify',
    initial: SsmState.Unknown,
    entry(ctx) {
        Logc.info('Created!');
        const lsSpotifyToken = JSON.parse(window.localStorage.getItem(LOCALSTORAGE_SPOTIFY_TOKEN) ?? 'null');
        if (isValidLsToken(lsSpotifyToken)) {
            ctx.spotifyToken = lsSpotifyToken;
        } else {
            ctx.spotifyToken = undefined;
            window.localStorage.removeItem(LOCALSTORAGE_SPOTIFY_TOKEN);
        }
    },
    states: {
        // 0)
        [SsmState.Unknown]: {
            entry: () => Logc.debug('~> (0)'),
            on: {
                [SsmEvent.Initialize]: [
                    { actions: 'logInitializationContext', target: SsmState.Ls, cond: 'hasLsToken' },
                    { actions: 'logInitializationContext', target: SsmState.NoLsOldToken, cond: 'hasToken' },
                    { actions: 'logInitializationContext', target: SsmState.NoLsNoToken },
                ],
            },
        },

        // 1) In this state we chill and wait for the user to enter a token (encrypted).
        [SsmState.NoLsNoToken]: {
            entry: () => {
                Logc.debug('~> (1)');
                Logc.debug('Waiting for user to enter a token.');
            },
            on: {
                [SsmEvent.EnteredToken]: SsmState.NoLsNewToken,
            },
        },

        // 2) In this state we *should* ignore the token found in the settings, because it is probably old or it leaked from sharing a preset,
        //    and go straight back to (1). We hit the backend first though, just in case.
        // !! This state's transitions are automatic and should not require external events!
        [SsmState.NoLsOldToken]: {
            invoke: {
                id: '2_fetchToken',
                src: async ctx => {
                    Logc.debug('~> (2)');
                    try {
                        const [ res, target ] = await decryptToken((ctx.token.current!));
                        if (target !== undefined) return target;

                        if (res.status === 403) {
                            return raise(SsmEvent.InvalidToken);
                        }
                        if (res.status !== 200) {
                            return res.text().then(text => {
                                Log.error(`The backend returned ${res.status}`, { body: text });
                                return raise(SsmEvent.ErrorGettingSpotifyToken);
                            });
                        }
                    } catch (err) {
                        Log.error(err);
                        return raise(SsmEvent.ErrorGettingSpotifyToken);
                    }
                    return undefined;
                },
                onDone: [
                    {
                        target: SsmState.Ls,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.GotSpotifyToken,
                    },
                    {
                        target: SsmState.NoLsNoToken,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.ErrorGettingSpotifyToken,
                    },
                    {
                        target: SsmState.NoLsNoToken,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.InvalidToken,
                    },
                    { actions: (_ctx, event) => Logc.warn('(2) Unexpected event:', event) },
                ],
            },
        },

        // 3) In this state we should ask the backend to decrypt the newly received token
        //    and proceed to (4) once we receive the decrypted object, or go to (1) in case of errors.
        // !! This state's transitions are automatic and should not require external events!
        [SsmState.NoLsNewToken]: {
            invoke: {
                id: '3_fetchToken',
                src: async ctx => {
                    Logc.debug('~> (3)');
                    try {
                        const [ res, target ] = await decryptToken((ctx.token.current!));
                        if (target !== undefined) return target;

                        if (res.status !== 200) {
                            return res.text().then(text => {
                                Log.error(`The backend returned ${res.status}`, { body: text });
                                return raise(SsmEvent.ErrorGettingSpotifyToken);
                            });
                        }
                    } catch (err) {
                        Log.error(err);
                        return raise(SsmEvent.ErrorGettingSpotifyToken);
                    }
                    return undefined;
                },
                onDone: [
                    {
                        target: SsmState.NoLsNoToken,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.ErrorGettingSpotifyToken,
                    },
                    {
                        target: SsmState.Ls,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.GotSpotifyToken,
                    },
                    { actions: (_ctx, event) => Logc.warn('(3) Unexpected event:', event) },
                ],
            },
        },

        // 4) In this state we have a valid token object in the LS; we need to check if it's expired and in that case refresh it.
        // !! This state's transitions are automatic and should not require external events!
        [SsmState.Ls]: {
            invoke: {
                id: '4',
                src: async ctx => {
                    Logc.debug('~> (4)');
                    const spotifyToken: SpotifyToken = JSON.parse(window.localStorage.getItem(LOCALSTORAGE_SPOTIFY_TOKEN)!);
                    if (spotifyToken.expires_at - 10 * 1000 > Date.now()) {
                        // All good, we can idle
                        ctx.spotifyToken = spotifyToken;
                        return raise(SsmEvent.LsIdle);
                    }

                    // Refresh the token
                    try {
                        const res = await fetch(`${BACKEND_API_BASEURL}/refresh`, {
                            method: 'POST',
                            body: new URLSearchParams({ refresh_token: spotifyToken.refresh_token }),
                        });

                        if (res.status !== 200) {
                            res.text().then(text => {
                                Log.error(`The backend returned ${res.status}`, { body: text });
                                raise(SsmEvent.ErrorWhileRefreshingSpotifyToken);
                            });
                        }

                        // 200 - Store the new token in the LS
                        return res.json().then(json => {
                            if (!json['access_token'] || !json['expires_at']) {
                                Log.error('The backend returned an invalid refreshed token (!?):', json);
                                return raise(SsmEvent.ErrorWhileRefreshingSpotifyToken);
                            }

                            spotifyToken.access_token = json['access_token'];
                            spotifyToken.expires_at = Number(json['expires_at']);
                            window.localStorage.setItem(LOCALSTORAGE_SPOTIFY_TOKEN, JSON.stringify(spotifyToken));
                            return raise(SsmEvent.SpotifyTokenRefreshed);
                        });
                    } catch (err) {
                        Log.error(err);
                        return raise(SsmEvent.ErrorWhileRefreshingSpotifyToken);
                    }
                },
                onDone: [
                    {
                        target: SsmState.LsIdle,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.LsIdle,
                    },
                    {
                        // Re-enter in this state recursively until we get to LsIdle (i.e. until we get an unexpired token)
                        target: SsmState.Ls,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.SpotifyTokenRefreshed,
                    },
                    {
                        target: SsmState.NoLsOldToken,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.ErrorWhileRefreshingSpotifyToken,
                        actions: ctx => {
                            window.localStorage.removeItem(LOCALSTORAGE_SPOTIFY_TOKEN);
                            delete ctx.spotifyToken;
                        },
                    },
                    { actions: (_ctx, event) => Logc.warn('(4) Unexpected event:', event) },
                ],
            },
        },

        // 5) Idle
        [SsmState.LsIdle]: {
            entry: () => Logc.debug('~> (5)'),
            on: {
                [SsmEvent.SpotifyTokenExpired]: SsmState.Ls,
            },
        },
    },
}, {
    actions: {
        logInitializationContext: ctx => {
            Logc.debug('Initialization context:', { token: ctx.token.current, spotifyToken: ctx.spotifyToken });
            Logc.info('Initialized!');
        },
    },
    guards: {
        hasToken: ctx => !_.isEmpty(ctx.token.current),
        hasLsToken: ctx => isValidLsToken(ctx.spotifyToken),
    },
});

export {
    SsmState as SpotifyStateMachineState,
    SsmEvent as SpotifyStateMachineEvent,
};
export default SpotifyStateMachine;
