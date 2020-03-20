import React, { CSSProperties, RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { TextScrollingType } from '../app/TextScrollingType';
import useScrollHTMLElement, { UseScrollHTMLElementOptions } from '../hooks/useScrollHTMLElement';

interface ScrollableLoopingTextProps {
    scrollType: TextScrollingType;
    scrollSpeed: number;
    scrollStartDelayMs: number;
    loopMarginEm: number;
    text: string;
    maxWidth: number;
    fontSize: number;

    render: (callback: () => void) => void;
    cancelRender: () => void;

    /** The className of the scrollable container. */
    className: string;
    textClassName: string;

    /** The style of the scrollable container. */
    style?: CSSProperties;
    textStyle?: CSSProperties;
}

function getComputedFontSize(el: HTMLElement) {
    return Number(getComputedStyle(el).fontSize.slice(0, -2));
}
function getComputedHorizontalMargin(el: HTMLElement) {
    return Number(getComputedStyle(el).marginLeft.slice(0, -2)) + Number(getComputedStyle(el).marginRight.slice(0, -2));
}

// ==============
//  Scroll Hooks
// ==============
// TODO: Refactor into separate files

function useLoopingText<TField extends HTMLElement, TScroll extends HTMLElement>(
    fieldRef: RefObject<TField>,
    scrollRef: RefObject<TScroll>,
    fieldText: string,
    loopMarginEm: number,
    containerWidth: number, fontSize: number,
): [ number | undefined, number ] {
    const loopMarginPx = useRef(0);
    const [ maxScrollWidth, setMaxScrollWidth ] = useState<number | undefined>(scrollRef.current?.scrollWidth ?? 0);
    useEffect(() => {
        // Update scroll width when any of the following changes
        ((..._deps: any[]) => {})(containerWidth, fontSize, fieldText);

        if (fieldRef.current !== null && scrollRef.current !== null) {
            const computedFontSize = getComputedFontSize(fieldRef.current);
            const computedXMargin = getComputedHorizontalMargin(fieldRef.current);

            fieldRef.current.innerHTML = fieldText;
            if (computedFontSize > 0) {
                loopMarginPx.current = loopMarginEm * computedFontSize;
                if (scrollRef.current.scrollWidth > scrollRef.current.offsetWidth) {
                    setMaxScrollWidth(scrollRef.current.scrollWidth - computedXMargin + loopMarginPx.current);
                    fieldRef.current.innerHTML = `${fieldText}<span style="margin-left: ${loopMarginPx.current}px;">${fieldText}</span>`;
                } else {
                    setMaxScrollWidth(scrollRef.current.scrollWidth);
                }
            } else {
                setMaxScrollWidth(undefined);
            }
        } else {
            setMaxScrollWidth(undefined);
        }
    }, [ containerWidth, fieldRef, fieldText, fontSize, loopMarginEm, scrollRef ]);

    return [ maxScrollWidth, loopMarginPx.current ];
}

function useTextScroll<TField extends HTMLElement, TScroll extends HTMLElement>(
    text: string,
    render: (callback: () => void) => void,
    cancelRender: () => void,
    scrollOptions: UseScrollHTMLElementOptions,
    loopMarginEm: number,
    containerWidth: number, fontSize: number,
): [
    string,
    RefObject<TField>,
    RefObject<TScroll>,
    (ondone?: () => void) => void,
    () => void,
    boolean,
] {
    const fieldRef = useRef<TField>(null);
    const scrollRef = useRef<TScroll>(null);
    const [ fieldScrollWidth, loopMarginPx ] = useLoopingText(fieldRef, scrollRef, text, loopMarginEm, containerWidth, fontSize);

    const isScrollingCallback = useCallback((currentScroll: number) => {
        return currentScroll > 0 && currentScroll < (fieldScrollWidth ?? 0) - loopMarginPx / 2;
    }, [ fieldScrollWidth, loopMarginPx ]);
    const [ scrollX, stopScrollX, isScrolling ] = useScrollHTMLElement(scrollRef, { maxScroll: fieldScrollWidth, render, cancelRender, isScrolling: isScrollingCallback, ...scrollOptions });

    return [ text, fieldRef, scrollRef, scrollX, stopScrollX, isScrolling ];
}

export default function ScrollableLoopingText(props: ScrollableLoopingTextProps) {
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

    const [ text, textRef, scrollRef, startScrolling, stopScrolling, isScrolling ] = useTextScroll<HTMLSpanElement, HTMLDivElement>(
        props.text,
        props.render,
        props.cancelRender,
        scrollOptions,
        props.loopMarginEm,
        props.maxWidth, props.fontSize,
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
        <span className={props.textClassName} style={props.textStyle} ref={textRef}>{text}</span>
      </div>
    );
}
