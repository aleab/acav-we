import _ from 'lodash';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import Log from '../common/Log';
import AudioSamplesArray from '../common/AudioSamplesArray';
import WallpaperContext from '../app/WallpaperContext';
import useCanvas2dTimeGraph, { UseCanvas2dTimeGraphOptions } from '../hooks/useCanvas2dTimeGraph';

const Logc = Log.getLogger('Stats', '#323338');

interface StatsProps {}

export default function Stats(props: StatsProps) {
    const context = useContext(WallpaperContext);

    const [ frameRate, setFrameRate ] = useState({ fps: 0, frameTime: 0 });
    const [ audioUpdatesPerSecond, setAudioUpdatesPerSecond ] = useState(0);
    const [ audioSamplesPerChannel, setAudioSamplesPerChannel ] = useState(0);
    const [ audioSamplesMean, setAudioSamplesMean ] = useState(0);

    // These refs are used in the graphs
    const fps = useRef(0);
    const frameTime = useRef(0);

    useEffect(() => {
        Logc.debug('Initializing component...');

        let audioSamples: AudioSamplesArray | undefined;
        let audioUpdatesCount = 0;

        let frameCount = 0;
        let frameTimeCount = 0;
        let prevAnimationTimestamp = 0;

        const perSecondIntervalId = setInterval(() => {
            // Sample rate
            setAudioUpdatesPerSecond(audioUpdatesCount);
            audioUpdatesCount = 0;

            // FPS and Frame Time
            fps.current = frameCount;
            setFrameRate({
                fps: fps.current,
                frameTime: frameTimeCount / frameCount,
            });
            frameCount = 0;
            frameTimeCount = 0;
        }, 1000);

        // ==========================
        //  ANIMATION FRAME CALLBACK
        // ==========================
        let requestAnimationFrameId = 0;
        const frameRequestCallback = () => {
            const timestamp = performance.now();
            requestAnimationFrameId = window.requestAnimationFrame(frameRequestCallback);

            if (audioSamples) {
                setAudioSamplesPerChannel(audioSamples.length);
                setAudioSamplesMean((
                    _.mean(audioSamples.raw.slice(0, audioSamples.raw.length / 2)) +
                    _.mean(audioSamples.raw.slice(audioSamples.raw.length / 2))) / 2);
            }

            frameCount++;
            frameTime.current = prevAnimationTimestamp > 0 ? (timestamp - prevAnimationTimestamp) : 0;
            frameTimeCount += frameTime.current;
            prevAnimationTimestamp = timestamp;
        };
        requestAnimationFrameId = window.requestAnimationFrame(frameRequestCallback);

        // ========================
        //  AUDIO SAMPLES CALLBACK
        // ========================
        const audioSamplesCallback = (args: AudioSamplesEventArgs) => {
            audioSamples = args.samples;
            audioUpdatesCount++;
        };
        context?.wallpaperEvents.onAudioSamples.subscribe(audioSamplesCallback);

        // =============================
        //  PROPERTIES CHANGED CALLBACK
        // =============================
        const userPropertiesChangedCallback = (args: UserPropertiesChangedEventArgs) => {
            if (args.newProps.audioprocessing === false) {
                audioSamples?.clear();
            }
        };
        context?.wallpaperEvents.onUserPropertiesChanged.subscribe(userPropertiesChangedCallback);

        return () => {
            clearInterval(perSecondIntervalId);
            window.cancelAnimationFrame(requestAnimationFrameId);
            context?.wallpaperEvents.onAudioSamples.unsubscribe(audioSamplesCallback);
            context?.wallpaperEvents.onUserPropertiesChanged.unsubscribe(userPropertiesChangedCallback);
        };
    }, [context]);

    // ===========================
    //  FPS & FRAME TIME CANVASES
    // ===========================
    const fpsCanvasOptions = useMemo<UseCanvas2dTimeGraphOptions>(() => ({
        width: 140,
        height: 30,
        refreshInterval: 500,
        getValue: () => fps.current,
        showAverage: false,
    }), []);
    const fpsCanvas = useCanvas2dTimeGraph(fpsCanvasOptions);
    const frameTimeCanvasOptions = useMemo<UseCanvas2dTimeGraphOptions>(() => ({
        width: 140,
        height: 30,
        refreshInterval: 50,
        getValue: () => frameTime.current,
    }), []);
    const frameTimeCanvas = useCanvas2dTimeGraph(frameTimeCanvasOptions);

    return (
      <div id="stats" className="p-1">
        <table>
          <tbody>
            <tr>
              <th>Frame rate</th>
              <td><div>{`${frameRate.fps}fps`}</div></td>
              <td><canvas ref={fpsCanvas} /></td>
            </tr>
            <tr>
              <th>Frame time</th>
              <td><div>{`${frameRate.frameTime.toFixed(2)}ms`.padEnd(9, '\u00A0')}</div></td>
              <td><canvas ref={frameTimeCanvas} /></td>
            </tr>
            <tr>
              <th>Audio Data</th>
              <td colSpan={2}>{`${audioUpdatesPerSecond}⨯${2 * audioSamplesPerChannel} Hz`}</td>
            </tr>
            <tr>
              <th>Mean</th>
              <td colSpan={2}>{`${audioSamplesMean.toFixed(6)}`}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
}
