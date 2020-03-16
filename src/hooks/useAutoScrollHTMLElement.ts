import _ from 'lodash';
import { RefObject, useCallback, useEffect, useMemo, useRef } from 'react';

export type UseAutoScrollHTMLElementOptions = {
    render: (scrollCallback: () => void) => void,
    axis: 'x' | 'y';
    msDelayStart: number;
    msDelayReset: number;
    scrollWidth?: number;
    scrollHeight?: number;
    thresholdPx: number;
};

const DEFAULT_OPTIONS: UseAutoScrollHTMLElementOptions = {
    render: scrollCallback => scrollCallback(),
    axis: 'x',
    msDelayStart: 4000,
    msDelayReset: 2000,
    thresholdPx: 0,
};

/**
 * @param ref
 * @param msPerPixelScroll How many milliseconds to wait between each 1px scroll iteration
 */
export default function useAutoScrollHTMLElement<T extends HTMLElement>(
    ref: RefObject<T>,
    msPerPixelScroll: number,
    opt: Partial<UseAutoScrollHTMLElementOptions> = DEFAULT_OPTIONS,
) {
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

    const maxScroll = useMemo(() => {
        return options.axis === 'x' ? (_scrollWidth - _offsetWidth) : (_scrollHeight - _offsetHeight);
    }, [ _offsetHeight, _offsetWidth, _scrollHeight, _scrollWidth, options.axis ]);
    const isScrollable = useMemo(() => {
        const computedStyle = ref.current !== null ? getComputedStyle(ref.current) : undefined;
        return options.axis === 'x'
            ? computedStyle?.overflowX === 'scroll' && maxScroll > options.thresholdPx
            : computedStyle?.overflowY === 'scroll' && maxScroll > options.thresholdPx;
    }, [ maxScroll, options.axis, options.thresholdPx, ref ]);

    const delayStartPx = useMemo(() => options.msDelayStart / msPerPixelScroll, [ msPerPixelScroll, options.msDelayStart ]);
    const delayResetPx = useMemo(() => options.msDelayReset / msPerPixelScroll, [ msPerPixelScroll, options.msDelayReset ]);
    const currentScroll = useRef(-delayStartPx);

    // ===============
    //  Scroll effect
    // ===============
    // Scrolling past maxScroll* has no effect and will just set the scroll to maxScroll*
    // We can use this to implement a reset-to-0 delay.
    // Similarly, we can use values < 0 to implement a start delay.
    const scrollIntervalId = useRef(0);
    useEffect(() => {
        ((..._deps) => {})(options.axis);
        if (ref.current !== null) {
            if (isScrollable && scrollIntervalId.current <= 0) {
                console.log(
                    'setInterval | currentScroll.current: %s, delayStartPx: %s, delayResetPx: %s',
                    currentScroll.current,
                    delayStartPx,
                    delayResetPx,
                );
                scrollIntervalId.current = setInterval((() => {
                    if (currentScroll.current < maxScroll + delayResetPx) {
                        currentScroll.current++;
                        _renderScrollTo(currentScroll.current);
                    } else {
                        currentScroll.current = -delayStartPx;
                        _renderScrollTo(currentScroll.current, 'auto');
                    }
                }) as TimerHandler, msPerPixelScroll);
            }
        }
    }, [ _renderScrollTo, delayResetPx, delayStartPx, isScrollable, maxScroll, msPerPixelScroll, options.axis, ref ]);

    // =====================
    //  Reset scroll effect
    // =====================
    useEffect(() => {
        ((..._deps) => {})(options.axis, maxScroll, isScrollable, delayStartPx, delayResetPx);
        const prevAxis = options.axis;
        return () => {
            clearInterval(scrollIntervalId.current);
            _renderResetScrollPosition(prevAxis);
            currentScroll.current = -delayStartPx;
            scrollIntervalId.current = 0;
        };
    }, [ _renderResetScrollPosition, delayResetPx, delayStartPx, isScrollable, maxScroll, options.axis ]);
}
