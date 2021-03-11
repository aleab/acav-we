/* eslint-disable no-multi-spaces */
import _ from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import Log from '../common/Log';
import AudioSamplesArray from '../common/AudioSamplesArray';
import CircularBuffer from '../common/CircularBuffer';
import { BackgroundMode } from '../app/BackgroundMode';
import Properties, { applyUserProperties } from '../app/properties/Properties';
import { PINK_NOISE } from '../app/noise';
import { ScaleFunctionFactory } from '../app/ScaleFunction';
import WallpaperContext, { WallpaperContextType } from '../app/WallpaperContext';
import { usePlugin } from '../hooks/usePlugin';
import { useRenderer } from '../hooks/useRenderer';
import useWallpaperBackground from '../hooks/useWallpaperBackground';
import useWallpaperForeground from '../hooks/useWallpaperForeground';
import PluginManager, { PluginName } from '../plugins/PluginManager';

import Stats from './Stats';
import Clock from './clock/Clock';
import Spotify from './spotify/Spotify';
import Visualizer from './visualizers/Visualizer';
import WinTaskBar from './WinTaskBar';

const LOCALSTORAGE_BG_CURRENT_IMAGE = 'aleab.acav.bgCurrentImage';
const LOCALSTORAGE_BG_CURRENT_VIDEO = 'aleab.acav.bgCurrentVideo';
const LOCALSTORAGE_BG_PLAYLIST_TIMER = 'aleab.acav.bgPlaylistImageChangedTime';
const LOCALSTORAGE_FG_CURRENT_IMAGE = 'aleab.acav.fgCurrentImage';

const Logc = Log.getLogger('App', 'darkgreen');

interface AppProps {
    windowEvents: WindowEvents;
    options: Properties
}

export default function App(props: AppProps) {
    const O = useRef(props.options);
    const [ showForeground, setShowForeground ] = useState(O.current.foreground.enabled);
    const [ showStats, setShowStats ] = useState(O.current.showStats);
    const [ showSpotify, setShowSpotify ] = useState(O.current.spotify.showOverlay);
    const [ showClock, setShowClock ] = useState(O.current.clock.enabled);

    const [ weCuePluginLoaded, setWeCuePluginLoaded ] = useState(false);
    const [ useICue, setUseICue ] = useState(O.current.icuePlugin.enabled);

    const [ useTaskbarPlugin, setUseTaskbarPlugin ] = useState(O.current.taskbar.enabled);
    const [ taskbarIsSmall, setTaskbarIsSmall ] = useState(O.current.taskbar.isSmall);
    const [ taskbarScale, setTaskbarScale ] = useState(O.current.taskbar.scale);
    const [ taskbarSize, setTaskbarSize ] = useState(O.current.taskbar.size);
    const [ taskbarPosition, setTaskbarPosition ] = useState(O.current.taskbar.position);
    const [ taskbarBrightness, setTaskbarBrightness ] = useState(O.current.taskbar.brightness);

    window.acav.getProperties = function getProperties() { return _.cloneDeep(O.current); };

    // Observer
    const onUserPropertiesChangedSubs: Set<(args: UserPropertiesChangedEventArgs) => void> = useMemo(() => new Set(), []);
    const onGeneralPropertiesChangedSubs: Set<(args: GeneralPropertiesChangedEventArgs) => void> = useMemo(() => new Set(), []);
    const onAudioSamplesSubs: Set<(args: AudioSamplesEventArgs) => void> = useMemo(() => new Set(), []);
    const onPausedSubs: Set<(args: PausedEventArgs) => void> = useMemo(() => new Set(), []);

    const wallpaperEvents: WallpaperEvents = useMemo(() => ({
        onUserPropertiesChanged: {
            subscribe: callback => { onUserPropertiesChangedSubs.add(callback); },
            unsubscribe: callback => { onUserPropertiesChangedSubs.delete(callback); },
        },
        onGeneralPropertiesChanged: {
            subscribe: callback => { onGeneralPropertiesChangedSubs.add(callback); },
            unsubscribe: callback => { onGeneralPropertiesChangedSubs.delete(callback); },
        },
        onAudioSamples: {
            subscribe: callback => { onAudioSamplesSubs.add(callback); },
            unsubscribe: callback => { onAudioSamplesSubs.delete(callback); },
        },
        onPaused: {
            subscribe: callback => { onPausedSubs.add(callback); },
            unsubscribe: callback => { onPausedSubs.delete(callback); },
        },
    }), [ onUserPropertiesChangedSubs, onGeneralPropertiesChangedSubs, onAudioSamplesSubs, onPausedSubs ]);

    // Context
    const renderer = useRenderer();
    const wallpaperContext = useMemo<WallpaperContextType>(() => {
        Logc.info('Creating WallpaperContext...');
        return {
            windowEvents: props.windowEvents,
            wallpaperEvents,
            wallpaperProperties: O.current,
            renderer,
            pluginManager: new PluginManager(),
        };
    }, [ props.windowEvents, wallpaperEvents, renderer ]);

    // Shared state
    const targetFps = useRef(0);
    const samplesBuffer = useMemo(() => new CircularBuffer<AudioSamplesArray>(1 + O.current.audioSamples.bufferLength ?? 0), []);

    useEffect(() => {
        window.wallpaperPropertyListener = {};
        window.wallpaperPluginListener = {
            onPluginLoaded: (name: PluginName) => {
                if (name === 'cue') setWeCuePluginLoaded(true);
            },
        };

        return () => {
            delete window.wallpaperPropertyListener;
            delete window.wallpaperPluginListener;
            setWeCuePluginLoaded(false);
        };
    }, []);

    // ===========
    //  CSS STYLE
    // ===========
    const { styleBackground, updateBackground, scheduleBackgroundImageChange, videoSource, videoStyle } = useWallpaperBackground({
        localStorageKeys: {
            currentImage: LOCALSTORAGE_BG_CURRENT_IMAGE,
            currentVideo: LOCALSTORAGE_BG_CURRENT_VIDEO,
            playlistTimer: LOCALSTORAGE_BG_PLAYLIST_TIMER,
        },
        options: O,
    });
    const { styleForeground, updateForeground } = useWallpaperForeground({
        localStorageKeys: {
            currentImage: LOCALSTORAGE_FG_CURRENT_IMAGE,
        },
        options: O,
    });
    const style = { ...styleBackground };
    const fgStyle = { ...styleForeground };

    // TODO: The foreground image needs to be considered as well when calculating the average color used in the Spotify overlay component

    // ====================
    //  GENERAL PROPERTIES
    // ====================
    useEffect(() => {
        Logc.info('Registering general properties callback...');
        window.wallpaperPropertyListener!.applyGeneralProperties = _props => {
            const newProps = _.cloneDeep(_props);
            if (_.isEmpty(newProps)) return;
            Logc.debug('General properties applied', newProps);

            if (newProps.fps !== undefined) {
                targetFps.current = newProps.fps;
                if (O.current.limitFps) {
                    renderer.setFps(targetFps.current);
                }
            }

            onGeneralPropertiesChangedSubs.forEach(callback => callback({ newProps }));
        };
        return () => {
            //onGeneralPropertiesChangedSubs.clear();
            delete window.wallpaperPropertyListener?.applyGeneralProperties;
        };
    }, [ onGeneralPropertiesChangedSubs, renderer ]);

    // =================
    //  USER PROPERTIES
    // =================
    useEffect(() => {
        Logc.info('Registering user properties callback...');
        window.wallpaperPropertyListener!.applyUserProperties = _props => {
            const oldProps = _.cloneDeep(O.current);
            const newProps = applyUserProperties(O.current, _props);
            if (_.isEmpty(newProps)) return;
            Logc.debug('User properties applied', newProps);

            if (newProps.showStats !== undefined) setShowStats(newProps.showStats);
            if (newProps.limitFps !== undefined) renderer.setFps(newProps.limitFps ? targetFps.current : 0);

            if (newProps.background !== undefined) {
                const { playlistTimerMinutes: _playlistTimerMinutes, ..._background } = newProps.background;

                // Give precedence to all the other properties over `playlistTimerMinutes`,
                // because updating the background will automatically also update the timer if necessary
                if (!_.isEmpty(_background)) {
                    updateBackground();
                } else if (_playlistTimerMinutes) {
                    const _startTime = Number(window.localStorage.getItem(LOCALSTORAGE_BG_PLAYLIST_TIMER) ?? '0');
                    const _timeRemaining = (_playlistTimerMinutes * 60 * 1000) - (Date.now() - _startTime);
                    scheduleBackgroundImageChange(_timeRemaining >= 0 ? _timeRemaining : 0);
                }
            }

            if (newProps.foreground !== undefined) {
                const { enabled: _enabled, ..._foreground } = newProps.foreground;
                if (_enabled !== undefined) setShowForeground(_enabled);
                if (!_.isEmpty(_foreground)) updateForeground();
            }

            if (newProps.audioSamples?.bufferLength !== undefined) {
                samplesBuffer.resize(1 + newProps.audioSamples.bufferLength);
            }

            if (newProps.clock !== undefined) {
                if (newProps.clock.enabled !== undefined) setShowClock(newProps.clock.enabled);
            }

            if (newProps.taskbar !== undefined) {
                if (newProps.taskbar.enabled !== undefined) setUseTaskbarPlugin(newProps.taskbar.enabled);
                if (newProps.taskbar.isSmall !== undefined) setTaskbarIsSmall(newProps.taskbar.isSmall);
                if (newProps.taskbar.scale !== undefined) setTaskbarScale(newProps.taskbar.scale);
                if (newProps.taskbar.size !== undefined) setTaskbarSize(newProps.taskbar.size);
                if (newProps.taskbar.position !== undefined) setTaskbarPosition(newProps.taskbar.position);
                if (newProps.taskbar.brightness !== undefined) setTaskbarBrightness(newProps.taskbar.brightness);
            }

            if (newProps.spotify !== undefined) {
                if (newProps.spotify.showOverlay !== undefined) setShowSpotify(newProps.spotify.showOverlay);
            }

            if (newProps.icuePlugin !== undefined) {
                if (newProps.icuePlugin.enabled !== undefined) setUseICue(newProps.icuePlugin.enabled);
            }

            onUserPropertiesChangedSubs.forEach(callback => callback({ oldProps, newProps }));
        };
        return () => {
            //onUserPropertiesChangedSubs.clear();
            delete window.wallpaperPropertyListener?.applyUserProperties;
        };
    }, [ onUserPropertiesChangedSubs, renderer, samplesBuffer, scheduleBackgroundImageChange, updateBackground, updateForeground ]);

    // =================
    //  PAUSED LISTENER
    // =================
    useEffect(() => {
        window.wallpaperPropertyListener!.setPaused = isPaused => onPausedSubs.forEach(callback => callback?.({ isPaused }));
        return () => {
            //onPausedSubs.clear();
            delete window.wallpaperPropertyListener?.setPaused;
        };
    }, [onPausedSubs]);

    // =========
    //  PLUGINS
    // =========
    usePlugin(wallpaperContext.pluginManager, 'cue', useICue && weCuePluginLoaded, {
        getOptions: () => O.current.icuePlugin,
    });
    const taskbarPlugin = usePlugin(wallpaperContext.pluginManager, 'taskbar', useTaskbarPlugin, {
        getOptions: () => O.current.taskbar,
    });

    // ================
    //  AUDIO LISTENER
    // ================
    // All preliminary operations that need to be applied to the audio samples and shared by all the
    // audio-responsive elements of the wallpaper, such as filters and peak calculations, are done here.
    useEffect(() => {
        Logc.info('Registering wallpaperRegisterAudioListener callback...');

        let peak = 0;
        let mean = 0;

        // == preProcessSamples()
        function preProcessSamples(_samples: number[]): number[] {
            const shouldCorrectSamples = O.current.audioSamples.correctSamples;
            const scaleFn = ScaleFunctionFactory.buildScaleFunction(O.current.audioSamples.scale);

            const filteredSamples = _samples.map((vin, i) => {
                let vout = vin;
                if (shouldCorrectSamples) {
                    vout /= PINK_NOISE[i % PINK_NOISE.length];                                  // CORRECT SAMPLES
                }
                vout *= (1 + O.current.audioSamples.audioVolumeGain / 100);                     // LINEAR GAIN
                vout = vout >= O.current.audioSamples.audioFreqThreshold / 1000 ? vout : 0;     // THRESHOLD

                vout = scaleFn(vout);                                                           // SCALE
                return vout;
            });

            peak = _.max(filteredSamples) ?? 0;

            if (O.current.audioSamples.normalize) {
                let totalWeight = 1;
                const peaks = samplesBuffer.raw.map((v, i, arr) => {
                    const w = 6 ** (i / arr.length - 1);
                    totalWeight += w;
                    return v.max() * w;
                }).concat(peak);

                peak = _.sum(peaks) / totalWeight;
                if (peak > 0) {
                    filteredSamples.forEach((_v, i) => {
                        filteredSamples[i] /= peak;                                             // NORMALIZE
                    });
                }
            }

            mean = _.mean(filteredSamples) ?? 0;
            return filteredSamples;
        }

        let listenerIsPaused = false;
        window.acav.togglePauseAudioListener = function togglePauseAudioListener() {
            listenerIsPaused = !listenerIsPaused;
        };

        // The samples array is declared outside the callback to let the previous samples pass throught if listenerIsPaused is true
        let samples: AudioSamplesArray | undefined;
        const audioListener: WEAudioListener = rawSamples => {
            if (!listenerIsPaused) {
                samples = new AudioSamplesArray(preProcessSamples(rawSamples), 2);
                samplesBuffer.push(samples);
            }
            if (samples !== undefined) {
                const _rawSamples = new AudioSamplesArray(rawSamples, 2);
                const audioSamplesEventArgs: AudioSamplesEventArgs = { rawSamples: _rawSamples, samples: samples!, samplesBuffer, peak, mean };
                onAudioSamplesSubs.forEach(callback => callback(audioSamplesEventArgs));
            }
        };
        window.wallpaperRegisterAudioListener(audioListener);

        window.acav.resetAudioListener = function resetAudioListener() {
            window.wallpaperRegisterAudioListener(audioListener);
        };

        return () => {
            //onAudioSamplesSubs.clear();
            window.wallpaperRegisterAudioListener(null);
            delete window.acav.togglePauseAudioListener;
        };
    }, [ onAudioSamplesSubs, samplesBuffer, wallpaperContext.pluginManager ]);

    const wallpaperRef = useRef<HTMLDivElement>(null);
    return (
      <>
        {
          O.current.background.mode === BackgroundMode.Video ? (
            <video id="background-video" autoPlay loop playsInline muted src={videoSource ?? ''} style={videoStyle} />
          ) : null
        }
        <div ref={wallpaperRef} style={style}>
          <WallpaperContext.Provider value={wallpaperContext}>
            {showForeground ? <div id="foreground" style={fgStyle} /> : null}
            {showStats ? <Stats /> : null}
            <Visualizer />
            {showSpotify ? <Spotify backgroundElement={wallpaperRef} /> : null}
            {showClock ? <Clock /> : null}
            {
              useTaskbarPlugin ? (
                <WinTaskBar
                  small={taskbarIsSmall} scale={taskbarScale / 100} size={taskbarSize} position={taskbarPosition}
                  brightness={taskbarBrightness / 100} plugin={taskbarPlugin}
                />
              ) : null
            }
          </WallpaperContext.Provider>
        </div>
      </>
    );
}
