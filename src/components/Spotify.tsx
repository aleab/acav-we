/* eslint-disable camelcase */

import _ from 'lodash';
import ColorConvert from 'color-convert';
import { RGB } from 'color-convert/conversions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleNotch, faFilter, faPlug, faSkull } from '@fortawesome/free-solid-svg-icons';
import React, { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AnyEventObject } from 'xstate';
import { useMachine } from '@xstate/react';

import Log from '../common/Log';
import { checkInternetConnection } from '../common/Network';
import { calculatePivotTransform } from '../common/Pivot';
import { Position } from '../common/Position';
import { CssBackground, generateCssStyle as generateBackgroundCss } from '../app/BackgroundMode';
import SpotifyOverlayArtType from '../app/SpotifyOverlayArtType';
import SpotifyStateMachine, { CouldntGetBackendTokenFatalErrorEventObject, LOCALSTORAGE_SPOTIFY_TOKEN, RefreshTokenAfterSecondsEventObject, SpotifyStateMachineEvent, SpotifyStateMachineState } from '../app/SpotifyStateMachine';
import WallpaperContext from '../app/WallpaperContext';
import useSpotifySmartTrackRefresh from '../hooks/useSpotifySmartTrackRefresh';
import useUserPropertiesListener from '../hooks/useUserPropertiesListener';
import MusicbrainzClient from '../services/musicbrainz-client';
import MusicbrainzClientCacheDecorator from '../services/musicbrainz-client-cache-decorator';

import SpotifyAlbumArt from './SpotifyAlbumArt';
import SpotifyOverlayError from './SpotifyOverlayError';
import SpotifyOverlayIcon from './SpotifyOverlayIcon';
import SpotifyOverlayProgressBar, { SpotifyOverlayProgressBarProps } from './SpotifyOverlayProgressBar';
import SpotifyOverlaySongInfo from './SpotifyOverlaySongInfo';

const Logc = Log.getLogger('Spofity', '#1DB954');

type OverlayStyle = {
    transform: string,
    left: number;
    top: number;
    maxWidth: number;
    fontSize: number;
    color: string;
};

interface SpotifyProps {
    wallpaperBackground?: CssBackground;
}

export default function Spotify(props: SpotifyProps) {
    const context = useContext(WallpaperContext)!;
    const O = useRef(context.wallpaperProperties.spotify);
    const token = useMemo(() => ({ get current() { return O.current.token; } }), []);

    // TODO: Should this be somewhere else? Singleton service?
    const mbClient = useRef<MusicbrainzClientCacheDecorator | undefined>(undefined);
    useEffect(() => {
        mbClient.current = new MusicbrainzClientCacheDecorator(new MusicbrainzClient(false), {
            cacheName: 'aleab.acav',
            ttlMs: 1000 * 60 * 60 * 24 * 5,
            cacheMaintenanceInterval: 1000 * 60 * 30,
        });
        mbClient.current.init();
        return () => {
            mbClient.current?.dispose();
            mbClient.current = undefined;
        };
    }, []);

    // ========
    //  STYLES
    // ========
    //--art
    const [ showOverlayArt, setShowOverlayArt ] = useState(O.current.art.enabled);
    const [ overlayArtType, setOverlayArtType ] = useState(O.current.art.type);
    const [ overlayArtFetchLocalCovers, setOverlayArtFetchLocalCovers ] = useState(O.current.art.fetchLocalCovers);

    //--overlay
    const [ overlayStyle, setOverlayStyle ] = useReducer((prevStyle: OverlayStyle, newStyle: Partial<OverlayStyle>) => {
        if (_.isMatch(prevStyle, newStyle)) return prevStyle;
        return _.merge({}, prevStyle, newStyle);
    }, {
        transform: calculatePivotTransform(O.current.style.pivot).transform,
        left: window.innerWidth * (O.current.style.left / 100),
        top: window.innerHeight * (O.current.style.top / 100),
        maxWidth: O.current.style.width,
        fontSize: O.current.style.fontSize,
        color: `#${ColorConvert.rgb.hex(O.current.style.textColor as RGB)}`,
    });

    //--background
    const setOverlayBackgroundStyleInit = useCallback(() => {
        return generateBackgroundCss(O.current.style.background.mode, {
            color: O.current.style.background.color as RGB,
            alpha: O.current.style.background.colorAlpha / 100,
            css: O.current.style.background.css,
        });
    }, []);
    const [ overlayBackgroundStyle, setOverlayBackgroundStyle ] = useReducer(setOverlayBackgroundStyleInit, undefined, setOverlayBackgroundStyleInit);

    //--progressBar
    const [ showProgressBar, setShowProgressBar ] = useState(O.current.progressBar.enabled);
    const [ progressBarColor, setProgressBarColor ] = useState(`#${ColorConvert.rgb.hex(O.current.progressBar.color as RGB)}`);
    const [ progressBarPosition, setProgressBarPosition ] = useState(O.current.progressBar.position);

    // ===============
    //  STATE MACHINE
    // ===============
    const [ state, send, service ] = useMachine(SpotifyStateMachine.withContext({ token }));
    useEffect(() => { // window.acav.refreshSpotifyToken()
        window.acav.refreshSpotifyToken = () => {
            const lsSpotifyToken = localStorage.getItem(LOCALSTORAGE_SPOTIFY_TOKEN);
            if (lsSpotifyToken !== null) {
                const spToken: SpotifyToken = JSON.parse(lsSpotifyToken);
                spToken.expires_at = Date.now() + 5;
                localStorage.setItem(LOCALSTORAGE_SPOTIFY_TOKEN, JSON.stringify(spToken));
                service.send(SpotifyStateMachineEvent.SpotifyTokenExpired);
            }
        };
        return () => {
            delete window.acav.refreshSpotifyToken;
        };
    }, [service]);
    useEffect(() => {
        send(SpotifyStateMachineEvent.Init);

        Logc.info("Registering StateMachine's state listener...");
        const timeoutIds = new Map<string, number>();

        const stateListener = service.subscribe(newState => {
            switch (newState.value) {
                case SpotifyStateMachineState.S5HasATIdle: {
                    // Schedule next token refresh
                    const expiresIn = (newState.context.spotifyToken!.expires_at - Date.now() - 10 * 1000) || 0;
                    const timeout = expiresIn >= 0 ? expiresIn : 0;

                    clearTimeout(timeoutIds.get('refreshTimeoutId'));
                    const refreshTimeoutId = setTimeout((() => {
                        timeoutIds.delete('refreshTimeoutId');
                        send(SpotifyStateMachineEvent.SpotifyTokenExpired);
                    }) as TimerHandler, timeout);
                    timeoutIds.set('refreshTimeoutId', refreshTimeoutId);

                    Logc.debug(`Scheduled next token refresh in ${Math.round(timeout / 1000)} seconds.`);
                    break;
                }

                case SpotifyStateMachineState.S6CantGetTokenErrorIdle:
                    break;

                case SpotifyStateMachineState.S7RetryWaiting:
                    break;

                case SpotifyStateMachineState.SNNoInternetConnection: {
                    // Check internet connection loop
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
                    break;
                }

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
    useUserPropertiesListener(p => p.spotify, spotifyProps => {
        if (spotifyProps.token !== undefined && spotifyProps.token) {
            send(SpotifyStateMachineEvent.UserEnteredToken);
        }
        if (spotifyProps.art !== undefined) {
            if (spotifyProps.art.enabled !== undefined) setShowOverlayArt(spotifyProps.art.enabled);
            if (spotifyProps.art.type !== undefined) setOverlayArtType(spotifyProps.art.type);
            if (spotifyProps.art.fetchLocalCovers !== undefined) setOverlayArtFetchLocalCovers(spotifyProps.art.fetchLocalCovers);
        }
        if (spotifyProps.style !== undefined) {
            const s: Partial<OverlayStyle> = {};
            if (spotifyProps.style.pivot !== undefined) s.transform = calculatePivotTransform(spotifyProps.style.pivot).transform;
            if (spotifyProps.style.left !== undefined) s.left = window.innerWidth * (spotifyProps.style.left / 100);
            if (spotifyProps.style.top !== undefined) s.top = window.innerHeight * (spotifyProps.style.top / 100);
            if (spotifyProps.style.width !== undefined) s.maxWidth = spotifyProps.style.width;
            if (spotifyProps.style.fontSize !== undefined) s.fontSize = spotifyProps.style.fontSize;
            if (spotifyProps.style.textColor !== undefined) s.color = `#${ColorConvert.rgb.hex(spotifyProps.style.textColor as RGB)}`;
            if (spotifyProps.style.background !== undefined) setOverlayBackgroundStyle();
            setOverlayStyle(s);
        }
        if (spotifyProps.progressBar !== undefined) {
            if (spotifyProps.progressBar.enabled !== undefined) setShowProgressBar(spotifyProps.progressBar.enabled);
            if (spotifyProps.progressBar.color !== undefined) setProgressBarColor(`#${ColorConvert.rgb.hex(spotifyProps.progressBar.color as RGB)}`);
            if (spotifyProps.progressBar.position !== undefined) setProgressBarPosition(spotifyProps.progressBar.position);
        }
    }, [send]);

    // =========
    //  OVERLAY
    // =========
    // currentlyPlaying is undefined until the first refresh; it's null when no track is playing
    const [ currentlyPlaying, setCurrentlyPlaying ] = useState<SpotifyCurrentlyPlayingObject | null | undefined>(undefined);
    const [ lastResponseCode, setLastResponseCode ] = useState(0);

    const canRefreshTrack = useCallback(() => state.value === SpotifyStateMachineState.S5HasATIdle, [state.value]);
    const tokenHasExpiredCallback = useCallback(() => send(SpotifyStateMachineEvent.SpotifyTokenExpired), [send]);
    const noInternetConnectionCallback = useCallback(() => send(SpotifyStateMachineEvent.NoInternetConnection), [send]);

    useSpotifySmartTrackRefresh(
        context,
        750, // smartRefreshMaxRefreshRateMs
        5 * 1000, // regularRefreshIntervalMs
        state.context.spotifyToken,
        canRefreshTrack,
        setCurrentlyPlaying,
        setLastResponseCode,
        tokenHasExpiredCallback,
        noInternetConnectionCallback,
        Logc,
    );

    // SM and network states
    const isRefreshingToken = useMemo(() => state.value === SpotifyStateMachineState.S4CheckingAT, [state.value]);
    const isRateLimited = useMemo(() => {
        if (lastResponseCode === 429) return true;
        if (state.value !== SpotifyStateMachineState.S7RetryWaiting) return false;
        const stateEvent: AnyEventObject | null | undefined = state.event.data?.event;
        return stateEvent && stateEvent.status === 429;
    }, [ lastResponseCode, state.event.data, state.value ]);
    const isFatalErrorGettingToken = useMemo(() => state.value === SpotifyStateMachineState.S6CantGetTokenErrorIdle, [state.value]);
    const hasNoInternetConnection = useMemo(() => state.value === SpotifyStateMachineState.SNNoInternetConnection, [state.value]);

    // ========
    //  RENDER
    // ========
    const StateIcons = useCallback(() => {
        const stateIconOverlay = (
          <span className="state-icons">
            {isRefreshingToken ? <span><FontAwesomeIcon icon={faCircleNotch} color="hsla(0, 0%, 100%, 0.69)" spin /></span> : null}
            {isRateLimited ? <span><FontAwesomeIcon icon={faFilter} color="hsla(45, 100%, 50%, 0.69)" /></span> : null}
            {isFatalErrorGettingToken ? <span><FontAwesomeIcon icon={faSkull} color="hsla(0, 100%, 32%, 0.69)" /></span> : null}
            {hasNoInternetConnection ? <span><FontAwesomeIcon className="blink" icon={faPlug} color="hsla(0, 100%, 32%, 0.69)" /></span> : null}
          </span>
        );
        return Array.isArray(stateIconOverlay.props.children)
            ? (stateIconOverlay.props.children as Array<any>).filter(x => x !== null && x !== undefined).length > 0 ? stateIconOverlay : null
            : stateIconOverlay.props.children !== null && stateIconOverlay.props.children !== undefined ? stateIconOverlay : null;
    }, [ hasNoInternetConnection, isFatalErrorGettingToken, isRateLimited, isRefreshingToken ]);

    switch (state.value) {
        case SpotifyStateMachineState.S4CheckingAT:
        case SpotifyStateMachineState.S5HasATIdle: {
            if (currentlyPlaying === undefined) return null;
            const spotifyDivProps = {
                id: 'spotify',
                className: 'overlay d-flex flex-column flex-nowrap align-items-start overflow-hidden',
                style: { ...overlayStyle, ...overlayBackgroundStyle },
            };
            const songInfoRowProps = {
                className: 'main d-flex flex-row flex-nowrap align-items-center overflow-hidden',
                style: { maxWidth: overlayStyle.maxWidth },
            };
            const songInfoProps = {
                currentlyPlaying: currentlyPlaying!,
                width: overlayStyle.maxWidth,
                color: overlayStyle.color,
                fontSize: overlayStyle.fontSize,
            };
            const progressBarProps: SpotifyOverlayProgressBarProps = {
                color: progressBarColor,
                isPlaying: currentlyPlaying?.is_playing ?? false,
                durationMs: currentlyPlaying?.item?.duration_ms ?? 0,
                progressMs: currentlyPlaying?.progress_ms ?? 0,
                className: `${progressBarPosition === Position.Top ? 'top' : 'bottom'}`,
            };

            if (currentlyPlaying?.item === null || currentlyPlaying?.item === undefined) {
                // Show only Spotify's icon when no song is playing
                return (
                  <div {...spotifyDivProps}>
                    <SpotifyOverlayIcon background={overlayBackgroundStyle} backgroundBeneath={props.wallpaperBackground} />
                    <StateIcons />
                  </div>
                );
            }

            // No cover art nor icon
            if (!showOverlayArt) {
                return (
                  <div {...spotifyDivProps}>
                    <StateIcons />
                    {showProgressBar ? <SpotifyOverlayProgressBar {...progressBarProps} /> : null}
                    <div {...songInfoRowProps}>
                      <SpotifyOverlaySongInfo {...songInfoProps} style={{ marginLeft: '1em' }} />
                    </div>
                  </div>
                );
            }

            switch (overlayArtType) {
                case SpotifyOverlayArtType.AlbumArt: {
                    const artWidth = 4 * overlayStyle.fontSize - 2 * 0.25 * overlayStyle.fontSize; // calc(4em - 2 * .25em)
                    return (
                      <div {...spotifyDivProps}>
                        <StateIcons />
                        {showProgressBar ? <SpotifyOverlayProgressBar {...progressBarProps} /> : null}
                        <div {...songInfoRowProps}>
                          <SpotifyAlbumArt
                            className="flex-shrink-0" style={{ margin: '.25em' }} width={artWidth}
                            track={currentlyPlaying.item} mbClient={mbClient.current} fetchLocalCovers={overlayArtFetchLocalCovers}
                          />
                          <SpotifyOverlaySongInfo {...songInfoProps} className="align-self-start" style={{ marginLeft: '.25em' }} />
                        </div>
                      </div>
                    );
                }
                case SpotifyOverlayArtType.SpotifyIcon:
                    return (
                      <div {...spotifyDivProps}>
                        <StateIcons />
                        {showProgressBar ? <SpotifyOverlayProgressBar {...progressBarProps} /> : null}
                        <div {...songInfoRowProps}>
                          <SpotifyOverlayIcon background={overlayBackgroundStyle} backgroundBeneath={props.wallpaperBackground} />
                          <SpotifyOverlaySongInfo {...songInfoProps} />
                        </div>
                      </div>
                    );
                default: return null;
            }
        }

        case SpotifyStateMachineState.S6CantGetTokenErrorIdle: {
            const errorMsg = 'Fatal error while exchanging token!';
            const event: CouldntGetBackendTokenFatalErrorEventObject | undefined = state.event.data?.event;
            const secondaryMessages = event?.error ? [event?.error] : [];
            secondaryMessages.push('Enter a new token');
            return (
              <div id="spotify" className="d-flex flex-nowrap align-items-start overlay" style={{ ...overlayStyle, ...overlayBackgroundStyle, width: overlayStyle.maxWidth }}>
                <SpotifyOverlayIcon background={overlayBackgroundStyle} backgroundBeneath={props.wallpaperBackground} />
                <SpotifyOverlayError message={errorMsg} secondaryMessages={secondaryMessages} color={overlayStyle.color} />
                <StateIcons />
              </div>
            );
        }

        case SpotifyStateMachineState.S7RetryWaiting: {
            const errorMsg = "Couldn't refresh token; retrying shortly...";
            const event: RefreshTokenAfterSecondsEventObject | undefined = state.event.data?.event;
            return (
              <div id="spotify" className="d-flex flex-nowrap align-items-start overlay" style={{ ...overlayStyle, ...overlayBackgroundStyle, width: overlayStyle.maxWidth }}>
                <SpotifyOverlayIcon background={overlayBackgroundStyle} backgroundBeneath={props.wallpaperBackground} />
                <SpotifyOverlayError message={errorMsg} secondaryMessages={event?.error ? [event?.error] : undefined} color={overlayStyle.color} />
                <StateIcons />
              </div>
            );
        }

        default: return null;
    }
}
