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
) {
    const [ fieldScrollWidth, setFieldScrollWidth ] = useState<number | undefined>(scrollRef.current?.scrollWidth ?? 0);
    useEffect(() => {
        // Update scroll width when any of the following changes
        ((..._deps: any[]) => {})(containerWidth, fontSize, fieldText);

        if (fieldRef.current !== null && scrollRef.current !== null) {
            const fieldComputedFontSize = getComputedFontSize(fieldRef.current);
            fieldRef.current.innerHTML = fieldText;
            if (fieldComputedFontSize > 0) {
                const paddingPx = loopMarginEm * fieldComputedFontSize;
                if (scrollRef.current.scrollWidth > scrollRef.current.offsetWidth) {
                    setFieldScrollWidth(scrollRef.current.scrollWidth + paddingPx + scrollRef.current.offsetWidth);
                    fieldRef.current.innerHTML = `${fieldText}<span style="margin-left: ${paddingPx}px;">${fieldText}</span>`;
                } else {
                    setFieldScrollWidth(scrollRef.current.scrollWidth);
                }
            } else {
                setFieldScrollWidth(undefined);
            }
        } else {
            setFieldScrollWidth(undefined);
        }
    }, [ containerWidth, fieldRef, fieldText, fontSize, loopMarginEm, scrollRef ]);

    return fieldScrollWidth;
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
] {
    const fieldRef = useRef<TField>(null);
    const scrollRef = useRef<TScroll>(null);
    const fieldScrollWidth = useLoopingText(fieldRef, scrollRef, text, loopMarginEm, containerWidth, fontSize);

    const [ scrollX, stopScrollX ] = useScrollHTMLElement(scrollRef, { scrollWidth: fieldScrollWidth, render, cancelRender, ...scrollOptions });

    return [ text, fieldRef, scrollRef, scrollX, stopScrollX ];
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

    const [ text, textRef, scrollRef, startScrolling, stopScrolling ] = useTextScroll<HTMLSpanElement, HTMLDivElement>(
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

    return (
      <div className={props.className} style={props.style} ref={scrollRef} onMouseOver={onMouseOver} onFocus={onMouseOver}>
        <span className={props.textClassName} style={props.textStyle} ref={textRef}>{text}</span>
      </div>
    );
}
