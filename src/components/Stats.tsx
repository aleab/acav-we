import _ from 'lodash';
import React, { useContext, useEffect, useState } from 'react';

import AudioSamplesArray from '../common/AudioSamplesArray';
import WallpaperContext from '../app/WallpaperContext';

interface StatsProps {}

export default function Stats(props: StatsProps) {
    const [ audioSamplesMean, setAudioSamplesMean ] = useState(0);
    const [ audioSamplesPerSecond, setAudioSamplesPerSecond ] = useState(0);
    const [ fps, setFps ] = useState(0);
    const [ frameTime, setFrameTime ] = useState(0);

    const context = useContext(WallpaperContext);

    useEffect(() => {
        let audioSamplesCount = 0;
        let audioSamples: AudioSamplesArray | undefined;

        let animationFrameCount = 0;
        let animationFrameTime = 0;
        let prevAnimationTime = 0;

        const userPropertiesChangedCallback = (args: UserPropertiesChangedEventArgs) => {
            if (args.newProps.audioprocessing === false) {
                audioSamples?.clear();
            }
        };
        context?.wallpaperEvents.onUserPropertiesChanged.subscribe(userPropertiesChangedCallback);

        // Sample rate
        const $samplingRateIntervalId = setInterval(() => {
            setAudioSamplesPerSecond(audioSamplesCount);
            audioSamplesCount = 0;
        }, 1000);
        const audioSamplesCallback = (args: AudioSamplesEventArgs) => {
            audioSamples = args.samples;
            audioSamplesCount++;
        };

        // Mean & FPS
        let $animationFrameId = 0;
        const animationFrameCallback = (time: number) => {
            if (audioSamples) {
                setAudioSamplesMean((
                    _.mean(audioSamples.raw.slice(0, audioSamples.raw.length / 2)) +
                    _.mean(audioSamples.raw.slice(audioSamples.raw.length / 2))) / 2);
            }

            animationFrameCount++;
            animationFrameTime += prevAnimationTime > 0 ? (time - prevAnimationTime) : 0;
            prevAnimationTime = time;

            $animationFrameId = window.requestAnimationFrame(animationFrameCallback);
        };
        const $fpsIntervalId = setInterval(() => {
            const _f = animationFrameCount;
            const _ft = animationFrameTime;
            animationFrameCount = 0;
            animationFrameTime = 0;

            setFps(_f);
            setFrameTime(_ft / _f);
        }, 1000);

        $animationFrameId = window.requestAnimationFrame(animationFrameCallback);
        context?.wallpaperEvents.onAudioSamples.subscribe(audioSamplesCallback);

        return () => {
            clearInterval($samplingRateIntervalId);
            if ($animationFrameId) {
                window.cancelAnimationFrame($animationFrameId);
            }
            clearInterval($fpsIntervalId);
            context?.wallpaperEvents.onAudioSamples.unsubscribe(audioSamplesCallback);
            context?.wallpaperEvents.onUserPropertiesChanged.unsubscribe(userPropertiesChangedCallback);
        };
    }, [context]);

    return (
      <div id="stats">
        <div>{`FPS: ${fps} (${frameTime.toFixed(2)}ms)`}</div>
        <div>{`Sample rate: ${audioSamplesPerSecond} ∙ 64 Hz`}</div>
        <div>{`Mean: ${audioSamplesMean.toFixed(6)}`}</div>
      </div>
    );
}
