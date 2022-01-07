import { RGB } from 'color-convert/conversions';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import AudioSamplesArray from '../common/AudioSamplesArray';
import { TaskbarPosition } from '../app/TaskbarPosition';
import IPlugin from '../plugins/IPlugin';
import TaskbarPlugin from '../plugins/TaskbarPlugin';

interface WinTaskBarProps {
    small: boolean;
    /** [1.0, 2.0] */
    scale: number;
    size: number;
    position: TaskbarPosition;
    /** [0.0, 1.0] */
    brightness: number;
    plugin: IPlugin | null;
}

export default function WinTaskBar(props: WinTaskBarProps) {
    const canvas = useRef<HTMLCanvasElement>(null);

    const callback = useCallback((samples: AudioSamplesArray, colors: [readonly [number, number, number], readonly [number, number, number]][]) => {
        // NOTE: This callback is already inside a render job
        if (canvas.current === null) return;

        {
            const canvasContext = canvas.current.getContext('2d');
            if (canvasContext === null) return;

            canvasContext.canvas.width = props.position === TaskbarPosition.Left || props.position === TaskbarPosition.Right
                ? Math.floor((props.small ? 30 : 40) * props.scale * props.size)
                : window.innerWidth;
            canvasContext.canvas.height = props.position === TaskbarPosition.Top || props.position === TaskbarPosition.Bottom
                ? Math.floor((props.small ? 30 : 40) * props.scale * props.size)
                : window.innerHeight;

            canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
        }

        const N = samples.length;
        const minDimension = Math.min(canvas.current.width, canvas.current.height);
        const maxDimension = Math.max(canvas.current.width, canvas.current.height);
        const barWidth = props.position === TaskbarPosition.Top || props.position === TaskbarPosition.Bottom ? maxDimension / N : minDimension;
        const barHeight = props.position === TaskbarPosition.Left || props.position === TaskbarPosition.Right ? maxDimension / N : minDimension;

        const x0 = props.position === TaskbarPosition.Left ? 0
            : props.position === TaskbarPosition.Top || props.position === TaskbarPosition.Bottom ? 0.5 * canvas.current.width
            : props.position === TaskbarPosition.Right ? canvas.current.width - barWidth : 0;
        const y0 = props.position === TaskbarPosition.Bottom ? 0
            : props.position === TaskbarPosition.Left || props.position === TaskbarPosition.Right ? 0.5 * canvas.current.height
            : props.position === TaskbarPosition.Top ? canvas.current.height - barHeight : 0;

        samples.forEach((sample, i) => {
            if (canvas.current === null) return;

            const canvasContext = canvas.current.getContext('2d');
            if (canvasContext === null) return;

            canvasContext.beginPath();

            const dx = props.position === TaskbarPosition.Top || props.position === TaskbarPosition.Bottom ? [ (i + 1) * barWidth, i * barWidth ] : [ 0, 0 ];
            const dy = props.position === TaskbarPosition.Left || props.position === TaskbarPosition.Right ? [ (i + 1) * barHeight, i * barHeight ] : [ 0, 0 ];

            // left
            canvasContext.beginPath();
            canvasContext.setFillColorRgb(colors[i][0] as RGB);
            canvasContext.setStrokeColorRgb(colors[i][0] as RGB);
            canvasContext.rect(x0 - dx[0], y0 - dy[0], barWidth, barHeight);
            canvasContext.fill();
            canvasContext.stroke();

            // right
            canvasContext.beginPath();
            canvasContext.setFillColorRgb(colors[i][1] as RGB);
            canvasContext.setStrokeColorRgb(colors[i][1] as RGB);
            canvasContext.fillRect(x0 + dx[1], y0 + dy[1], barWidth, barHeight);
            canvasContext.fill();
            canvasContext.stroke();
        });
    }, [ props.position, props.scale, props.size, props.small ]);

    // Init plugin
    useEffect(() => {
        (props.plugin as TaskbarPlugin)?.subscribe?.(callback);
        return () => (props.plugin as TaskbarPlugin)?.unsubscribe?.(callback);
    }, [ callback, props.plugin ]);

    const className = useMemo(() => {
        switch (props.position) {
            case TaskbarPosition.Left: return 'left';
            case TaskbarPosition.Top: return 'top';
            case TaskbarPosition.Right: return 'right';
            case TaskbarPosition.Bottom: return 'bottom';
            default: return undefined;
        }
    }, [props.position]);
    return (
      <canvas ref={canvas} id="winTaskbarCanvas" className={className} style={{ filter: `brightness(${props.brightness})` }} />
    );
}
