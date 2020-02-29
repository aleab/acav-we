/* eslint-disable no-multi-spaces */

import _ from 'lodash';
import React, { useEffect, useMemo } from 'react';

import Log from '../common/Log';
import AudioSamplesArray from '../common/AudioSamplesArray';
import { PINK_NOISE } from '../app/noise';
import Properties, { applyUserProperties } from '../app/properties/Properties';
import WallpaperContext, { WallpaperContextType } from '../app/WallpaperContext';

import Stats from './Stats';
import BarVisualizer from './BarVisualizer';
import AudioSamplesBuffer from '../common/AudioSamplesBuffer';
import { ScaleFunctionFactory } from '../app/ScaleFunction';

interface WallpaperProps {
    windowEvents: WindowEvents;
    options: Properties
}

export function Wallpaper(props: WallpaperProps) {
    useEffect(() => Log.debug('[Wallpaper]', props.options));
    const O = props.options;

    const onUserPropertiesChangedSubs: Set<(args: UserPropertiesChangedEventArgs) => void> = new Set();
    const onAudioSamplesSubs: Set<(args: AudioSamplesEventArgs) => void> = new Set();
    const wallpaperEvents: WallpaperEvents = {
        onUserPropertiesChanged: {
            subscribe: callback => { onUserPropertiesChangedSubs.add(callback); },
            unsubscribe: callback => { onUserPropertiesChangedSubs.delete(callback); },
        },
        onAudioSamples: {
            subscribe: callback => { onAudioSamplesSubs.add(callback); },
            unsubscribe: callback => { onAudioSamplesSubs.delete(callback); },
        },
    };

    const samplesBuffer = new AudioSamplesBuffer(1 + O.audioSamples.bufferLength);

    // window.wallpaperPropertyListener
    useEffect(() => {
        window.wallpaperPropertyListener = {
            applyUserProperties: _props => {
                const oldProps = _.cloneDeep(O);
                const newProps = applyUserProperties(O, _props);

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
    }, [ O, onUserPropertiesChangedSubs, samplesBuffer ]);

    // window.wallpaperRegisterAudioListener
    useEffect(() => {
        let samples: AudioSamplesArray | undefined;
        let peak: number = 0;
        const mean: number = 0;

        function _preProcessSamples(_samples: number[]): number[] {
            const shouldCorrectSamples = O.audioSamples.correctSamples;
            const scaleFn = ScaleFunctionFactory.buildScaleFunction(O.audioSamples.scale);

            const filteredSamples = _samples.map((vin, i) => {
                let vout = vin;
                if (shouldCorrectSamples) {
                    vout /= PINK_NOISE[i % PINK_NOISE.length];                                      // CORRECT SAMPLES
                }
                vout *= (1 + O.audioSamples.audioVolumeGain / 100);                     // LINEAR GAIN
                vout = vout >= O.audioSamples.audioFreqThreshold / 1000 ? vout : 0;     // THRESHOLD

                vout = scaleFn(vout);                                                               // SCALE
                return vout;
            });

            peak = _.max(filteredSamples) ?? 0;

            if (O.audioSamples.normalize) {
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
    }, [ O, onAudioSamplesSubs, samplesBuffer ]);

    const wallpaperContext = useMemo<WallpaperContextType>(() => ({
        windowEvents: props.windowEvents,
        wallpaperEvents,
        wallpaperProperties: O,
    }), [ O, props.windowEvents, wallpaperEvents ]);

    return (
      <WallpaperContext.Provider value={wallpaperContext}>
        {process.env.NODE_ENV !== 'production' ? <Stats /> : null}
        <BarVisualizer />
      </WallpaperContext.Provider>
    );
}

export default Wallpaper;
