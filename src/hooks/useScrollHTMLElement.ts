import _ from 'lodash';
import { RefObject, useCallback, useEffect, useMemo, useRef } from 'react';

import { PickRequiredOptional } from '../@types/types';

export type UseScrollHTMLElementOptions = {
    msPerPixelScroll?: number;
    type: 'auto' | 'manual' | 'none';
    axis: 'x' | 'y';
    scrollWidth?: number;
    scrollHeight?: number;
    startDelayMs?: number;
    resetDelayMs?: number;
    thresholdPx?: number;
    render?: (scrollCallback: () => void) => void;
    cancelRender?: () => void;
};

const DEFAULT_OPTIONS: PickRequiredOptional<UseScrollHTMLElementOptions> = {
    msPerPixelScroll: 50,
    scrollWidth: 0,
    scrollHeight: 0,
    startDelayMs: 4000,
    resetDelayMs: 2000,
    thresholdPx: 0,
    render: scrollCallback => scrollCallback(),
    cancelRender: () => {},
};

export default function useScrollHTMLElement<T extends HTMLElement>(
    ref: RefObject<T>,
    opt: UseScrollHTMLElementOptions,
): [
    (ondone?: () => void) => void,
    () => void,
] {
    const options: Required<UseScrollHTMLElementOptions> = _.merge({}, DEFAULT_OPTIONS, opt);

    // =======
    //  State
    // =======
    const _scrollWidth = options.scrollWidth > 0 ? options.scrollWidth : (ref.current?.scrollWidth ?? 0);
    const _scrollHeight = options.scrollHeight > 0 ? options.scrollHeight : (ref.current?.scrollHeight ?? 0);
    const _offsetWidth = ref.current?.offsetWidth ?? 0;
    const _offsetHeight = ref.current?.scrollHeight ?? 0;

    const maxScroll = useMemo(() => {
        return options.axis === 'x' ? (_scrollWidth - _offsetWidth) : (_scrollHeight - _offsetHeight);
    }, [ _offsetHeight, _offsetWidth, _scrollHeight, _scrollWidth, options.axis ]);
    const isScrollable = useMemo(() => {
        const computedStyle = ref.current !== null ? getComputedStyle(ref.current) : undefined;
        return options.axis === 'x'
            ? computedStyle?.overflowX === 'scroll' && maxScroll > options.thresholdPx
            : computedStyle?.overflowY === 'scroll' && maxScroll > options.thresholdPx;
    }, [ maxScroll, options.axis, options.thresholdPx, ref ]);

    const msPerPixelScroll = useRef(options.msPerPixelScroll);
    const startDelayMs = useRef(options.startDelayMs);
    const resetDelayMs = useRef(options.resetDelayMs);
    const currentScroll = useRef(options.type === 'auto' ? -(startDelayMs.current / msPerPixelScroll.current) : 0);

    // ==============
    //  Update state
    // ==============
    // Keep state updates seamless, so that the animation doesn't restart every time
    useEffect(() => { msPerPixelScroll.current = options.msPerPixelScroll; }, [options.msPerPixelScroll]);
    useEffect(() => { startDelayMs.current = options.startDelayMs; }, [options.startDelayMs]);
    useEffect(() => { resetDelayMs.current = options.resetDelayMs; }, [options.resetDelayMs]);

    // ==================
    //  Render callbacks
    // ==================
    const _renderScrollLock = useRef(false);
    const _render = options.render;
    const _cancelRender = options.cancelRender;

    const _renderScrollTo = useCallback((px: number) => {
        if (_renderScrollLock.current) return;
        const axis = options.axis;
        _render(() => {
            if (ref.current === null || _renderScrollLock.current) return;
            ref.current.scrollTo(axis === 'x' ? { left: px, behavior: 'auto' } : { top: px, behavior: 'auto' });
            //console.log('Scrolling to %s', px);
        });
    }, [ _render, options.axis, ref ]);

    const _renderResetScrollPosition = useCallback((axis: 'x' | 'y') => {
        if (ref.current === null) return;
        const startPx = options.type === 'auto' ? -(startDelayMs.current / msPerPixelScroll.current) : 0;

        _renderScrollLock.current = true;
        _cancelRender();
        _render(() => {
            if (ref.current !== null) {
                if (axis === 'x') {
                    ref.current.scrollLeft = startPx;
                } else {
                    ref.current.scrollTop = startPx;
                }
                //console.log('%cReset scroll position to %s', 'font-weight:bolder', startPx);
            }
            _renderScrollLock.current = false;
        });
        currentScroll.current = startPx;
    }, [ _cancelRender, _render, options.type, ref ]);

    // =================
    //  Scroll callback
    // =================
    // Scrolling past maxScroll* has no effect and will just set the scroll to maxScroll*
    // We can use this to implement a reset-to-0 delay.
    // Similarly, we can use values < 0 to implement a start delay.
    const scrollTimeoutId = useRef(0);
    const startScroll = useCallback((ondone?: () => void) => {
        ((..._deps) => {})(options.axis, options.type);
        if (isScrollable && scrollTimeoutId.current <= 0) {
            if (options.type === 'manual') {
                // MANUAL SCROLL
                const timeoutHandler: TimerHandler = () => {
                    if (currentScroll.current < maxScroll) {
                        scrollTimeoutId.current = setTimeout(timeoutHandler, msPerPixelScroll.current);
                        _renderScrollTo(++currentScroll.current);
                    } else {
                        const doneHandler: TimerHandler = () => {
                            _renderResetScrollPosition(options.axis);
                            if (ondone !== undefined) ondone();
                            scrollTimeoutId.current = 0;
                        };
                        if (resetDelayMs.current > 0) {
                            scrollTimeoutId.current = setTimeout(doneHandler, resetDelayMs.current);
                        } else {
                            doneHandler();
                        }
                    }
                };
                timeoutHandler();
            } else if (options.type === 'auto') {
                // AUTO SCROLL
                const timeoutHandler: TimerHandler = () => {
                    scrollTimeoutId.current = setTimeout(timeoutHandler, msPerPixelScroll.current);
                    if (currentScroll.current < maxScroll + (resetDelayMs.current / msPerPixelScroll.current)) {
                        _renderScrollTo(++currentScroll.current);
                    } else {
                        _renderResetScrollPosition(options.axis);
                    }
                };
                timeoutHandler();
            }
        }
    }, [ _renderResetScrollPosition, _renderScrollTo, isScrollable, maxScroll, options.axis, options.type ]);

    // NOTE: This is probably useless
    const stopScroll = useCallback(() => {
        clearTimeout(scrollTimeoutId.current);
        _renderResetScrollPosition(options.axis);
        _renderScrollLock.current = false;
        scrollTimeoutId.current = 0;
    }, [ _renderResetScrollPosition, options.axis ]);

    // ==============
    //  Reset scroll
    // ==============
    useEffect(() => {
        ((..._deps) => {})(maxScroll, isScrollable);

        // Reset current
        clearTimeout(scrollTimeoutId.current);
        _renderScrollLock.current = false;
        _renderResetScrollPosition(options.axis);
        scrollTimeoutId.current = 0;

        // Reset previous
        const prevAxis = options.axis;
        return () => {
            // NOTE: prevAxis and options.axis are exactly the same in here regardless of the *current* value of options.axis;
            //       I'm just using named variables for clarity.
            clearTimeout(scrollTimeoutId.current);
            _renderScrollLock.current = false;
            _renderResetScrollPosition(prevAxis);
            scrollTimeoutId.current = 0;
        };
    }, [ _renderResetScrollPosition, isScrollable, maxScroll, options.axis ]);

    return [ startScroll, stopScroll ];
}
