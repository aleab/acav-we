/* eslint-disable no-multi-spaces */

import _ from 'lodash';
import React, { useEffect, useMemo, useRef } from 'react';

import Log from '../common/Log';
import AudioSamplesArray from '../common/AudioSamplesArray';
import AudioSamplesBuffer from '../common/AudioSamplesBuffer';
import Properties, { applyUserProperties } from '../app/properties/Properties';
import { PINK_NOISE } from '../app/noise';
import { ScaleFunctionFactory } from '../app/ScaleFunction';
import WallpaperContext, { WallpaperContextType } from '../app/WallpaperContext';

import Stats from './Stats';
import BarVisualizer from './BarVisualizer';
import useWallpaperBackground from '../hooks/useWallpaperBackground';

const LOCALSTORAGE_BG_CURRENT_IMAGE = 'aleab.acav.bgCurrentImage';
const LOCALSTORAGE_BG_PLAYLIST_TIMER = 'aleab.acav.bgPlaylistImageChangedTime';

const Logc = Log.getLogger('App', 'darkgreen');

interface AppProps {
    windowEvents: WindowEvents;
    options: Properties
}

export default function App(props: AppProps) {
    const O = useRef(props.options);

    window.acav.getProperties = () => _.cloneDeep(O.current);

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
    const { styleBackground, updateBackground, scheduleBackgroundImageChange } = useWallpaperBackground({
        localStorageKeys: {
            currentImage: LOCALSTORAGE_BG_CURRENT_IMAGE,
            playlistTimer: LOCALSTORAGE_BG_PLAYLIST_TIMER,
        },
        options: O,
    });
    const style = { ...styleBackground };

    // ==================================
    //  window.wallpaperPropertyListener
    // ==================================
    useEffect(() => {
        Logc.debug('Registering wallpaperPropertyListener callbacks...');

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
                        scheduleBackgroundImageChange(_timeRemaining >= 0 ? _timeRemaining : 0);
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
    }, [ onUserPropertiesChangedSubs, samplesBuffer, updateBackground, scheduleBackgroundImageChange ]);

    // =======================================
    //  window.wallpaperRegisterAudioListener
    // =======================================
    useEffect(() => {
        Logc.debug('Registering wallpaperRegisterAudioListener callback...');

        let samples: AudioSamplesArray | undefined;
        let peak: number = 0;
        const mean: number = 0;

        function _preProcessSamples(_samples: number[]): number[] {
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
                const peaks = samplesBuffer.samples.map((v, i, arr) => {
                    const w = 6 ** (i / arr.length - 1);
                    totalWeight += w;
                    return v.max() * w;
                }).concat(peak);

                peak = _.sumBy(peaks) / totalWeight;
                if (peak > 0) {
                    filteredSamples.forEach((_v, i) => {
                        filteredSamples[i] /= peak;                                             // NORMALIZE
                    });
                }
            }

            return filteredSamples;
        }

        let listenerIsPaused = false;
        window.acav.togglePauseAudioListener = () => {
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
            delete window.acav.togglePauseAudioListener;
        };
    }, [ onAudioSamplesSubs, samplesBuffer ]);

    const wallpaperContext = useMemo<WallpaperContextType>(() => {
        Logc.debug('Creating WallpaperContext...');
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
