/* eslint-disable no-param-reassign */
import _ from 'lodash';
import { useCallback, useEffect, useRef } from 'react';

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
        canvas.current!.style.backgroundColor = options.backgroundColor ?? 'black';
        context.current!.strokeStyle = options.lineColor ?? 'green';
        context.current!.lineWidth = 1;
    }, [ assertCanvasAndContextAreDefined, options.backgroundColor, options.lineColor ]);

    // Refresh interval
    useEffect(() => {
        assertCanvasAndContextAreDefined();
        const _canvas = canvas.current!;
        const _context = context.current!;

        const values: Array<number> = [];
        const dt = options.refreshInterval ?? 100;
        const dx = _canvas.width / ((options.duration ?? 5 * 1000) / dt);

        const getPointY = (value: number, max: number) => {
            return _canvas.height - (_canvas.height - 4) * (value / max) - 2;
        };

        const intervalId = setInterval((() => {
            _context.clearRect(0, 0, _canvas.width, _canvas.height);
            if (values.length * dx > _canvas.width) {
                values.shift();
            }

            const value = options.getValue();
            values.push(value);

            if (values.length > 1) {
                const max = _.max(values) ?? 1;
                if (options.showAverage) {
                    const _color = _context.strokeStyle;
                    const meanY = getPointY(_.mean(values) ?? 0, max);

                    _context.strokeStyle = _.isString(options.showAverage) ? options.showAverage : '#DADA0069';
                    _context.beginPath();
                    _context.moveTo(0, meanY);
                    _context.lineTo(_canvas.width, meanY);
                    _context.stroke();
                    _context.strokeStyle = _color;
                }

                _context.beginPath();
                _context.moveTo(0, getPointY(values[0], max));
                for (let i = 1; i < values.length; ++i) {
                    _context.lineTo(i * dx, getPointY(values[i], max));
                }
                _context.stroke();
            }
        }) as TimerHandler, options.refreshInterval);

        return () => {
            values.length = 0;
            _context?.clearRect(0, 0, _canvas.width, _canvas.height);
            clearInterval(intervalId);
        };
    }, [ assertCanvasAndContextAreDefined, options ]);

    return canvas;
}
