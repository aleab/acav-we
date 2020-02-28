/* eslint-disable no-multi-spaces */

import _ from 'lodash';
import React, { useEffect, useMemo } from 'react';

import Log from '../common/Log';
import { ScaleFunctions } from '../app/ScaleFunction';
import AudioSamplesArray from '../common/AudioSamplesArray';
import { PINK_NOISE } from '../app/noise';
import WallpaperProperties, { applyUserProperties } from '../app/properties';
import WallpaperContext, { WallpaperContextType } from '../app/WallpaperContext';

import Stats from './Stats';
import BarVisualizer from './BarVisualizer';
import AudioSamplesBuffer from '../common/AudioSamplesBuffer';

interface WallpaperProps {
    windowEvents: WindowEvents;
    options: WallpaperProperties
}

export function Wallpaper(props: WallpaperProps) {
    useEffect(() => Log.debug('[Wallpaper]', props.options));

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

    const samplesBuffer = new AudioSamplesBuffer(1 + props.options.audioSamples.bufferLength);

    // window.wallpaperPropertyListener
    useEffect(() => {
        window.wallpaperPropertyListener = {
            applyUserProperties: _props => {
                const oldProps = _.cloneDeep(props.options);
                const newProps = applyUserProperties(props.options, _props);

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
    }, [ props.options, onUserPropertiesChangedSubs, samplesBuffer ]);

    // window.wallpaperRegisterAudioListener
    useEffect(() => {
        let samples: AudioSamplesArray | undefined;
        let peak: number = 0;
        const mean: number = 0;

        function _preProcessSamples(_samples: number[]): number[] {
            const shouldCorrectSamples = props.options.audioSamples.correctSamples;
            const scaleFn = ScaleFunctions[props.options.audioSamples.scale] ?? (x => x);

            const filteredSamples = _samples.map((vin, i) => {
                let vout = vin;
                if (shouldCorrectSamples) {
                    vout /= PINK_NOISE[i % PINK_NOISE.length];                                      // CORRECT SAMPLES
                }
                vout *= (1 + props.options.audioSamples.audioVolumeGain / 100);                     // LINEAR GAIN
                vout = vout >= props.options.audioSamples.audioFreqThreshold / 1000 ? vout : 0;     // THRESHOLD

                vout = scaleFn(vout);                                                               // SCALE
                return vout;
            });

            peak = _.max(filteredSamples) ?? 0;

            if (props.options.audioSamples.normalize) {
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
    }, [ props.options, onAudioSamplesSubs, samplesBuffer ]);

    const wallpaperContext = useMemo<WallpaperContextType>(() => ({
        windowEvents: props.windowEvents,
        wallpaperEvents,
        wallpaperProperties: props.options,
    }), [ props.options, props.windowEvents, wallpaperEvents ]);

    return (
      <WallpaperContext.Provider value={wallpaperContext}>
        {process.env.NODE_ENV !== 'production' ? <Stats /> : null}
        <BarVisualizer />
      </WallpaperContext.Provider>
    );
}

export default Wallpaper;
