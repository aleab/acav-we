import _ from 'lodash';
import { RefObject, useCallback, useEffect, useMemo, useRef } from 'react';

export type UseScrollHTMLElementOptions = {
    render: (scrollCallback: () => void) => void,
    axis: 'x' | 'y';
    scrollWidth?: number;
    scrollHeight?: number;
    thresholdPx: number;
    resetDelayMs: number;
};

const DEFAULT_OPTIONS: UseScrollHTMLElementOptions = {
    render: scrollCallback => scrollCallback(),
    axis: 'x',
    thresholdPx: 0,
    resetDelayMs: 1500,
};

export default function useScrollHTMLElement<T extends HTMLElement>(
    ref: RefObject<T>,
    msPerPixelScroll: number,
    opt: Partial<UseScrollHTMLElementOptions> = DEFAULT_OPTIONS,
): [
    (ondone?: () => void) => void,
    () => void,
] {
    const options = _.merge({}, DEFAULT_OPTIONS, opt);

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
    const _scrollWidth = options.scrollWidth ?? ref.current?.scrollWidth ?? 0;
    const _scrollHeight = options.scrollHeight ?? ref.current?.scrollHeight ?? 0;
    const _offsetWidth = ref.current?.offsetWidth ?? 0;
    const _offsetHeight = ref.current?.scrollHeight ?? 0;

    const currentScroll = useRef(0);
    const maxScroll = useMemo(() => {
        return options.axis === 'x' ? (_scrollWidth - _offsetWidth) : (_scrollHeight - _offsetHeight);
    }, [ _offsetHeight, _offsetWidth, _scrollHeight, _scrollWidth, options.axis ]);
    const isScrollable = useMemo(() => {
        const computedStyle = ref.current !== null ? getComputedStyle(ref.current) : undefined;
        return options.axis === 'x'
            ? computedStyle?.overflowX === 'scroll' && maxScroll > options.thresholdPx
            : computedStyle?.overflowY === 'scroll' && maxScroll > options.thresholdPx;
    }, [ maxScroll, options.axis, options.thresholdPx, ref ]);

    // =================
    //  Scroll callback
    // =================
    const scrollTimeoutId = useRef(0);
    const startScroll = useCallback((ondone?: () => void) => {
        ((..._deps) => {})(options.axis);
        if (isScrollable && scrollTimeoutId.current <= 0) {
            const timeoutHandler: TimerHandler = () => {
                if (currentScroll.current < maxScroll) {
                    scrollTimeoutId.current = setTimeout(timeoutHandler, msPerPixelScroll);
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
        }
    }, [ _renderScrollTo, isScrollable, maxScroll, msPerPixelScroll, options.axis, options.resetDelayMs ]);

    const stopScroll = useCallback(() => {
        clearTimeout(scrollTimeoutId.current);
        _renderResetScrollPosition(options.axis);
        currentScroll.current = 0;
        scrollTimeoutId.current = 0;
    }, [ _renderResetScrollPosition, options.axis ]);

    // =====================
    //  Reset scroll effect
    // =====================
    useEffect(() => {
        ((..._deps) => {})(maxScroll, isScrollable, options.axis);
        const prevAxis = options.axis;
        return () => {
            clearTimeout(scrollTimeoutId.current);
            _renderResetScrollPosition(prevAxis);
            currentScroll.current = 0;
            scrollTimeoutId.current = 0;
        };
    }, [ _renderResetScrollPosition, isScrollable, maxScroll, options.axis ]);

    return [ startScroll, stopScroll ];
}
