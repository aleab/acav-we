import _ from 'lodash';
import { AnyEventObject, EventObject, Machine, RaiseAction, SendAction } from 'xstate';
import { raise } from 'xstate/lib/actions';

import Log from '../common/Log';

const Logc = Log.getLogger('SpofitySM', '#1DB954', 'background-color: #191414;');

const BACKEND_API_BASEURL = 'https://localhost:8080/api';
const LOCALSTORAGE_SPOTIFY_TOKEN = 'aleab.acav.spotify';

// ======================
//  FINITE STATE MACHINE
// ======================
// (0) Unknown initial state
// (1) No encrypted token, no AT in LS  –  wait for user to enter token
// (2) Old encrypted token, no AT in LS  –  (transient state)
// (3) New encrypted token, no AT in LS  –  hit the backend to decrypt the token
// (4) AT in LS - checking AT and refreshing it if necessary
// (5) Idle  –  wait for external token-expired event
// (6) Idle after getting an invalid Spotify token from (3) or 500  –  wait for user to enter a new token
// (7) Waiting before retrying refresh in state (4)
// (N) No internet connection
//
//         ( 0 ) ———> { 1|2|4 }
//           ^
//           |
//         ( N ) <——— { 3,4,5 }
//
//                         ( 1 ) <------------- ( 2 ) <————————————.
//                          ^ |                   ^                |
//                          | |  user             |   error        |
//                  400|403 | | entered           |   while        |
//                          | |  token            | refreshing     |  access token
//                          | |                   |                |  is not valid
//               (error) ⌒ | V                   |  ⌒ refreshed  |     anymore
//                       ⤿ ( 3 ) —————————————> ( 4 )⤾ ———————————|   (revoked?)
//                          | ^   got at+rt      | ^               |
//          - 500           | |                  | |               |
//          - invalid token | |             idle | | expired       |      ( 4 ) <======> ( 7 )
//          ∠———————————————' |                  V |               |
//     ( 6 ) —————————————————'                 ( 5 ) —————————————'
//               user entered
//                   token
//

enum SsmState {
    S0Unknown = 'S0Unknown',
    S1WaitingUserToken = 'S1WaitingUserToken',
    S2HasOldToken = 'S2HasOldToken',
    S3HasNewToken = 'S3HasNewToken',
    S4CheckingAT = 'S4CheckingAT',
    S5HasATIdle = 'S5HasATIdle',
    S6CantGetTokenErrorIdle = 'S6CantGetTokenErrorIdle',
    S7RetryWaiting = 'S7RetryWaiting',
    SNNoInternetConnection = 'SNNoInternetConnection',
}

enum SsmEvent {
    Init = 'Init',                                                              // 0 -> {1|2|4}
    NoInternetConnection = 'NoInternetConnection',                              // {3,4,5} -> N
    InternetConnectionRestored = 'InternetConnectionRestored',                  // N -> 0
    UserEnteredToken = 'UserEnteredToken',                                      // {1,6} -> 3
    BackendTokenBadRequestOrForbidden = 'BackendTokenBadRequestOrForbidden',    // 3 -> 1
    GotSpotifyToken = 'GotSpotifyToken',                                        // 3 -> 4
    CouldntGetBackendTokenFatalError = 'CouldntGetBackendTokenFatalError',      // 3 -> 6
    ErrorWhileRefreshingSpotifyToken = 'ErrorWhileRefreshingSpotifyToken',      // 4 -> 2
    SpotifyTokenRevoked = 'SpotifyTokenRevoked',                                // {4,5} -> 2
    SpotifyTokenRefreshed = 'SpotifyTokenRefreshed',                            // 4 -> 4
    Idle = 'Idle',                                                              // 4 -> 5
    RefreshTokenAfterSeconds = 'RefreshTokenAfterSeconds',                      // 4 -> 7
    SpotifyTokenExpired = 'SpotifyTokenExpired',                                // 5 -> 4
    WaitEnd = 'WaitEnd',                                                        // 7 -> 4
}

enum SsmAction {
    LogInitializationContext = 'LogInitializationContext',
    RemoveSpotifyToken = 'RemoveSpotifyToken',
}

interface SsmContext {
    token: { current: string | null };
    spotifyToken?: SpotifyToken;
}

function isValidTokenObject(token: any): boolean {
    return _.isObjectLike(token) && token['access_token'] && token['refresh_token'] && token['expires_at'];
}

const SpotifyStateMachine = Machine<SsmContext>({
    id: 'spotify',
    initial: SsmState.S0Unknown,
    entry(ctx) {
        Logc.info('Created!');
        const lsSpotifyToken = JSON.parse(window.localStorage.getItem(LOCALSTORAGE_SPOTIFY_TOKEN) ?? 'null');
        if (isValidTokenObject(lsSpotifyToken)) {
            ctx.spotifyToken = lsSpotifyToken;
        } else {
            ctx.spotifyToken = undefined;
            window.localStorage.removeItem(LOCALSTORAGE_SPOTIFY_TOKEN);
        }
    },
    states: {
        // 0)
        [SsmState.S0Unknown]: {
            entry: () => Logc.debug('~> (0)'),
            on: {
                [SsmEvent.Init]: [
                    { actions: SsmAction.LogInitializationContext, target: SsmState.S4CheckingAT, cond: 'hasLsToken' },
                    { actions: SsmAction.LogInitializationContext, target: SsmState.S2HasOldToken, cond: 'hasToken' },
                    { actions: SsmAction.LogInitializationContext, target: SsmState.S1WaitingUserToken },
                ],
            },
        },

        // 1) In this state we chill and wait for the user to enter a token (encrypted).
        [SsmState.S1WaitingUserToken]: {
            entry: () => {
                Logc.debug('~> (1)');
                Logc.debug('Waiting for user to enter a token.');
            },
            on: {
                [SsmEvent.UserEnteredToken]: SsmState.S3HasNewToken,
            },
        },

        // 2) In this state we ignore the token found in the settings, because it is
        //    probably old or it leaked from sharing a preset, and go straight back to (1).
        // !! This state's transitions are automatic and should not require external events!
        [SsmState.S2HasOldToken]: {
            entry: () => Logc.debug('~> (2)'),
            on: {
                '': SsmState.S1WaitingUserToken,
            },
        },

        // 3) In this state we should ask the backend to decrypt the newly received token
        //    and proceed to (4) once we receive the decrypted object, or go to (1|6) in case of errors.
        // !! This state's transitions are automatic and should not require external events!
        [SsmState.S3HasNewToken]: {
            invoke: {
                id: '3_fetchToken',
                src: async ctx => {
                    Logc.debug('~> (3)');
                    async function fetchToken(retry: number = 3): Promise<RaiseAction<EventObject> | SendAction<unknown, EventObject>> {
                        try {
                            const res = await fetch(`${BACKEND_API_BASEURL}/token`, {
                                method: 'POST',
                                body: new URLSearchParams({ token: ctx.token.current! }),
                            });

                            switch (res.status) {
                                case 200:
                                    return await res.json().then(json => {
                                        if (!isValidTokenObject(json)) {
                                            Log.error('The backend returned an invalid token (!?):', json);
                                            return raise(SsmEvent.CouldntGetBackendTokenFatalError);
                                        }

                                        Logc.debug('Received a valid token:', json);
                                        window.localStorage.setItem(LOCALSTORAGE_SPOTIFY_TOKEN, JSON.stringify(json));
                                        return raise(SsmEvent.GotSpotifyToken);
                                    });

                                case 400: // token was null|undefined|'' or not a valid encrypted token at all
                                case 403: // token is old
                                    return raise(SsmEvent.BackendTokenBadRequestOrForbidden);

                                case 500: // internal server error
                                    return raise(SsmEvent.CouldntGetBackendTokenFatalError);

                                default:
                                    return res.text().then(body => {
                                        Log.error(`The backend returned ${res.status}:`, { body });
                                        return raise(SsmEvent.CouldntGetBackendTokenFatalError);
                                    });
                            }
                        } catch (err) {
                            if (retry <= 0) {
                                Log.error(err);
                                return raise(SsmEvent.NoInternetConnection);
                            }
                            // TODO: Is it fine to sleep? Does it block everything?
                            return new Promise(resolve => setTimeout(resolve, 1000)).then(() => fetchToken(retry - 1));
                        }
                    }
                    return fetchToken();
                },
                onDone: [
                    {
                        target: SsmState.S1WaitingUserToken,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.BackendTokenBadRequestOrForbidden,
                    },
                    {
                        target: SsmState.S4CheckingAT,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.GotSpotifyToken,
                    },
                    {
                        target: SsmState.S6CantGetTokenErrorIdle,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.CouldntGetBackendTokenFatalError,
                    },
                    {
                        target: SsmState.SNNoInternetConnection,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.NoInternetConnection,
                    },
                    { actions: (_ctx, event) => Logc.warn('(3) Unexpected event:', _.cloneDeep(event)) },
                ],
            },
            on: {
                [SsmEvent.NoInternetConnection]: SsmState.SNNoInternetConnection,
            },
        },

        // 4) In this state we have a valid token object in the LS; we need to check if it's expired and in that case refresh it.
        // !! This state's transitions are automatic and should not require external events!
        [SsmState.S4CheckingAT]: {
            invoke: {
                id: '4',
                src: async ctx => {
                    Logc.debug('~> (4)');
                    const spotifyToken: SpotifyToken = JSON.parse(window.localStorage.getItem(LOCALSTORAGE_SPOTIFY_TOKEN)!);
                    if (spotifyToken.expires_at - 10 * 1000 > Date.now()) {
                        // All good, we can idle
                        ctx.spotifyToken = spotifyToken;
                        return raise(SsmEvent.Idle);
                    }

                    // Refresh the token
                    async function fetchRefresh(retry: number = 3): Promise<RaiseAction<EventObject> | SendAction<unknown, EventObject>> {
                        try {
                            const res = await fetch(`${BACKEND_API_BASEURL}/refresh`, {
                                method: 'POST',
                                body: new URLSearchParams({ refresh_token: spotifyToken.refresh_token }),
                            });

                            switch (res.status) {
                                case 200:
                                    return res.json().then(json => {
                                        if (!json['access_token'] || !json['expires_at']) {
                                            Log.error('The backend returned an invalid refreshed token object (!?):', json);
                                            return raise(SsmEvent.ErrorWhileRefreshingSpotifyToken);
                                        }

                                        spotifyToken.access_token = json['access_token'];
                                        spotifyToken.expires_at = Number(json['expires_at']);
                                        window.localStorage.setItem(LOCALSTORAGE_SPOTIFY_TOKEN, JSON.stringify(spotifyToken));
                                        return raise(SsmEvent.SpotifyTokenRefreshed);
                                    });

                                case 400:
                                    return res.text().then(body => {
                                        if (body === '') {
                                            return raise(SsmEvent.ErrorWhileRefreshingSpotifyToken);    // refresh_token is null|undefined|''
                                        }
                                        Log.error('The backend returned 400:', JSON.parse(body));
                                        return raise(SsmEvent.ErrorWhileRefreshingSpotifyToken);        // Spotify's 400: not sure what it could mean
                                    });

                                case 401: // unauthorized: the user revoked authorization
                                    return raise(SsmEvent.SpotifyTokenRevoked);

                                case 429: // rate limit (Spotify's)
                                    return raise({
                                        type: SsmEvent.RefreshTokenAfterSeconds,
                                        seconds: Number(res.headers.get('Retry-After') ?? 4) + 1,
                                        status: 429,
                                    } as AnyEventObject);

                                case 500: // internal server error (ours or Spotify's)
                                    return raise({
                                        type: SsmEvent.RefreshTokenAfterSeconds,
                                        seconds: 5,
                                        status: 500,
                                    } as AnyEventObject);

                                default:
                                    return res.text().then(body => {
                                        Log.error(`The backend returned ${res.status}:`, { body });
                                        return raise(SsmEvent.ErrorWhileRefreshingSpotifyToken);
                                    });
                            }
                        } catch (err) {
                            if (retry <= 0) {
                                Log.error(err);
                                return new Promise(resolve => setTimeout(resolve, 1000)).then(() => raise(SsmEvent.NoInternetConnection));
                            }
                            return fetchRefresh(retry - 1);
                        }
                    }
                    return fetchRefresh();
                },
                onDone: [
                    {
                        target: SsmState.S2HasOldToken,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.ErrorWhileRefreshingSpotifyToken ||
                                               event.data?.event === SsmEvent.SpotifyTokenRevoked,
                        actions: SsmAction.RemoveSpotifyToken,
                    },
                    {
                        // Re-enter in this state recursively until we get to (5) (i.e. until we get an unexpired token)
                        target: SsmState.S4CheckingAT,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.SpotifyTokenRefreshed,
                    },
                    {
                        target: SsmState.S5HasATIdle,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.Idle,
                    },
                    {
                        target: SsmState.S7RetryWaiting,
                        cond: (_ctx, event) => event.data?.event?.type === SsmEvent.RefreshTokenAfterSeconds,
                    },
                    {
                        target: SsmState.SNNoInternetConnection,
                        cond: (_ctx, event) => event.data?.event === SsmEvent.NoInternetConnection,
                    },
                    { actions: (_ctx, event) => Logc.warn('(4) Unexpected event:', _.cloneDeep(event)) },
                ],
            },
            on: {
                [SsmEvent.NoInternetConnection]: SsmState.SNNoInternetConnection,
            },
        },

        // 5) Idle
        [SsmState.S5HasATIdle]: {
            entry: () => Logc.debug('~> (5)'),
            on: {
                [SsmEvent.SpotifyTokenExpired]: SsmState.S4CheckingAT,
                [SsmEvent.NoInternetConnection]: SsmState.SNNoInternetConnection,
            },
        },

        // 6) We'll reach this state if we get HTTP 500 or an invalid token from the backend server in (3).
        [SsmState.S6CantGetTokenErrorIdle]: {
            entry: () => {
                Logc.debug('~> (6)');
                Logc.debug('Waiting for user to enter a token.');
            },
            on: {
                [SsmEvent.UserEnteredToken]: SsmState.S3HasNewToken,
            },
        },

        // 7) Wait N seconds before retrying the token refresh process (4)
        [SsmState.S7RetryWaiting]: {
            entry: () => Logc.debug('~> (7)'),
            after: [
                {
                    target: SsmState.S4CheckingAT,
                    delay: (_ctx, event) => (event.seconds > 0 ? event.seconds : 5),
                    actions: (_ctx, event) => {
                        // TODO: Remove this action
                        Log.debug('----', _.cloneDeep(event));
                    },
                },
            ],
        },

        [SsmState.SNNoInternetConnection]: {
            entry: () => Logc.debug('~> (N)'),
            on: {
                [SsmEvent.InternetConnectionRestored]: SsmState.S0Unknown,
            },
        },
    },
}, {
    actions: {
        [SsmAction.LogInitializationContext]: ctx => {
            Logc.debug('Initialization context:', { token: ctx.token.current, spotifyToken: ctx.spotifyToken });
            Logc.info('Initialized!');
        },
        [SsmAction.RemoveSpotifyToken]: ctx => {
            window.localStorage.removeItem(LOCALSTORAGE_SPOTIFY_TOKEN);
            delete ctx.spotifyToken;
        },
    },
    guards: {
        hasToken: ctx => !_.isEmpty(ctx.token.current),
        hasLsToken: ctx => isValidTokenObject(ctx.spotifyToken),
    },
});

export {
    SsmState as SpotifyStateMachineState,
    SsmEvent as SpotifyStateMachineEvent,
};
export default SpotifyStateMachine;
