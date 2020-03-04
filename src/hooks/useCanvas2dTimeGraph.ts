/* eslint-disable no-param-reassign */
import _ from 'lodash';
import { useCallback, useEffect, useRef } from 'react';
import { OptionalKeys } from 'utility-types';

export interface UseCanvas2dTimeGraphOptions {
    width: number;
    height: number;
    backgroundColor?: string;
    lineColor?: string;
    refreshInterval?: number;
    duration?: number;
    getValue(): number;
    showAverage?: boolean | string;
}

const DEFAULT_OPTIONS: Required<Pick<UseCanvas2dTimeGraphOptions, OptionalKeys<UseCanvas2dTimeGraphOptions>>> & {
    showAverage: string;
} = {
    backgroundColor: 'black',
    lineColor: 'green',
    refreshInterval: 100,
    duration: 5 * 1000,
    showAverage: '#D4C103',
};

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
        canvas.current!.width = options.width;
        canvas.current!.height = options.height;
        context.current = canvas.current!.getContext('2d') ?? undefined;
    }, [ options.height, options.width ]);

    // Style
    useEffect(() => {
        assertCanvasAndContextAreDefined();
        canvas.current!.style.backgroundColor = options.backgroundColor ?? DEFAULT_OPTIONS.backgroundColor;
        context.current!.strokeStyle = options.lineColor ?? DEFAULT_OPTIONS.lineColor;
        context.current!.lineWidth = 1;
    }, [ assertCanvasAndContextAreDefined, options.backgroundColor, options.lineColor ]);

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
