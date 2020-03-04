import _ from 'lodash';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import Log from '../common/Log';
import AudioSamplesArray from '../common/AudioSamplesArray';
import WallpaperContext from '../app/WallpaperContext';
import useCanvas2dTimeGraph, { UseCanvas2dTimeGraphOptions } from '../hooks/useCanvas2dTimeGraph';

const Logc = Log.getLogger('Stats', '#323338');

export default function Stats() {
    const context = useContext(WallpaperContext);

    const [ frameRate, setFrameRate ] = useState({ fps: 0, frameTime: 0 });
    const [ audioUpdatesPerSecond, setAudioUpdatesPerSecond ] = useState(0);
    const [ audioSamplesPerChannel, setAudioSamplesPerChannel ] = useState(0);
    const [ audioSamplesMean, setAudioSamplesMean ] = useState(0);
    const [ audioSamplesPeak, setAudioSamplesPeak ] = useState(0);

    // These refs are used in the graphs
    const fps = useRef(0);
    const frameTime = useRef(0);

    useEffect(() => {
        Logc.debug('Initializing component...');

        let frameCount = 0;
        let frameTimeCount = 0;
        let prevAnimationTimestamp = 0;

        let audioSamples: AudioSamplesArray | undefined;
        let audioUpdatesCount = 0;
        let audioSamplesPerChannelCount = 0;
        let audioMeanCount = [ 0, 0 ];
        let audioPeakCount = [ 0, 0 ];

        const perSecondIntervalId = setInterval((() => {
            // Frame rate
            fps.current = frameCount;
            setFrameRate({
                fps: fps.current,
                frameTime: frameCount > 0 ? frameTimeCount / frameCount : 0,
            });
            frameCount = 0;
            frameTimeCount = 0;

            // Audio Data
            setAudioUpdatesPerSecond(audioUpdatesCount);
            setAudioSamplesPerChannel(audioUpdatesCount > 0 ? Math.round(audioSamplesPerChannelCount / audioUpdatesCount) : 0);
            audioUpdatesCount = 0;
            audioSamplesPerChannelCount = 0;
        }) as TimerHandler, 1000);

        // Audio Data
        const audioDataStateIntervalId = setInterval((() => {
            setAudioSamplesMean(audioMeanCount[1] > 0 ? audioMeanCount[0] / audioMeanCount[1] : 0);
            setAudioSamplesPeak(audioPeakCount[1] > 0 ? audioPeakCount[0] / audioPeakCount[1] : 0);
            audioMeanCount = [ 0, 0 ];
            audioPeakCount = [ 0, 0 ];
        }) as TimerHandler, 150);

        // ==========================
        //  ANIMATION FRAME CALLBACK
        // ==========================
        let requestAnimationFrameId = 0;
        const frameRequestCallback = () => {
            const timestamp = performance.now();
            requestAnimationFrameId = window.requestAnimationFrame(frameRequestCallback);

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
            audioSamplesPerChannelCount += audioSamples.length;

            audioMeanCount[0] += args.mean;
            audioMeanCount[1]++;
            audioPeakCount[0] += args.peak;
            audioPeakCount[1]++;
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
            clearInterval(audioDataStateIntervalId);
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
            <tr>
              <th>Peak</th>
              <td colSpan={2}>{`${audioSamplesPeak.toFixed(6)}`}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
}
