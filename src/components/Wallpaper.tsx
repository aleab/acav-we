/* eslint-disable no-multi-spaces */

import _ from 'lodash';
import React, { MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Log from '../common/Log';
import AudioSamplesArray from '../common/AudioSamplesArray';
import AudioSamplesBuffer from '../common/AudioSamplesBuffer';
import Properties, { applyUserProperties } from '../app/properties/Properties';
import { PINK_NOISE } from '../app/noise';
import BackgroundMode from '../app/BackgroundMode';
import { ScaleFunctionFactory } from '../app/ScaleFunction';
import WallpaperContext, { WallpaperContextType } from '../app/WallpaperContext';

import Stats from './Stats';
import BarVisualizer from './BarVisualizer';

const LOCALSTORAGE_BG_CURRENT_IMAGE = 'aleab.acav.bgCurrentImage';
const LOCALSTORAGE_BG_PLAYLIST_TIMER = 'aleab.acav.bgPlaylistImageChangedTime';

interface WallpaperProps {
    windowEvents: WindowEvents;
    options: Properties
}

export function Wallpaper(props: WallpaperProps) {
    const O = useRef(props.options);

    // Observer
    const onUserPropertiesChangedSubs: Set<(args: UserPropertiesChangedEventArgs) => void> = useMemo(() => new Set(), []);
    const onAudioSamplesSubs: Set<(args: AudioSamplesEventArgs) => void> = useMemo(() => new Set(), []);
    const wallpaperEvents: WallpaperEvents = useMemo(() => ({
        onUserPropertiesChanged: {
            subscribe: callback => { onUserPropertiesChangedSubs.add(callback); },
            unsubscribe: callback => { onUserPropertiesChangedSubs.delete(callback); },
        },
        onAudioSamples: {
            subscribe: callback => { onAudioSamplesSubs.add(callback); },
            unsubscribe: callback => { onAudioSamplesSubs.delete(callback); },
        },
    }), [ onUserPropertiesChangedSubs, onAudioSamplesSubs ]);

    const samplesBufferLength = O.current.audioSamples.bufferLength;
    const samplesBuffer = useMemo(() => new AudioSamplesBuffer(1 + samplesBufferLength), [samplesBufferLength]);

    // ============
    //  BACKGROUND
    // ============
    const [ styleBackground, setStyleBackground ] = useState({});
    const backgroundImagePath: MutableRefObject<string | null | undefined> = useRef(undefined);
    const backgroundPlaylistTimer = useRef(0);

    const scheduleBackgroundImageChange = useCallback((fn: () => void, ms: number) => {
        clearTimeout(backgroundPlaylistTimer.current);
        backgroundPlaylistTimer.current = setTimeout((() => fn()) as TimerHandler, ms);
        Log.debug(`%c[Wallpaper] Scheduled background image change in ${ms / 1000}s.`, 'color:green');
    }, []);

    const setBackgroundImage = useCallback((imagePath: string) => {
        if (imagePath && imagePath !== backgroundImagePath.current) {
            backgroundImagePath.current = imagePath;
            window.localStorage.setItem(LOCALSTORAGE_BG_CURRENT_IMAGE, imagePath);

            setStyleBackground({
                background: `center / cover no-repeat url("file:///${imagePath}")`,
            });

            Log.debug(`%c[Wallpaper] Background image set to "${imagePath}"`, 'color:green');
        }
    }, []);

    const applyNewRandomImageRequestId = useRef('');
    const applyNewRandomImage = useCallback((maxTries: number = 3) => {
        applyNewRandomImageRequestId.current = (Math.random() * 10 ** 8).toFixed(0);

        const _dir = O.current.background.playlistDirectory;
        if (_dir && _dir.length > 0) {
            const _id = applyNewRandomImageRequestId.current;
            window.wallpaperRequestRandomFileForProperty('background_playlist', (_p, filePath) => {
                // Depending on the size of the selected directory and its subdirectories, wallpaperRequestRandomFileForProperty may
                // take a while get a file and execute this callback, so we need to check if the user still needs this random file
                const tooSlow = O.current.background.mode !== BackgroundMode.Playlist
                            || O.current.background.playlistDirectory !== _dir
                            || _id !== applyNewRandomImageRequestId.current;
                if (tooSlow) return;
                if (!filePath || (filePath === backgroundImagePath.current && maxTries > 0)) {
                    // Same image, retry
                    applyNewRandomImage(maxTries - 1);
                } else {
                    setBackgroundImage(filePath);
                    window.localStorage.setItem(LOCALSTORAGE_BG_PLAYLIST_TIMER, Date.now().toString());
                    scheduleBackgroundImageChange(applyNewRandomImage, O.current.background.playlistTimerMinutes * 60 * 1000);
                }
            });
        }
    }, [ scheduleBackgroundImageChange, setBackgroundImage ]);

    const updateBackgroundFirst = useRef(true);
    const updateBackground = useCallback(() => {
        Log.debug('%c[Wallpaper] Updating background...', 'color:green', { background: _.cloneDeep(O.current.background) });

        function clearPlaylistState() {
            backgroundImagePath.current = null;
            window.localStorage.removeItem(LOCALSTORAGE_BG_CURRENT_IMAGE);
            window.localStorage.removeItem(LOCALSTORAGE_BG_PLAYLIST_TIMER);
            clearTimeout(backgroundPlaylistTimer.current);
            setStyleBackground({});
        }

        if (O.current.background.mode === BackgroundMode.Playlist) {
            // If the wallpaper app just started and the local storage has a LOCALSTORAGE_BG_PLAYLIST_TIMER set
            // from a previous execution, then use that to determine when we need to request a new wallpaper.
            const prevChangeTime = window.localStorage.getItem(LOCALSTORAGE_BG_PLAYLIST_TIMER);
            if (prevChangeTime && updateBackgroundFirst.current) {
                const timeElapsed = Date.now() - Number(prevChangeTime);
                if (timeElapsed >= O.current.background.playlistTimerMinutes * 60 * 1000) {
                    applyNewRandomImage();
                } else {
                    const timeRemaining = O.current.background.playlistTimerMinutes * 60 * 1000 - timeElapsed;
                    scheduleBackgroundImageChange(applyNewRandomImage, timeRemaining);
                }
            } else if (O.current.background.playlistDirectory) {
                applyNewRandomImage();
            } else {
                clearPlaylistState();
            }
        } else {
            clearPlaylistState();

            if (O.current.background.mode === BackgroundMode.Color) {
                const color = O.current.background.color ?? [ 0, 0, 0 ];
                setStyleBackground({
                    backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
                });
            } else if (O.current.background.mode === BackgroundMode.Image) {
                setBackgroundImage(O.current.background.imagePath);
            } else if (O.current.background.mode === BackgroundMode.Css) {
                const newStyle: any = {};
                const regex = /([\w-]+)\s*:\s*((['"]).*\3|[^;]*)/g;
                let match;
                while ((match = regex.exec(O.current.background.css)) !== null) {
                    const propertyName = match[1].replace(/-(.)/g, (_s, v) => v.toUpperCase());
                    if (propertyName) {
                        newStyle[propertyName] = match[2];
                    }
                }
                setStyleBackground(newStyle);
            }
        }

        updateBackgroundFirst.current = false;
    }, [ scheduleBackgroundImageChange, setBackgroundImage, applyNewRandomImage ]);

    // init background
    useEffect(() => {
        const currentImage = window.localStorage.getItem(LOCALSTORAGE_BG_CURRENT_IMAGE);
        if (currentImage && currentImage.length > 0) {
            setBackgroundImage(currentImage);
        }
    }, [setBackgroundImage]);

    const style = {
        ...styleBackground,
    };

    // ==================================
    //  window.wallpaperPropertyListener
    // ==================================
    useEffect(() => {
        Log.debug('%c[Wallpaper] Registering wallpaperPropertyListener callbacks...', 'color:green');

        window.wallpaperPropertyListener = {
            applyUserProperties: _props => {
                const oldProps = _.cloneDeep(O.current);
                const newProps = applyUserProperties(O.current, _props);
                if (_.isEmpty(newProps)) return;

                // Log.debug('User properties applied', newProps);
                if (newProps.background !== undefined) {
                    const { playlistTimerMinutes: _playlistTimerMinutes, ..._background } = newProps.background;
                    if (!_.isEmpty(_background)) {
                        updateBackground();
                    } else if (_playlistTimerMinutes) {
                        const _startTime = Number(window.localStorage.getItem(LOCALSTORAGE_BG_PLAYLIST_TIMER) ?? '0');
                        const _timeRemaining = (_playlistTimerMinutes * 60 * 1000) - (Date.now() - _startTime);
                        scheduleBackgroundImageChange(applyNewRandomImage, _timeRemaining >= 0 ? _timeRemaining : 0);
                    }
                }
                if (newProps.audioSamples?.bufferLength !== undefined) {
                    samplesBuffer.resize(1 + newProps.audioSamples.bufferLength);
                }

                onUserPropertiesChangedSubs.forEach(callback => callback({ oldProps, newProps }));
            },
        };
        return () => {
            onUserPropertiesChangedSubs.clear();
            delete window.wallpaperPropertyListener;
        };
    }, [ onUserPropertiesChangedSubs, scheduleBackgroundImageChange, applyNewRandomImage, updateBackground, samplesBuffer ]);

    // =======================================
    //  window.wallpaperRegisterAudioListener
    // =======================================
    useEffect(() => {
        Log.debug('%c[Wallpaper] Registering wallpaperRegisterAudioListener callback...', 'color:green');

        let samples: AudioSamplesArray | undefined;
        let peak: number = 0;
        const mean: number = 0;

        function _preProcessSamples(_samples: number[]): number[] {
            const shouldCorrectSamples = O.current.audioSamples.correctSamples;
            const scaleFn = ScaleFunctionFactory.buildScaleFunction(O.current.audioSamples.scale);

            const filteredSamples = _samples.map((vin, i) => {
                let vout = vin;
                if (shouldCorrectSamples) {
                    vout /= PINK_NOISE[i % PINK_NOISE.length];                                      // CORRECT SAMPLES
                }
                vout *= (1 + O.current.audioSamples.audioVolumeGain / 100);                     // LINEAR GAIN
                vout = vout >= O.current.audioSamples.audioFreqThreshold / 1000 ? vout : 0;     // THRESHOLD

                vout = scaleFn(vout);                                                               // SCALE
                return vout;
            });

            peak = _.max(filteredSamples) ?? 0;

            if (O.current.audioSamples.normalize) {
                let totalWeight = 1;
                const peaks = samplesBuffer.samples.map((v, i, arr) => {
                    const w = 6 ** (i / arr.length - 1);
                    totalWeight += w;
                    return v.max() * w;
                }).concat(peak);

                peak = _.sumBy(peaks) / totalWeight;
                if (peak > 0) {
                    filteredSamples.forEach((_v, i) => {
                        filteredSamples[i] /= peak;                                                 // NORMALIZE
                    });
                }
            }

            return filteredSamples;
        }

        let listenerIsPaused = false;
        window.wallpaperTogglePauseAudioListener = () => {
            listenerIsPaused = !listenerIsPaused;
        };

        window.wallpaperRegisterAudioListener(rawSamples => {
            if (!listenerIsPaused) {
                samples = new AudioSamplesArray(_preProcessSamples(rawSamples), 2);
                samplesBuffer.push(samples);
            }
            if (samples !== undefined) {
                onAudioSamplesSubs.forEach(callback => callback({ samples: samples!, samplesBuffer, peak }));
            }
        });

        return () => {
            onAudioSamplesSubs.clear();
            window.wallpaperRegisterAudioListener(null);
        };
    }, [ onAudioSamplesSubs, samplesBuffer ]);

    const wallpaperContext = useMemo<WallpaperContextType>(() => {
        Log.debug('%c[Wallpaper] Creating WallpaperContext...', 'color:green');
        return {
            windowEvents: props.windowEvents,
            wallpaperEvents,
            wallpaperProperties: O.current,
        };
    }, [ props.windowEvents, wallpaperEvents ]);

    return (
      <div style={style}>
        <WallpaperContext.Provider value={wallpaperContext}>
          {process.env.NODE_ENV !== 'production' ? <Stats /> : null}
          <BarVisualizer />
        </WallpaperContext.Provider>
      </div>
    );
}

export default Wallpaper;
