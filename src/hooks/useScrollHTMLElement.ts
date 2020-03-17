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
};

const DEFAULT_OPTIONS: PickRequiredOptional<UseScrollHTMLElementOptions> = {
    msPerPixelScroll: 50,
    scrollWidth: 0,
    scrollHeight: 0,
    startDelayMs: 4000,
    resetDelayMs: 2000,
    thresholdPx: 0,
    render: scrollCallback => scrollCallback(),
};

export default function useScrollHTMLElement<T extends HTMLElement>(
    ref: RefObject<T>,
    opt: UseScrollHTMLElementOptions,
): [
    (ondone?: () => void) => void,
    () => void,
] {
    const options: Required<UseScrollHTMLElementOptions> = _.merge({}, DEFAULT_OPTIONS, opt);

    // ==================
    //  Render callbacks
    // ==================
    const _render = options.render;
    const _renderScrollTo = useCallback((px: number, behavior: 'smooth' | 'auto' = 'smooth') => {
        const axis = options.axis;
        _render(() => {
            ref.current?.scrollTo(axis === 'x' ? { left: px, behavior } : { top: px, behavior });
        });
    }, [ _render, options.axis, ref ]);
    const _renderResetScrollPosition = useCallback((axis: 'x' | 'y') => {
        if (axis === 'x') {
            _render(() => { if (ref.current !== null) ref.current.scrollLeft = 0; });
        } else {
            _render(() => { if (ref.current !== null) ref.current.scrollTop = 0; });
        }
    }, [ _render, ref ]);

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

    const delayStartPx = useMemo(() => options.startDelayMs / options.msPerPixelScroll, [ options.msPerPixelScroll, options.startDelayMs ]);
    const delayResetPx = useMemo(() => options.resetDelayMs / options.msPerPixelScroll, [ options.msPerPixelScroll, options.resetDelayMs ]);
    const currentScroll = useRef(options.type === 'auto' ? -delayStartPx : 0);

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
                        scrollTimeoutId.current = setTimeout(timeoutHandler, options.msPerPixelScroll);
                        currentScroll.current++;
                        _renderScrollTo(currentScroll.current);
                    } else {
                        const doneHandler: TimerHandler = () => {
                            currentScroll.current = 0;
                            _renderScrollTo(currentScroll.current, 'auto');
                            if (ondone !== undefined) ondone();
                            scrollTimeoutId.current = 0;
                        };
                        if (options.resetDelayMs > 0) {
                            scrollTimeoutId.current = setTimeout(doneHandler, options.resetDelayMs);
                        } else {
                            doneHandler();
                        }
                    }
                };
                timeoutHandler();
            } else if (options.type === 'auto') {
                // AUTO SCROLL
                scrollTimeoutId.current = setInterval((() => {
                    if (currentScroll.current < maxScroll + delayResetPx) {
                        currentScroll.current++;
                        _renderScrollTo(currentScroll.current);
                    } else {
                        currentScroll.current = -delayStartPx;
                        _renderScrollTo(currentScroll.current, 'auto');
                    }
                }) as TimerHandler, options.msPerPixelScroll);
            }
        }
    }, [ _renderScrollTo, delayResetPx, delayStartPx, isScrollable, maxScroll, options.axis, options.msPerPixelScroll, options.resetDelayMs, options.type ]);

    const stopScroll = useCallback(() => {
        if (options.type === 'manual') {
            clearTimeout(scrollTimeoutId.current);
        } else if (options.type === 'auto') {
            clearInterval(scrollTimeoutId.current);
        }
        _renderResetScrollPosition(options.axis);
        currentScroll.current = options.type === 'auto' ? -delayStartPx : 0;
        scrollTimeoutId.current = 0;
    }, [ _renderResetScrollPosition, delayStartPx, options.axis, options.type ]);

    // ==============
    //  Reset scroll
    // ==============
    useEffect(() => {
        // Reset current
        if (options.type === 'manual') {
            clearTimeout(scrollTimeoutId.current);
        } else if (options.type === 'auto') {
            clearInterval(scrollTimeoutId.current);
        }
        _renderResetScrollPosition(options.axis);
        currentScroll.current = options.type === 'auto' ? -delayStartPx : 0;
        scrollTimeoutId.current = 0;

        // Reset previous
        const prevType = options.type;
        const prevAxis = options.axis;
        return () => {
            // NOTE: prevType and options.type are exactly the same in here regardless of the *current* value of options.type (same for prevAxis);
            //       I'm just using named variables for clarity.
            if (prevType === 'manual') {
                clearTimeout(scrollTimeoutId.current);
            } else if (prevType === 'auto') {
                clearInterval(scrollTimeoutId.current);
            }
            _renderResetScrollPosition(prevAxis);
        };
    }, [ _renderResetScrollPosition, delayStartPx, options.axis, options.type ]);

    return [ startScroll, stopScroll ];
}
