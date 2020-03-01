/* eslint-disable no-multi-spaces */

import _ from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import Log from '../common/Log';
import AudioSamplesArray from '../common/AudioSamplesArray';
import AudioSamplesBuffer from '../common/AudioSamplesBuffer';
import Properties, { applyUserProperties } from '../app/properties/Properties';
import { PINK_NOISE } from '../app/noise';
import { ScaleFunctionFactory } from '../app/ScaleFunction';
import WallpaperContext, { WallpaperContextType } from '../app/WallpaperContext';

import Stats from './Stats';
import BarVisualizer from './BarVisualizer';

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

    // ==================================
    //  window.wallpaperPropertyListener
    // ==================================
    useEffect(() => {
        Log.debug('%c[Wallpaper] Registering wallpaperPropertyListener callbacks...', 'color:crimson');

        window.wallpaperPropertyListener = {
            applyUserProperties: _props => {
                const oldProps = _.cloneDeep(O.current);
                const newProps = applyUserProperties(O.current, _props);

                // Log.debug('User properties applied', newProps);
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
    }, [ onUserPropertiesChangedSubs, samplesBuffer ]);

    // =======================================
    //  window.wallpaperRegisterAudioListener
    // =======================================
    useEffect(() => {
        Log.debug('%c[Wallpaper] Registering wallpaperRegisterAudioListener callback...', 'color:crimson');

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
        Log.debug('%c[Wallpaper] Creating WallpaperContext...', 'color:crimson');
        return {
            windowEvents: props.windowEvents,
            wallpaperEvents,
            wallpaperProperties: O.current,
        };
    }, [ props.windowEvents, wallpaperEvents ]);

    return (
      <WallpaperContext.Provider value={wallpaperContext}>
        {process.env.NODE_ENV !== 'production' ? <Stats /> : null}
        <BarVisualizer />
      </WallpaperContext.Provider>
    );
}

export default Wallpaper;
