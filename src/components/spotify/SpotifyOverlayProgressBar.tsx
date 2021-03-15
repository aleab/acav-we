import _ from 'lodash';
import ColorConvert from 'color-convert';
import React, { CSSProperties, useContext, useEffect, useMemo, useRef, useState } from 'react';

import ProgressBar from '../ProgressBar';
import { darkenOrLightenRgbColor } from '../../common/Colors';
import { cssColorToRgba } from '../../common/Css';
import WallpaperContext from '../../app/WallpaperContext';

export interface SpotifyOverlayProgressBarProps {
    isPlaying: boolean;
    durationMs: number;
    progressMs: number;
    color: string;
    className?: string;
    style?: CSSProperties;
}

const PROGRESS_PREDICTION_UPDATE_INTERVAL_MS = 500;

function calcProgressPercent(progress: number, duration: number) {
    return duration > 0 ? (progress / duration) * 100 : 0;
}

export default function SpotifyOverlayProgressBar(props: SpotifyOverlayProgressBarProps) {
    const RENDER_ID = useMemo(() => `SpotifyOverlayProgressBar-${(Math.random() * (10 ** 6)).toFixed(6)}`, []);
    const context = useContext(WallpaperContext)!;

    // State and properties
    const [ progressPercent, setProgressPercent ] = useState(calcProgressPercent(props.progressMs, props.durationMs));
    const isPlaying = useRef(props.isPlaying);

    const containerColor = useMemo(() => {
        let _containerColor: string | undefined;
        const primaryRgba = cssColorToRgba(props.color);
        if (primaryRgba !== undefined) {
            let secondaryRgb = darkenOrLightenRgbColor([ primaryRgba[0], primaryRgba[1], primaryRgba[2] ], 0.6);
            if (secondaryRgb !== undefined) {
                const primaryHsv = ColorConvert.rgb.hsv([ primaryRgba[0], primaryRgba[1], primaryRgba[2] ]);
                const secondaryHsv = ColorConvert.rgb.hsv(secondaryRgb);
                const diffV = primaryHsv[2] - secondaryHsv[2];
                if (Math.abs(diffV) < 15) {
                    const k = diffV === 0
                        ? secondaryHsv[2] > 50 ? -10 : 10
                        : -Math.sign(diffV) * (10 - Math.abs(diffV));
                    secondaryHsv[2] = Math.clamp(secondaryHsv[2] + k, 0, 100);
                    secondaryRgb = ColorConvert.hsv.rgb(secondaryHsv);
                }
                _containerColor = `rgba(${secondaryRgb[0]}, ${secondaryRgb[1]}, ${secondaryRgb[2]}, ${primaryRgba[3]})`;
            }
        }
        return _containerColor;
    }, [props.color]);

    // NOTE: Occasionally, when the wallpaper is paused the useEffect down below goes haywire:
    //       the `interval` will not be cleared correctly causing the existence of two
    //       instances of the callback running at the same time but trying to set the progress
    //       percent to two different values. ¯\_(ツ)_/¯
    //       This `onPaused` callback should probably maybe possibly fix it (?)
    const pauseId = useRef(Math.random());
    const predictProgressIntervalHandle = useRef(0);
    useEffect(() => {
        function onPaused(e: PausedEventArgs) {
            if (!e.isPaused) {
                pauseId.current = Math.random();
            } else if (predictProgressIntervalHandle.current > 0) {
                clearInterval(predictProgressIntervalHandle.current);
                predictProgressIntervalHandle.current = 0;
            }
        }
        context.wallpaperEvents.onPaused.subscribe(onPaused);
        return () => {
            context.wallpaperEvents.onPaused.unsubscribe(onPaused);
        };
    }, [context.wallpaperEvents.onPaused]);

    // Update state
    useEffect(() => { isPlaying.current = props.isPlaying; }, [props.isPlaying]);
    useEffect(() => {
        context.renderer.queue(RENDER_ID, () => setProgressPercent(calcProgressPercent(props.progressMs, props.durationMs)));
        let PAUSE_ID = pauseId.current;

        if (predictProgressIntervalHandle.current > 0) {
            clearInterval(predictProgressIntervalHandle.current);
            predictProgressIntervalHandle.current = 0;
        }

        let predictedProgressMs = props.progressMs;
        const _predictProgressIntervalId = setInterval((() => {
            // Clean up and return ASAP if we hit the paused bug
            if (PAUSE_ID === -1) return;
            if (PAUSE_ID !== pauseId.current) {
                PAUSE_ID = -1;
                if (Number.isInteger(_predictProgressIntervalId)) {
                    clearInterval(_predictProgressIntervalId);
                }
                return;
            }

            if (isPlaying.current) {
                predictedProgressMs += PROGRESS_PREDICTION_UPDATE_INTERVAL_MS;
                context.renderer.queue(RENDER_ID, () => setProgressPercent(calcProgressPercent(predictedProgressMs, props.durationMs)));
            }
        }) as TimerHandler, PROGRESS_PREDICTION_UPDATE_INTERVAL_MS);
        predictProgressIntervalHandle.current = _predictProgressIntervalId;

        return () => {
            clearInterval(_predictProgressIntervalId);
            predictProgressIntervalHandle.current = 0;
            context.renderer.cancel(RENDER_ID);
        };
    }, [ RENDER_ID, context.renderer, props.durationMs, props.progressMs ]);

    const style = useMemo<CSSProperties & { [k: string]: string | undefined; }>(() => ({
        '--bar-color': containerColor,
        '--value-color': props.color,
    }), [ containerColor, props.color ]);

    return (
      <div className={_.join([ 'spotify-progress-bar', props.className ], ' ').trim()} style={{ ...style, ...props.style }}>
        <ProgressBar percent={progressPercent} spinner={false} />
      </div>
    );
}
