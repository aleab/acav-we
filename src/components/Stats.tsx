import _ from 'lodash';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';

import { FaExclamationTriangle, FaSkull } from '../fa';

import Log from '../common/Log';
import AudioSamplesArray from '../common/AudioSamplesArray';
import { RenderEventArgs } from '../app/Renderer';
import { SpotifyStateMachineState } from '../app/SpotifyStateMachine';
import WallpaperContext from '../app/WallpaperContext';
import useCanvas2dTimeGraph, { UseCanvas2dTimeGraphOptions } from '../hooks/useCanvas2dTimeGraph';

const Logc = Log.getLogger('Stats', '#323338');

function useCanvasOptions(resolution: number, valueRef: React.MutableRefObject<number>, refreshInterval: number, showAverage?: boolean) {
    return useMemo<UseCanvas2dTimeGraphOptions>(() => ({
        width: 140,
        height: 30,
        resolution,
        refreshInterval,
        getValue: () => valueRef.current,
        showAverage: showAverage ?? true,
    }), [ refreshInterval, resolution, showAverage, valueRef ]);
}

const AUDIOLISTENER_CALLRATE_NOTGOOD = 18;
const AUDIOLISTENER_CALLRATE_LAGGY = 12;

export default function Stats() {
    const context = useContext(WallpaperContext);
    const [ resolution, setResolution ] = useState(1);

    const [ requestAnimationFrameRate, setRequestAnimationFrameRate ] = useState(0);
    const [ renderRate, setRenderRate ] = useState({ fps: 0, renderTime: 0 });
    const audioSamplesPerChannelRef = useRef(0);
    const [ audioSamplesPerChannel, setAudioSamplesPerChannel ] = useState(0);
    const [ audioSamplesMean, setAudioSamplesMean ] = useState(0);
    const [ audioSamplesPeak, setAudioSamplesPeak ] = useState(0);

    const [ enteredAudioListenerCallbackRate, setEnteredAudioListenerCallbackRate ] = useState(0);
    const [ executedAudioListenerCallbackTime, setExecutedAudioListenerCallbackTime ] = useState(0);
    const [ visualizerRenderRate, setVisualizerRenderRate ] = useState(0);
    const [ visualizerPreProcessingTime, setVisualizerPreProcessingTime ] = useState(0);
    const [ visualizerRenderTime, setVisualizerRenderTime ] = useState(0);
    const [ visualizerPluginsRenderTime, setVisualizerPluginsRenderTime ] = useState(0);
    const [ visualizerRenderDelay, setVisualizerRenderDelay ] = useState(0);

    const [ spotifyState, setSpotifyState ] = useState<SpotifyStateMachineState | null>(null);
    const [ spotifyCurrentlyPlaying, setSpotifyCurrentlyPlaying ] = useState<string | null>(null);
    const [ spotifyLastStatusCode, setSpotifyLastStatusCode ] = useState(0);

    // These refs are used in the graphs
    const canvasRenderTime = useRef(0);
    const canvasAudioSamplesMean = useRef(0);
    const canvasAudioSamplesPeak = useRef(0);
    const canvasExecutedAudioListenerCallbackTime = useRef(0);
    const canvasVisualizerPreProcessingTime = useRef(0);
    const canvasVisualizerRenderTime = useRef(0);
    const canvasVisualizerPluginsRenderTime = useRef(0);

    useEffect(() => {
        Logc.info('Initializing component...');

        let requestAnimationFrameCount = 0;
        let renderCount = 0;
        let renderTimeCount = 0;
        let prevRenderTimestamp = 0;

        let audioSamples: AudioSamplesArray | undefined;
        let audioMeanCount = [ 0, 0 ];
        let audioPeakCount = [ 0, 0 ];

        let enteredAudioListenerCallbackCount = 0;
        let executedAudioListenerCallbackCount = [ 0, 0 ];
        let visualizerRenderedCount = 0;
        let visualizerRenderedPreProcessingTimeCount = [ 0, 0 ];
        let visualizerRenderedRenderTimeCount = [ 0, 0 ];
        let visualizerRenderedPluginsRenderTimeCount = [ 0, 0 ];

        // Every 1000ms
        const perSecondIntervalId = setInterval((() => {
            // Renderer
            setRequestAnimationFrameRate(requestAnimationFrameCount);
            setRenderRate({
                fps: renderCount,
                renderTime: renderCount > 0 ? renderTimeCount / renderCount : 0,
            });
            requestAnimationFrameCount = 0;
            renderCount = 0;
            renderTimeCount = 0;

            // Audio Data
            setAudioSamplesPerChannel(audioSamplesPerChannelRef.current);

            // Stats
            setEnteredAudioListenerCallbackRate(enteredAudioListenerCallbackCount);
            enteredAudioListenerCallbackCount = 0;
            setVisualizerRenderRate(visualizerRenderedCount);
            visualizerRenderedCount = 0;
        }) as TimerHandler, 1000);

        // Every 150ms
        const per150MillisecondsIntervalId = setInterval((() => {
            // Audio Data
            canvasAudioSamplesMean.current = audioMeanCount[1] > 0 ? audioMeanCount[0] / audioMeanCount[1] : 0;
            canvasAudioSamplesPeak.current = audioPeakCount[1] > 0 ? audioPeakCount[0] / audioPeakCount[1] : 0;
            setAudioSamplesMean(canvasAudioSamplesMean.current);
            setAudioSamplesPeak(canvasAudioSamplesPeak.current);
            audioMeanCount = [ 0, 0 ];
            audioPeakCount = [ 0, 0 ];

            // Stats
            canvasExecutedAudioListenerCallbackTime.current = executedAudioListenerCallbackCount[1] > 0 ? executedAudioListenerCallbackCount[0] / executedAudioListenerCallbackCount[1] : 0;
            setExecutedAudioListenerCallbackTime(canvasExecutedAudioListenerCallbackTime.current);
            executedAudioListenerCallbackCount = [ 0, 0 ];

            canvasVisualizerPreProcessingTime.current = visualizerRenderedPreProcessingTimeCount[1] > 0 ? visualizerRenderedPreProcessingTimeCount[0] / visualizerRenderedPreProcessingTimeCount[1] : 0;
            setVisualizerPreProcessingTime(canvasVisualizerPreProcessingTime.current);
            visualizerRenderedPreProcessingTimeCount = [ 0, 0 ];

            canvasVisualizerRenderTime.current = visualizerRenderedRenderTimeCount[1] > 0 ? visualizerRenderedRenderTimeCount[0] / visualizerRenderedRenderTimeCount[1] : 0;
            setVisualizerRenderTime(canvasVisualizerRenderTime.current);
            visualizerRenderedRenderTimeCount = [ 0, 0 ];

            canvasVisualizerPluginsRenderTime.current = visualizerRenderedPluginsRenderTimeCount[1] > 0 ? visualizerRenderedPluginsRenderTimeCount[0] / visualizerRenderedPluginsRenderTimeCount[1] : 0;
            setVisualizerPluginsRenderTime(canvasVisualizerPluginsRenderTime.current);
            visualizerRenderedPluginsRenderTimeCount = [ 0, 0 ];

            setVisualizerRenderDelay(context?.audioHistory.delay ?? 0);
        }) as TimerHandler, 150);

        // =======================
        //  requestAnimationFrame
        // =======================
        let requestAnimationFrameId = 0;
        const requestAnimationFrameCallback = () => {
            requestAnimationFrameId = requestAnimationFrame(requestAnimationFrameCallback);
            requestAnimationFrameCount++;
        };
        requestAnimationFrameId = requestAnimationFrame(requestAnimationFrameCallback);

        // ===================
        //  RENDERED CALLBACK
        // ===================
        const frameRendererCallback = (e: RenderEventArgs) => {
            renderCount++;
            canvasRenderTime.current = prevRenderTimestamp > 0 ? (e.timestamp - prevRenderTimestamp) : 0;
            renderTimeCount += canvasRenderTime.current;
            prevRenderTimestamp = e.timestamp;
        };
        context?.renderer.onAfterRender.subscribe(frameRendererCallback);

        // ========================
        //  AUDIO SAMPLES CALLBACK
        // ========================
        const audioSamplesCallback = (args: AudioSamplesEventArgs) => {
            audioSamplesPerChannelRef.current = args.samples.length;

            audioMeanCount[0] += args.mean;
            audioMeanCount[1]++;
            audioPeakCount[0] += args.peak;
            audioPeakCount[1]++;
        };
        context?.wallpaperEvents.onAudioSamples.subscribe(audioSamplesCallback);

        // ========================
        //  STATS EVENTS CALLBACKS
        // ========================
        const enteredAudioListenerCallbackCallback = (args: PerformanceEventArgs) => {
            enteredAudioListenerCallbackCount++;
        };
        context?.wallpaperEvents.stats.enteredAudioListenerCallback.subscribe(enteredAudioListenerCallbackCallback);
        const executedAudioListenerCallbackCallback = (args: PerformanceEventArgs) => {
            executedAudioListenerCallbackCount[0] += args.time;
            executedAudioListenerCallbackCount[1]++;
        };
        context?.wallpaperEvents.stats.executedAudioListenerCallback.subscribe(executedAudioListenerCallbackCallback);
        const visualizerRenderedCallback = (args: [PerformanceEventArgs, PerformanceEventArgs, PerformanceEventArgs]) => {
            visualizerRenderedCount++;
            visualizerRenderedPreProcessingTimeCount[0] += args[0].time;
            visualizerRenderedPreProcessingTimeCount[1]++;
            visualizerRenderedRenderTimeCount[0] += args[1].time;
            visualizerRenderedRenderTimeCount[1]++;
            visualizerRenderedPluginsRenderTimeCount[0] += args[2].time;
            visualizerRenderedPluginsRenderTimeCount[1]++;
        };
        context?.wallpaperEvents.stats.visualizerRendered.subscribe(visualizerRenderedCallback);

        // ==========================
        //  SPOTIFY EVENTS CALLBACKS
        // ==========================
        const spotifyStateChangedCallback = (args: SpotifyStateChangedEventArgs) => {
            setSpotifyState(args.newState === null ? null : args.newState.value as SpotifyStateMachineState);
        };
        context?.wallpaperEvents.spotify.stateChanged.subscribe(spotifyStateChangedCallback);
        const spotifyCurrentlyPlayingChangedCallback = (args: SpotifyCurrentlyPlayingChangedEventArgs) => {
            setSpotifyCurrentlyPlaying(args.item?.uri ?? null);
            setSpotifyLastStatusCode(args.res);
        };
        context?.wallpaperEvents.spotify.currentlyPlayingChanged.subscribe(spotifyCurrentlyPlayingChangedCallback);

        // =============================
        //  PROPERTIES CHANGED CALLBACK
        // =============================
        const userPropertiesChangedCallback = (args: UserPropertiesChangedEventArgs) => {
            if (args.newProps.audioprocessing === false) {
                audioSamples?.clear();
            }
        };
        context?.wallpaperEvents.onUserPropertiesChanged.subscribe(userPropertiesChangedCallback);

        const generalPropertiesChangedCallback = (args: GeneralPropertiesChangedEventArgs) => {
            if (args.newProps.resolution !== undefined) {
                setResolution(args.newProps.resolution === 'half' ? 0.5 : 1);
            }
        };
        context?.wallpaperEvents.onGeneralPropertiesChanged.subscribe(generalPropertiesChangedCallback);

        return () => {
            clearInterval(perSecondIntervalId);
            clearInterval(per150MillisecondsIntervalId);
            cancelAnimationFrame(requestAnimationFrameId);
            context?.renderer.onAfterRender.unsubscribe(frameRendererCallback);
            context?.wallpaperEvents.onAudioSamples.unsubscribe(audioSamplesCallback);
            context?.wallpaperEvents.onUserPropertiesChanged.unsubscribe(userPropertiesChangedCallback);
            context?.wallpaperEvents.onGeneralPropertiesChanged.unsubscribe(generalPropertiesChangedCallback);
            context?.wallpaperEvents.stats.enteredAudioListenerCallback.unsubscribe(enteredAudioListenerCallbackCallback);
            context?.wallpaperEvents.stats.executedAudioListenerCallback.unsubscribe(executedAudioListenerCallbackCallback);
            context?.wallpaperEvents.stats.visualizerRendered.unsubscribe(visualizerRenderedCallback);
            context?.wallpaperEvents.spotify.stateChanged.unsubscribe(spotifyStateChangedCallback);
            context?.wallpaperEvents.spotify.currentlyPlayingChanged.unsubscribe(spotifyCurrentlyPlayingChangedCallback);
        };
    }, [context]);

    // ==========
    //  CANVASES
    // ==========
    // const renderTimeCanvasOptions = useCanvasOptions(resolution, canvasRenderTime, 50);
    // const renderTimeCanvas = useCanvas2dTimeGraph(renderTimeCanvasOptions);

    const audioSamplesMeanCanvasOptions = useCanvasOptions(resolution, canvasAudioSamplesMean, 50);
    const [ audioSamplesMeanCanvas, audioSamplesMeanV ] = useCanvas2dTimeGraph(audioSamplesMeanCanvasOptions);
    const audioSamplesPeakCanvasOptions = useCanvasOptions(resolution, canvasAudioSamplesPeak, 50);
    const [ audioSamplesPeakCanvas, audioSamplesPeakV ] = useCanvas2dTimeGraph(audioSamplesPeakCanvasOptions);

    const executedAudioListenerCallbackTimeCanvasOptions = useCanvasOptions(resolution, canvasExecutedAudioListenerCallbackTime, 50);
    const [ executedAudioListenerCallbackTimeCanvas, executedAudioListenerCallbackTimeV ] = useCanvas2dTimeGraph(executedAudioListenerCallbackTimeCanvasOptions);
    const visualizerPreProcessingTimeCanvasOptions = useCanvasOptions(resolution, canvasVisualizerPreProcessingTime, 50);
    const [ visualizerPreProcessingTimeCanvas, visualizerPreProcessingTimeV ] = useCanvas2dTimeGraph(visualizerPreProcessingTimeCanvasOptions);
    const visualizerRenderTimeCanvasOptions = useCanvasOptions(resolution, canvasVisualizerRenderTime, 50);
    const [ visualizerRenderTimeCanvas, visualizerRenderTimeV ] = useCanvas2dTimeGraph(visualizerRenderTimeCanvasOptions);
    const visualizerPluginsRenderTimeCanvasOptions = useCanvasOptions(resolution, canvasVisualizerPluginsRenderTime, 50);
    const [ visualizerPluginsRenderTimeCanvas, visualizerPluginsRenderTimeV ] = useCanvas2dTimeGraph(visualizerPluginsRenderTimeCanvasOptions);

    return (
      <div id="stats" className="overlay bg-noise p-2" style={{ left: 0, bottom: 30 * resolution, fontSize: 14 * resolution }}>
        <div className="h">Renderer</div>
        <table>
          <tbody>
            <tr>
              <th>
                <code>requestAnimationFrame</code>
                <span> Rate</span>
              </th>
              <td colSpan={2}>{`${requestAnimationFrameRate} calls/s`}</td>
            </tr>
            <tr>
              <th>
                <code>flushRenderQueue</code>
                <span> Rate</span>
              </th>
              <td colSpan={2}>{`${renderRate.fps} calls/s`}</td>
            </tr>
            {/* <tr>
              <th>Render Time</th>
              <td className="pr-3">{`${renderRate.renderTime.toFixed(2)}ms`}</td>
              <td className="lh-0"><canvas ref={renderTimeCanvas} width={0} height={0} /></td>
            </tr> */}
          </tbody>
        </table>

        <div className="h">Audio Data</div>
        <table>
          <tbody>
            <tr>
              <th>Size</th>
              <td colSpan={3}>{`${audioSamplesPerChannel} samples/ch.`}</td>
            </tr>
            <tr>
              <th>Mean</th>
              <td className="pr-3">{audioSamplesMean.toFixed(6)}</td>
              <td className="lh-0"><canvas ref={audioSamplesMeanCanvas} width={0} height={0} /></td>
              <td className="canvas-minmax">
                <div>
                  <span>{audioSamplesMeanV.max.current.toFixed(6)}</span>
                  <span>{audioSamplesMeanV.min.current.toFixed(6)}</span>
                </div>
              </td>
            </tr>
            <tr>
              <th>Peak</th>
              <td className="pr-3">{audioSamplesPeak.toFixed(6)}</td>
              <td className="lh-0"><canvas ref={audioSamplesPeakCanvas} width={0} height={0} /></td>
              <td className="canvas-minmax">
                <div>
                  <span>{audioSamplesPeakV.max.current.toFixed(6)}</span>
                  <span>{audioSamplesPeakV.min.current.toFixed(6)}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="h">WE AudioListener Callback</div>
        <table>
          <tbody>
            <tr>
              <th>Call Rate</th>
              <td colSpan={3}>
                <span className="mr-2">{`${enteredAudioListenerCallbackRate} calls/s`}</span>
                {
                    enteredAudioListenerCallbackRate <= AUDIOLISTENER_CALLRATE_LAGGY ? (
                      <FaSkull color="hsla(0, 100%, 32%, 0.69)" />
                    ) : enteredAudioListenerCallbackRate <= AUDIOLISTENER_CALLRATE_NOTGOOD ? (
                      <FaExclamationTriangle color="hsla(45, 100%, 50%, 0.69)" />
                    ) : null
                }
              </td>
            </tr>
            <tr>
              <th>Execution Time</th>
              <td className="pr-3">{`${executedAudioListenerCallbackTime.toFixed(4)}ms`}</td>
              <td className="lh-0"><canvas ref={executedAudioListenerCallbackTimeCanvas} width={0} height={0} /></td>
              <td className="canvas-minmax">
                <div>
                  <span>{executedAudioListenerCallbackTimeV.max.current.toFixed(4)}</span>
                  <span>{executedAudioListenerCallbackTimeV.min.current.toFixed(4)}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="h">Visualizer</div>
        <table>
          <tbody>
            <tr>
              <th>Render Rate</th>
              <td colSpan={3}>{`${visualizerRenderRate}fps`}</td>
            </tr>
            <tr>
              <th>Render Time</th>
              <td className="pr-3">{`${visualizerRenderTime.toFixed(4)}ms`}</td>
              <td className="lh-0"><canvas ref={visualizerRenderTimeCanvas} width={0} height={0} /></td>
              <td className="canvas-minmax">
                <div>
                  <span>{visualizerRenderTimeV.max.current.toFixed(4)}</span>
                  <span>{visualizerRenderTimeV.min.current.toFixed(4)}</span>
                </div>
              </td>
            </tr>
            <tr>
              <th>Pre-Processing Time</th>
              <td className="pr-3">{`${visualizerPreProcessingTime.toFixed(4)}ms`}</td>
              <td className="lh-0"><canvas ref={visualizerPreProcessingTimeCanvas} width={0} height={0} /></td>
              <td className="canvas-minmax">
                <div>
                  <span>{visualizerPreProcessingTimeV.max.current.toFixed(4)}</span>
                  <span>{visualizerPreProcessingTimeV.min.current.toFixed(4)}</span>
                </div>
              </td>
            </tr>
            <tr>
              <th>Plugins Render Time</th>
              <td className="pr-3">{`${visualizerPluginsRenderTime.toFixed(4)}ms`}</td>
              <td className="lh-0"><canvas ref={visualizerPluginsRenderTimeCanvas} width={0} height={0} /></td>
              <td className="canvas-minmax">
                <div>
                  <span>{visualizerPluginsRenderTimeV.max.current.toFixed(4)}</span>
                  <span>{visualizerPluginsRenderTimeV.min.current.toFixed(4)}</span>
                </div>
              </td>
            </tr>
            <tr>
              <th>Render Delay</th>
              <td colSpan={3}>{`${visualizerRenderDelay.toFixed(0)}ms`}</td>
            </tr>
          </tbody>
        </table>

        {
            spotifyState !== null ? (
              <>
                <div className="h">Spotify</div>
                <table>
                  <tbody>
                    <tr>
                      <th>State</th>
                      <td colSpan={2}>{spotifyState}</td>
                    </tr>
                    <tr style={{ height: 24 }}>
                      <th>Currently Playing</th>
                      <td>{`(${spotifyLastStatusCode})`}</td>
                      <td style={{ maxWidth: 350, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {spotifyCurrentlyPlaying !== null ? decodeURI(spotifyCurrentlyPlaying).replace('spotify:', '') : 'null'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            ) : null
        }
      </div>
    );
}
