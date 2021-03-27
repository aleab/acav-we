import React, { CSSProperties, useCallback, useEffect, useMemo, useReducer } from 'react';

import { TextScrollingType } from '../app/TextScrollingType';
import useLoopingTextScroll from '../hooks/useLoopingTextScroll';
import { UseScrollHTMLElementOptions } from '../hooks/useScrollHTMLElement';

interface ScrollableLoopingTextProps {
    scrollType: TextScrollingType | false;
    scrollSpeed: number;
    scrollStartDelayMs: number;
    loopMarginEm: number;
    text: string;
    maxWidth: number;
    fontSize: number;
    forceRefreshScrollableArea?: React.MutableRefObject<(() => void) | undefined>;

    render: (callback: () => void) => void;
    cancelRender: () => void;

    /** The className of the scrollable container. */
    className: string;
    textClassName: string;

    /** The style of the scrollable container. */
    style?: CSSProperties;
    textStyle?: CSSProperties;
}

export default function ScrollableLoopingText(props: ScrollableLoopingTextProps) {
    const [ _forceAreaRecalc, forceAreaRecalc ] = useReducer((prev: boolean) => !prev, false);
    useEffect(() => {
        if (props.forceRefreshScrollableArea) {
            props.forceRefreshScrollableArea.current = () => forceAreaRecalc();
        }
    }, [props.forceRefreshScrollableArea]);

    const scrollOptions = useMemo<UseScrollHTMLElementOptions>(() => {
        return {
            msPerPixelScroll: 1000 / props.scrollSpeed,
            type: props.scrollType === TextScrollingType.Automatic ? 'auto'
                : props.scrollType === TextScrollingType.OnMouseOver ? 'manual' : 'none',
            axis: 'x',
            startDelayMs: props.scrollStartDelayMs * 1000,
            resetDelayMs: 0,
        };
    }, [ props.scrollSpeed, props.scrollStartDelayMs, props.scrollType ]);

    const [ textRef, scrollRef, startScrolling, stopScrolling, isScrolling ] = useLoopingTextScroll<HTMLSpanElement, HTMLDivElement>(
        props.text,
        props.render,
        props.cancelRender,
        scrollOptions,
        props.loopMarginEm,
        [ props.maxWidth, props.fontSize, _forceAreaRecalc ],
    );

    useEffect(() => {
        if (props.scrollType === TextScrollingType.Automatic) startScrolling();
    }, [ props.scrollType, startScrolling ]);

    const onMouseOver = useCallback(() => {
        if (props.scrollType === TextScrollingType.OnMouseOver) startScrolling();
    }, [ props.scrollType, startScrolling ]);

    const className = isScrolling ? `${props.className} scrolling` : props.className;
    return (
      <div className={className} style={props.style} ref={scrollRef} onMouseOver={onMouseOver} onFocus={onMouseOver}>
        <span className={props.textClassName} style={props.textStyle} ref={textRef}>{props.text}</span>
      </div>
    );
}
