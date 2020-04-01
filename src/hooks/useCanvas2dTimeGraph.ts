/* eslint-disable no-param-reassign */
import _ from 'lodash';
import { useCallback, useEffect, useRef } from 'react';

export interface UseCanvas2dTimeGraphOptions {
    width: number;
    height: number;
    /** Graph's resolution factor ∈ (0,∞). [default: 1] */
    resolution?: number;
    /** A CSS-style background color. [default: 'black'] */
    backgroundColor?: string;
    /** A CSS-style foreground color. [default: 'green'] */
    lineColor?: string;
    /** Refresh interval in milliseconds. [default: 100] */
    refreshInterval?: number;
    /** The width of the graph in milliseconds. [default: 5000] */
    duration?: number;
    /** The function that's going to provide the live value to plot against time. */
    getValue(): number;
    /** Whether to draw an horizontal line representing the average of the currently plotted values.
     *  The value should be either a boolean or a string representing a CSS-style color for the line. [default: #D4C103] */
    showAverage?: boolean | string;
}

const DEFAULT_OPTIONS: Required<Pick<UseCanvas2dTimeGraphOptions, OptionalKeys<UseCanvas2dTimeGraphOptions>>> & {
    showAverage: string;
} = {
    resolution: 1,
    backgroundColor: 'black',
    lineColor: 'green',
    refreshInterval: 100,
    duration: 5 * 1000,
    showAverage: '#D4C103',
};

/**
 * Plots a value vs time graph on a canvas.
 * @returns A {@link React.RefObject<HTMLCanvasElement>} that needs to be bound to a DOM's canvas element.
 */
export default function useCanvas2dTimeGraph(options: UseCanvas2dTimeGraphOptions) {
    const canvas = useRef<HTMLCanvasElement>(null);
    const context = useRef<CanvasRenderingContext2D>();

    const assertCanvasAndContextAreDefined = useCallback(() => {
        if (canvas.current === null) throw new Error('Canvas ref is not bound to any DOM element!');
        if (context.current === undefined) throw new Error('Canvas context is undefined!');
    }, []);

    // Size
    useEffect(() => {
        if (canvas.current === null) throw new Error('Canvas ref is not bound to any DOM element!');
        canvas.current!.width = options.width * (options.resolution ?? DEFAULT_OPTIONS.resolution);
        canvas.current!.height = options.height * (options.resolution ?? DEFAULT_OPTIONS.resolution);
        context.current = canvas.current!.getContext('2d') ?? undefined;
    }, [ options.height, options.width, options.resolution ]);

    // Style
    useEffect(() => {
        assertCanvasAndContextAreDefined();
        canvas.current!.style.backgroundColor = options.backgroundColor ?? DEFAULT_OPTIONS.backgroundColor;
        context.current!.strokeStyle = options.lineColor ?? DEFAULT_OPTIONS.lineColor;
        context.current!.lineWidth = options.resolution ?? DEFAULT_OPTIONS.resolution;
    }, [ assertCanvasAndContextAreDefined, options.resolution, options.backgroundColor, options.lineColor ]);

    // Refresh interval
    useEffect(() => {
        assertCanvasAndContextAreDefined();
        const _canvas = canvas.current!;
        const _context = context.current!;

        const values: Array<number> = [];
        const dt = options.refreshInterval ?? DEFAULT_OPTIONS.refreshInterval;
        const dx = _canvas.width / ((options.duration ?? DEFAULT_OPTIONS.duration) / dt);

        const getPointY = (value: number, max: number) => {
            const h = max > 0 ? (_canvas.height - 4) * (value / max) : 0;
            return _canvas.height - h - 2;
        };

        let timeoutId = 0;
        const render = () => {
            _context.clearRect(0, 0, _canvas.width, _canvas.height);
            if (values.length * dx > _canvas.width) {
                values.shift();
            }

            const value = options.getValue();
            values.push(value);

            if (values.length > 1) {
                const max = _.max(values) ?? 1;

                _context.beginPath();
                _context.moveTo(0, getPointY(values[0], max));
                for (let i = 1; i < values.length; ++i) {
                    _context.lineTo(i * dx, getPointY(values[i], max));
                }
                _context.stroke();

                if (options.showAverage !== false && (options.showAverage || DEFAULT_OPTIONS.showAverage)) {
                    const _color = _context.strokeStyle;
                    const meanY = getPointY(_.mean(values) ?? 0, max);

                    _context.strokeStyle = _.isString(options.showAverage) ? options.showAverage : DEFAULT_OPTIONS.showAverage;
                    _context.beginPath();
                    _context.moveTo(0, meanY);
                    _context.lineTo(_canvas.width, meanY);
                    _context.stroke();
                    _context.strokeStyle = _color;
                }
            }

            timeoutId = setTimeout(render as TimerHandler, options.refreshInterval);
        };
        render();

        return () => {
            values.length = 0;
            _context?.clearRect(0, 0, _canvas.width, _canvas.height);
            clearTimeout(timeoutId);
        };
    }, [ assertCanvasAndContextAreDefined, options ]);

    return canvas;
}
