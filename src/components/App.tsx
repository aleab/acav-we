/* eslint-disable no-multi-spaces */
import _ from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Log from '../common/Log';
import AudioSamplesArray from '../common/AudioSamplesArray';
import AudioHistory from '../app/AudioHistory';
import { BackgroundMode } from '../app/BackgroundMode';
import { PINK_NOISE } from '../app/noise';
import Properties, { applyUserProperties } from '../app/properties/Properties';
import { RenderEventArgs } from '../app/Renderer';
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
import EventHandler from '../common/EventHandler';

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

    const temporalSmoothingBufferLengthMs = useRef(500);

    window.acav.getProperties = function getProperties() { return _.cloneDeep(O.current); };

    // Observer
    const onUserPropertiesChangedEventHandler = useMemo(() => new EventHandler<UserPropertiesChangedEventArgs>(), []);
    const onGeneralPropertiesChangedEventHandler = useMemo(() => new EventHandler<GeneralPropertiesChangedEventArgs>(), []);
    const onAudioSamplesEventHandler = useMemo(() => new EventHandler<AudioSamplesEventArgs>(), []);
    const onPausedEventHandler = useMemo(() => new EventHandler<PausedEventArgs>(), []);
    const onEnteredAudioListenerCallbackEventHandler = useMemo(() => new EventHandler<PerformanceEventArgs>(), []);
    const onExecutedAudioListenerCallbackEventHandler = useMemo(() => new EventHandler<PerformanceEventArgs>(), []);
    const onVisualizerRenderedEventHandler = useMemo(() => new EventHandler<[PerformanceEventArgs, PerformanceEventArgs, PerformanceEventArgs]>(), []);

    const wallpaperEvents: WallpaperEvents = useMemo(() => ({
        onUserPropertiesChanged: onUserPropertiesChangedEventHandler,
        onGeneralPropertiesChanged: onGeneralPropertiesChangedEventHandler,
        onAudioSamples: onAudioSamplesEventHandler,
        onPaused: onPausedEventHandler,
        stats: {
            enteredAudioListenerCallback: onEnteredAudioListenerCallbackEventHandler,
            executedAudioListenerCallback: onExecutedAudioListenerCallbackEventHandler,
            visualizerRendered: onVisualizerRenderedEventHandler,
        },
    }), [ onAudioSamplesEventHandler, onEnteredAudioListenerCallbackEventHandler, onExecutedAudioListenerCallbackEventHandler, onGeneralPropertiesChangedEventHandler, onPausedEventHandler, onUserPropertiesChangedEventHandler, onVisualizerRenderedEventHandler ]);

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

    // FPS
    const [ limitFps, setLimitFps ] = useState(O.current.limitFps);
    const [ weFpsLimit, setWeFpsLimit ] = useState(-1);
    const [ useCustomFpsLimit, setUseCustomFpsLimit ] = useState(O.current.useCustomFpsLimit);
    const [ customFpsLimit, setCustomFpsLimit ] = useState(O.current.customFpsLimit);
    const targetFps = useMemo(() => {
        if (!limitFps) return 0;
        if (useCustomFpsLimit && customFpsLimit >= 0) return customFpsLimit;
        return weFpsLimit > 0 ? weFpsLimit : 0;
    }, [ customFpsLimit, limitFps, useCustomFpsLimit, weFpsLimit ]);
    useEffect(() => renderer.setFps(targetFps), [ renderer, targetFps ]);

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

            if (newProps.fps !== undefined) setWeFpsLimit(newProps.fps);

            onGeneralPropertiesChangedEventHandler.invoke({ newProps });
        };
        return () => {
            //onGeneralPropertiesChangedSubs.clear();
            delete window.wallpaperPropertyListener?.applyGeneralProperties;
        };
    }, [ onGeneralPropertiesChangedEventHandler, renderer ]);

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

            if (newProps.limitFps !== undefined) setLimitFps(newProps.limitFps);
            if (newProps.useCustomFpsLimit !== undefined) setUseCustomFpsLimit(newProps.useCustomFpsLimit);
            if (newProps.customFpsLimit !== undefined) setCustomFpsLimit(newProps.customFpsLimit);

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

            onUserPropertiesChangedEventHandler.invoke({ oldProps, newProps });
        };
        return () => {
            //onUserPropertiesChangedSubs.clear();
            delete window.wallpaperPropertyListener?.applyUserProperties;
        };
    }, [ onUserPropertiesChangedEventHandler, renderer, scheduleBackgroundImageChange, updateBackground, updateForeground ]);

    // =================
    //  PAUSED LISTENER
    // =================
    useEffect(() => {
        window.wallpaperPropertyListener!.setPaused = isPaused => onPausedEventHandler.invoke({ isPaused });
        return () => {
            //onPausedSubs.clear();
            delete window.wallpaperPropertyListener?.setPaused;
        };
    }, [onPausedEventHandler]);

    // =========
    //  PLUGINS
    // =========
    usePlugin(wallpaperContext.pluginManager, 'cue', useICue && weCuePluginLoaded, {
        fpsLimit: 22,
        getOptions: () => O.current.icuePlugin,
    });
    const taskbarPlugin = usePlugin(wallpaperContext.pluginManager, 'taskbar', useTaskbarPlugin, {
        fpsLimit: 30,
        getOptions: () => O.current.taskbar,
    });

    // ================
    //  AUDIO LISTENER
    // ================
    // All preliminary operations that need to be applied to the audio samples and shared by all the
    // audio-responsive elements of the wallpaper, such as filters and peak calculations, are done here.
    const audioHistory = useMemo(() => new AudioHistory(), []);
    useEffect(() => {
        Logc.info('Registering wallpaperRegisterAudioListener callback...');

        let mean = 0;
        let peak = 0;
        let lerpPeak = 1;
        let listenerIsPaused = false;

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
            lerpPeak = Math.lerp(lerpPeak, peak, 0.69);

            if (O.current.audioSamples.normalize) {
                peak = lerpPeak;
                if (peak > 0) {
                    filteredSamples.forEach((_v, i) => { filteredSamples[i] /= peak; });        // NORMALIZE
                }
            }

            mean = _.mean(filteredSamples) ?? 0;
            return filteredSamples;
        }

        let latestSamples: AudioSamplesArray | undefined;

        const audioListener: WEAudioListener = rawSamples => {
            const t0 = performance.now();
            onEnteredAudioListenerCallbackEventHandler.invoke({ timestamp: t0, time: -1 });

            if (!listenerIsPaused) {
                latestSamples = new AudioSamplesArray(preProcessSamples(rawSamples), 2);
                audioHistory.push(t0, latestSamples);
            }

            const t1 = performance.now();
            onExecutedAudioListenerCallbackEventHandler.invoke({ timestamp: t1, time: t1 - t0 });
        };
        window.wallpaperRegisterAudioListener(audioListener);

        window.acav.togglePauseAudioListener = () => { listenerIsPaused = !listenerIsPaused; };
        window.acav.resetAudioListener = () => window.wallpaperRegisterAudioListener(audioListener);

        const onRender = (e: RenderEventArgs) => {
            const [ samples, frameTimestamp ] = audioHistory.getAudioFrame(e.timestamp - audioHistory.delay);
            if (samples !== null && frameTimestamp > 0) {
                const samplesBuffer: AudioSamplesArray[] = [];
                if (temporalSmoothingBufferLengthMs.current > 0) {
                    const audioHistoryItems = audioHistory.getSince(frameTimestamp - temporalSmoothingBufferLengthMs.current);
                    for (let i = 0; i < audioHistoryItems.length; ++i) {
                        if (audioHistoryItems[i].timestamp >= frameTimestamp) break;
                        samplesBuffer.push(audioHistoryItems[i].data);
                    }
                }

                const audioSamplesEventArgs: AudioSamplesEventArgs = { eventTimestamp: e.timestamp, samples, samplesBuffer, peak, mean };
                onAudioSamplesEventHandler.invoke(audioSamplesEventArgs);
            } else if (latestSamples !== undefined) {
                // The app is most likely paused: keep rendering the latest samples
                const audioSamplesEventArgs: AudioSamplesEventArgs = { eventTimestamp: e.timestamp, samples: latestSamples, samplesBuffer: [], peak, mean };
                onAudioSamplesEventHandler.invoke(audioSamplesEventArgs);
            }
        };
        renderer.onRender.subscribe(onRender);

        return () => {
            //onAudioSamplesSubs.clear();
            window.wallpaperRegisterAudioListener(null);
            delete window.acav.togglePauseAudioListener;
            delete window.acav.resetAudioListener;
            renderer.onRender.unsubscribe(onRender);
        };
    }, [ audioHistory, onAudioSamplesEventHandler, onEnteredAudioListenerCallbackEventHandler, onExecutedAudioListenerCallbackEventHandler, renderer.onRender ]);

    const onVisualizerRendered = useCallback((e: [PerformanceEventArgs, PerformanceEventArgs, PerformanceEventArgs]) => {
        onVisualizerRenderedEventHandler.invoke([
            { timestamp: e[0].timestamp, time: e[0].time },
            { timestamp: e[1].timestamp, time: e[1].time },
            { timestamp: e[2].timestamp, time: e[2].time },
        ]);
    }, [onVisualizerRenderedEventHandler]);

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
            <Visualizer onRendered={onVisualizerRendered} />
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
