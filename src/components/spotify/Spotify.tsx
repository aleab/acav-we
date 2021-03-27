/* eslint-disable camelcase */

import _ from 'lodash';
import ColorConvert from 'color-convert';
import { RGB } from 'color-convert/conversions';
import React, { CSSProperties, RefObject, SyntheticEvent, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AnyEventObject } from 'xstate';
import { useMachine } from '@xstate/react';

import { FaCircleNotch, FaFilter, FaPlug, FaSkull } from '../../fa';

import Log from '../../common/Log';
import { checkInternetConnection } from '../../common/Network';
import { calculatePivotTransform } from '../../common/Pivot';
import { Position } from '../../common/Position';
import { generateCssStyle as generateBackgroundCss } from '../../app/BackgroundMode';
import SpotifyOverlayArtType from '../../app/SpotifyOverlayArtType';
import SpotifyStateMachine, { CouldntGetBackendTokenFatalErrorEventObject, LOCALSTORAGE_SPOTIFY_TOKEN, RefreshTokenAfterSecondsEventObject, SpotifyStateMachineEvent, SpotifyStateMachineState } from '../../app/SpotifyStateMachine';
import WallpaperContext from '../../app/WallpaperContext';
import useClientRect from '../../hooks/useClientRect';
import useSpotifySmartTrackRefresh from '../../hooks/useSpotifySmartTrackRefresh';
import useUserPropertiesListener from '../../hooks/useUserPropertiesListener';
import MusicbrainzClient, { MusicbrainzReleaseCoverArt } from '../../services/musicbrainz-client';
import MusicbrainzClientCacheDecorator from '../../services/musicbrainz-client-cache-decorator';

import SpotifyOverlayContext, { SpotifyOverlayContextType } from './SpotifyOverlayContext';
import SpotifyAlbumArt from './SpotifyAlbumArt';
import SpotifyOverlayError from './SpotifyOverlayError';
import SpotifyOverlayIcon from './SpotifyOverlayIcon';
import SpotifyOverlayProgressBar from './SpotifyOverlayProgressBar';
import SpotifyOverlayContent from './SpotifyOverlayContent';

const Logc = Log.getLogger('Spotify', '#1DB954');

const SPOTIFY_LOGO_HEIGHT = 21;

type OverlayStyle = {
    transform: string,
    left: number;
    top: number;
    maxWidth: number;
    fontSize: number;
    color: string;
};

interface SpotifyProps {
    backgroundElement: RefObject<HTMLElement>;
}

function getOverlayContentMarginLeft(fontSize: number, showOverlayArt: boolean, overlayArtType: SpotifyOverlayArtType, overlayArtPosition: Position) {
    if (!showOverlayArt || overlayArtPosition === Position.Right) {
        return fontSize - 2;
    }

    switch (overlayArtType) {
        case SpotifyOverlayArtType.AlbumArt:
            return 0.25 * fontSize;
        case SpotifyOverlayArtType.SpotifyIcon:
            return undefined;
        default: return undefined;
    }
}
function getOverlayContentMarginRight(fontSize: number, showOverlayArt: boolean, overlayArtType: SpotifyOverlayArtType, overlayArtPosition: Position) {
    if (!showOverlayArt) return undefined;
    if (overlayArtPosition === Position.Right) {
        switch (overlayArtType) {
            case SpotifyOverlayArtType.AlbumArt:
                return 0.25 * fontSize;
            case SpotifyOverlayArtType.SpotifyIcon:
                return undefined;
            default: return undefined;
        }
    }
    return undefined;
}
function getSpotifyLogoMarginLeft(logoHeight: number, albumArtMargin: number, overlayContentMarginLeft: number | undefined, showOverlayArt: boolean, overlayArtType: SpotifyOverlayArtType) {
    if (!showOverlayArt) return Math.max(0, logoHeight / 2 - (overlayContentMarginLeft ?? 0));
    switch (overlayArtType) {
        case SpotifyOverlayArtType.AlbumArt:
            return Math.max(0, logoHeight / 2 - albumArtMargin - (overlayContentMarginLeft ?? 0));
        case SpotifyOverlayArtType.SpotifyIcon:
            return undefined;
        default: return undefined;
    }
}

function spotifyTrackEquals(a: SpotifyTrack, b: SpotifyTrack) {
    if (a.is_local !== b.is_local) return false;
    if (a.is_local && b.is_local) return a.uri === b.uri;
    return a.id === b.id;
}

export default function Spotify(props: SpotifyProps) {
    const context = useContext(WallpaperContext)!;
    const O = useRef(context.wallpaperProperties.spotify);
    const token = useMemo(() => ({ get current() { return O.current.token; } }), []);

    // TODO: Should this be somewhere else? Singleton service?
    const mbClient = useRef<MusicbrainzClientCacheDecorator | undefined>(undefined);
    useEffect(() => {
        mbClient.current = new MusicbrainzClientCacheDecorator(new MusicbrainzClient(process.env.NODE_ENV === 'development'), {
            cacheName: 'aleab.acav.mb-cache',
            ttlMs: Math.round(1000 * 60 * 60 * 24 * O.current.art.fetchLocalCacheMaxAge),
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
    const [ preferMonochromeLogo, setPreferMonochromeLogo ] = useState(O.current.logo.preferMonochrome);
    const [ logoPosition, setLogoPosition ] = useState(O.current.logo.position);
    const [ logoAlignment, setLogoAlignment ] = useState(O.current.logo.alignment);

    //--art
    const [ showOverlayArt, setShowOverlayArt ] = useState(O.current.art.enabled);
    const [ overlayArtType, setOverlayArtType ] = useState(O.current.art.type);
    const [ overlayArtPosition, setOverlayArtPosition ] = useState(O.current.art.position);
    const [ overlayArtFetchLocalCovers, setOverlayArtFetchLocalCovers ] = useState(O.current.art.fetchLocalCovers);
    const [ hideMusicbrainzLogo, setHideMusicbrainzLogo ] = useState(O.current.art.hideMusicbrainzLogo);

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
    const backendUrl = O.current.backendURL ? O.current.backendURL : process.env.BACKEND_API_BASEURL!;
    const [ state, send, service ] = useMachine(SpotifyStateMachine.withContext({ token, backendUrl }));
    useEffect(() => { // window.acav.refreshSpotifyToken()
        window.acav.refreshSpotifyToken = function refreshSpotifyToken() {
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
        if (spotifyProps.backendURL !== undefined) {
            if (spotifyProps.backendURL) {
                // Check if the entered URL is a valid URL
                try {
                    const _dummy = new URL(spotifyProps.backendURL);
                    state.context.backendUrl = spotifyProps.backendURL;
                } catch {
                    state.context.backendUrl = process.env.BACKEND_API_BASEURL!;
                    Logc.warn(`"${spotifyProps.backendURL}" is not a valid URL!`);
                }
            } else {
                state.context.backendUrl = process.env.BACKEND_API_BASEURL!;
            }
        }
        if (spotifyProps.token !== undefined && spotifyProps.token) {
            send(SpotifyStateMachineEvent.UserEnteredToken);
        }
        if (spotifyProps.logo !== undefined) {
            if (spotifyProps.logo.preferMonochrome !== undefined) setPreferMonochromeLogo(spotifyProps.logo.preferMonochrome);
            if (spotifyProps.logo.position !== undefined) setLogoPosition(spotifyProps.logo.position);
            if (spotifyProps.logo.alignment !== undefined) setLogoAlignment(spotifyProps.logo.alignment);
        }
        if (spotifyProps.art !== undefined) {
            if (spotifyProps.art.enabled !== undefined) setShowOverlayArt(spotifyProps.art.enabled);
            if (spotifyProps.art.type !== undefined) setOverlayArtType(spotifyProps.art.type);
            if (spotifyProps.art.position !== undefined) setOverlayArtPosition(spotifyProps.art.position);
            if (spotifyProps.art.fetchLocalCovers !== undefined) setOverlayArtFetchLocalCovers(spotifyProps.art.fetchLocalCovers);
            if (spotifyProps.art.fetchLocalCacheMaxAge !== undefined) {
                if (mbClient.current !== undefined) {
                    mbClient.current.ttl = Math.round(1000 * 60 * 60 * 24 * spotifyProps.art.fetchLocalCacheMaxAge);
                }
            }
            if (spotifyProps.art.hideMusicbrainzLogo !== undefined) setHideMusicbrainzLogo(spotifyProps.art.hideMusicbrainzLogo);
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
    const [ currentlyPlayingTrack, setCurrentlyPlayingTrack ] = useReducer((prevTrack: SpotifyTrack | null, newTrack: SpotifyTrack | null) => {
        if (!prevTrack || !newTrack) return newTrack;
        if (spotifyTrackEquals(prevTrack, newTrack)) return prevTrack;
        return newTrack;
    }, null);
    const [ currentlyPlaying, setCurrentlyPlaying ] = useReducer((prevO: SpotifyCurrentlyPlayingObject | null | undefined, newO: React.SetStateAction<SpotifyCurrentlyPlayingObject | null | undefined>) => {
        const newObject = typeof newO === 'function' ? newO(prevO) : newO;
        setCurrentlyPlayingTrack(newObject?.item ?? null);
        return newObject;
    }, undefined);

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

    // ========================================
    //  SpotifyOverlayPreferredLocalArtChooser
    // ========================================
    const preferredLocalArtChooserRef = useRef<HTMLDivElement>(null);
    const [ preferredLocalArtChooserPosition, setPreferredLocalArtChooserPosition ] = useState<Pick<CSSProperties, 'left' | 'top' | 'transform'>>({ left: 0, top: 0 });
    const preferredLocalArtChooserStyle = useMemo(() => ({ width: 224, maxHeight: 152 }), []);

    // BoundingClientRect
    const [ spotifyDivRect, spotifyDivRef, spotifyDivRefCallback ] = useClientRect<HTMLDivElement>([
        // Every property that could change the overlay's position or size is a dependency
        overlayStyle.left, overlayStyle.top, overlayStyle.maxWidth, overlayStyle.fontSize, overlayStyle.transform,
        showOverlayArt, overlayArtType, overlayArtFetchLocalCovers, showProgressBar, currentlyPlayingTrack === null,
    ]);
    useEffect(() => {
        const rect = spotifyDivRect;
        if (rect) {
            let left = rect.left;
            let top = rect.bottom;
            const transform: string[] = [];

            if (rect.left + preferredLocalArtChooserStyle.width >= window.innerWidth - 20) {
                left = rect.right;
                transform.push('translateX(-100%)');
            }
            if (rect.bottom + preferredLocalArtChooserStyle.maxHeight >= window.innerHeight - 20) {
                top = rect.top;
                transform.push('translateY(-100%)');
            }

            setPreferredLocalArtChooserPosition({ left, top, transform: transform.join(' ') });
        }
    }, [ preferredLocalArtChooserStyle.maxHeight, preferredLocalArtChooserStyle.width, spotifyDivRect ]);

    // ========
    //  RENDER
    // ========
    const StateIcons = useCallback(() => {
        const stateIconOverlay = (
          <span className="state-icons">
            {isRefreshingToken ? <span><FaCircleNotch className="fa-spin" color="hsla(0, 0%, 100%, 0.69)" /></span> : null}
            {isRateLimited ? <span><FaFilter color="hsla(45, 100%, 50%, 0.69)" /></span> : null}
            {isFatalErrorGettingToken ? <span><FaSkull color="hsla(0, 100%, 32%, 0.69)" /></span> : null}
            {hasNoInternetConnection ? <span><FaPlug className="blink" color="hsla(0, 100%, 32%, 0.69)" /></span> : null}
          </span>
        );
        return Array.isArray(stateIconOverlay.props.children)
            ? (stateIconOverlay.props.children as Array<any>).filter(x => x !== null && x !== undefined).length > 0 ? stateIconOverlay : null
            : stateIconOverlay.props.children !== null && stateIconOverlay.props.children !== undefined ? stateIconOverlay : null;
    }, [ hasNoInternetConnection, isFatalErrorGettingToken, isRateLimited, isRefreshingToken ]);

    // NOTE: If the current track is a local track, the album art will load asynchronously after render.
    // This messes up with the scrolling text, since it won't receive any info that its own clientWidth changed.
    // The following code forces an update whenever the img changes.
    const forceRefreshScrollableArea = useRef<() => void>();
    const albumArtWidth = useRef(-1);
    const onAlbumArtLoaded = useCallback((e: SyntheticEvent<HTMLImageElement>) => {
        if (albumArtWidth.current !== e.currentTarget?.width ?? -1) {
            albumArtWidth.current = e.currentTarget?.width ?? -1;
            forceRefreshScrollableArea.current?.();
        }
    }, []);
    useEffect(() => forceRefreshScrollableArea.current?.(), [ overlayArtPosition, overlayArtType, showOverlayArt ]);

    const spotifyContext = useMemo<SpotifyOverlayContextType>(() => {
        return {
            logger: Logc,
            overlayHtmlRef: spotifyDivRef,
            backgroundHtmlRef: props.backgroundElement,
        };
    }, [ props.backgroundElement, spotifyDivRef ]);

    switch (state.value) {
        case SpotifyStateMachineState.S4CheckingAT:
        case SpotifyStateMachineState.S5HasATIdle: {
            if (currentlyPlaying === undefined) return null;

            const ALBUM_ART_MARGIN = 0.25 * overlayStyle.fontSize;
            const OVERLAY_CONTENT_MARGIN_LEFT = getOverlayContentMarginLeft(overlayStyle.fontSize, showOverlayArt, overlayArtType, overlayArtPosition);
            const OVERLAY_CONTENT_MARGIN_RIGHT = getOverlayContentMarginRight(overlayStyle.fontSize, showOverlayArt, overlayArtType, overlayArtPosition);
            const ALBUM_ART_SIZE = 2 * overlayStyle.fontSize // Track Title + Artist Name
                                 + 2 * overlayStyle.fontSize // .overlay-content's padding
                                 + SPOTIFY_LOGO_HEIGHT
                                 - 2 * ALBUM_ART_MARGIN;
            const showLogo = !showOverlayArt || overlayArtType !== SpotifyOverlayArtType.SpotifyIcon;
            const _logoPosition = logoPosition === Position.Bottom ? 'bottom' : 'top';
            const _logoAlignment = logoAlignment === Position.Right ? 'right' : 'left';

            return (
              <SpotifyOverlayContext.Provider value={spotifyContext}>
                <div ref={spotifyDivRefCallback} id="spotify" className="overlay d-flex flex-column flex-nowrap align-items-start overflow-hidden" style={{ ...overlayStyle, ...overlayBackgroundStyle }}>
                  <StateIcons />
                  {
                      currentlyPlayingTrack === null ? (
                        <>
                          {/*Show only Spotify's icon when no song is playing*/}
                          <SpotifyOverlayIcon preferMonochrome={preferMonochromeLogo} />
                        </>
                      ) : (
                        <>
                          {
                              showProgressBar ? (
                                <SpotifyOverlayProgressBar
                                  className={`${progressBarPosition === Position.Top ? 'top' : 'bottom'}`} color={progressBarColor}
                                  isPlaying={currentlyPlaying?.is_playing ?? false} durationMs={currentlyPlaying?.item?.duration_ms ?? 0} progressMs={currentlyPlaying?.progress_ms ?? 0}
                                />
                              ) : null
                          }
                          <div
                            className={`main d-flex ${overlayArtPosition === Position.Right ? 'flex-row-reverse' : 'flex-row'} flex-nowrap align-items-center overflow-hidden`}
                            style={{ maxWidth: overlayStyle.maxWidth }}
                          >
                            {
                                showOverlayArt ? (
                                    overlayArtType === SpotifyOverlayArtType.AlbumArt ? (
                                      <SpotifyAlbumArt
                                        className="flex-shrink-0" style={{ margin: ALBUM_ART_MARGIN }} width={ALBUM_ART_SIZE} onLoad={onAlbumArtLoaded}
                                        track={currentlyPlayingTrack} fetchLocalCovers={overlayArtFetchLocalCovers}
                                        mbClient={mbClient.current} mbClientCache={mbClient.current}
                                        preferrectLocalArtChooserElementRef={preferredLocalArtChooserRef}
                                        preferrectLocalArtChooserSize={{ width: preferredLocalArtChooserStyle.width, height: preferredLocalArtChooserStyle.maxHeight }}
                                      />
                                    ) : overlayArtType === SpotifyOverlayArtType.SpotifyIcon ? (
                                      <SpotifyOverlayIcon preferMonochrome={preferMonochromeLogo} />
                                    ) : null
                                ) : null
                            }
                            <SpotifyOverlayContent
                              width={overlayStyle.maxWidth} marginLeft={OVERLAY_CONTENT_MARGIN_LEFT} marginRight={OVERLAY_CONTENT_MARGIN_RIGHT}
                              overlayStyle={overlayStyle} alignSelf={showLogo ? undefined : (_logoPosition === 'top' ? 'flex-end' : 'flex-start')}
                              showLogo={showLogo} preferMonochromeLogo={preferMonochromeLogo} logoHeight={SPOTIFY_LOGO_HEIGHT}
                              logoPosition={_logoPosition} logoAlignment={_logoAlignment}
                              logoMarginLeft={getSpotifyLogoMarginLeft(SPOTIFY_LOGO_HEIGHT, ALBUM_ART_MARGIN, OVERLAY_CONTENT_MARGIN_LEFT, showOverlayArt, overlayArtType)}
                              currentlyPlayingTrack={currentlyPlayingTrack} showMusicbrainzLogoOnLocalTrack={overlayArtFetchLocalCovers && !hideMusicbrainzLogo}
                              forceRefreshScrollableArea={forceRefreshScrollableArea}
                            />
                          </div>
                        </>
                      )
                  }
                </div>
                {   /* SpotifyOverlayPreferredLocalArtChooser's portal ref */
                    showOverlayArt && overlayArtType === SpotifyOverlayArtType.AlbumArt ? (
                      <div ref={preferredLocalArtChooserRef} style={{ position: 'absolute', ...preferredLocalArtChooserStyle, ...preferredLocalArtChooserPosition }} />
                    ) : null
                }
              </SpotifyOverlayContext.Provider>
            );
        }

        case SpotifyStateMachineState.S6CantGetTokenErrorIdle: {
            const errorMsg = 'Fatal error while exchanging token!';
            const event: CouldntGetBackendTokenFatalErrorEventObject | undefined = state.event.data?.event;
            const secondaryMessages = event?.error ? [event?.error] : [];
            secondaryMessages.push('Enter a new token');
            return (
              <SpotifyOverlayContext.Provider value={spotifyContext}>
                <div id="spotify" className="d-flex flex-nowrap align-items-start overlay" style={{ ...overlayStyle, ...overlayBackgroundStyle, width: overlayStyle.maxWidth }}>
                  <SpotifyOverlayIcon preferMonochrome={preferMonochromeLogo} />
                  <SpotifyOverlayError message={errorMsg} secondaryMessages={secondaryMessages} color={overlayStyle.color} />
                  <StateIcons />
                </div>
              </SpotifyOverlayContext.Provider>
            );
        }

        case SpotifyStateMachineState.S7RetryWaiting: {
            const errorMsg = "Couldn't refresh token; retrying shortly...";
            const event: RefreshTokenAfterSecondsEventObject | undefined = state.event.data?.event;
            return (
              <SpotifyOverlayContext.Provider value={spotifyContext}>
                <div id="spotify" className="d-flex flex-nowrap align-items-start overlay" style={{ ...overlayStyle, ...overlayBackgroundStyle, width: overlayStyle.maxWidth }}>
                  <SpotifyOverlayIcon preferMonochrome={preferMonochromeLogo} />
                  <SpotifyOverlayError message={errorMsg} secondaryMessages={event?.error ? [event?.error] : undefined} color={overlayStyle.color} />
                  <StateIcons />
                </div>
              </SpotifyOverlayContext.Provider>
            );
        }

        default: return null;
    }
}
