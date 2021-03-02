import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

import useScrollHTMLElement, { UseScrollHTMLElementOptions } from './useScrollHTMLElement';

function getComputedFontSize(el: HTMLElement) {
    return Number(getComputedStyle(el).fontSize.slice(0, -2));
}
function getComputedHorizontalMargin(el: HTMLElement) {
    return Number(getComputedStyle(el).marginLeft.slice(0, -2)) + Number(getComputedStyle(el).marginRight.slice(0, -2));
}

/**
 * Prepares the text of a scrollable field to be continuously scrolled in a loop,
 * i.e. appends the a copy of the text at the end of the element.
 *
 * @param fieldRef A reference to the HTML element containing the text
 * @param scrollRef A reference to the scrollable HTML element containing the previous element
 * @param fieldText The text
 * @param loopMarginEm The margin (in em) between the original text and its copy
 *
 * @returns The new scroll width, the loop margin in px
 */
function useLoopingText<TField extends HTMLElement, TScroll extends HTMLElement>(
    fieldRef: RefObject<TField>,
    scrollRef: RefObject<TScroll>,
    fieldText: string,
    loopMarginEm: number,
    deps: any[],
): [ number | undefined, number ] {
    const loopMarginPx = useRef(0);
    const [ maxScrollWidth, setMaxScrollWidth ] = useState<number | undefined>(scrollRef.current?.scrollWidth ?? 0);
    useEffect(() => {
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
                    setMaxScrollWidth(0);
                }
            } else {
                setMaxScrollWidth(undefined);
            }
        } else {
            setMaxScrollWidth(undefined);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ fieldRef, fieldText, loopMarginEm, scrollRef, ...deps ]);

    return [ maxScrollWidth, loopMarginPx.current ];
}

/**
 * Sets up a HTML element for continuos looping scolling.
 *
 * @param text The text to scroll
 * @param render A function handling the render job; can just simply execute the callback as-is.
 * @param cancelRender A function to cancel the render job; in the simplest case this does nothing.
 * @param scrollOptions
 * @param loopMarginEm The margin (in em) between the original text and its "loop copy"
 *
 * @returns A ref to use on the HTML element containing the text to scroll; a ref to use on the scollable element;
 *          a function to start the scroll; a function to stop the scroll; the isScrolling state variable.
 */
export default function useLoopingTextScroll<TField extends HTMLElement, TScroll extends HTMLElement>(
    text: string,
    render: (callback: () => void) => void,
    cancelRender: () => void,
    scrollOptions: UseScrollHTMLElementOptions,
    loopMarginEm: number,
    deps: any[],
): [
    RefObject<TField>,
    RefObject<TScroll>,
    (ondone?: () => void) => void,
    () => void,
    boolean,
] {
    const fieldRef = useRef<TField>(null);
    const scrollRef = useRef<TScroll>(null);
    const [ fieldScrollWidth, loopMarginPx ] = useLoopingText(fieldRef, scrollRef, text, loopMarginEm, deps);

    const isScrollingCallback = useCallback((currentScroll: number) => {
        return currentScroll > 0 && currentScroll < (fieldScrollWidth ?? 0) - loopMarginPx / 2;
    }, [ fieldScrollWidth, loopMarginPx ]);
    const [ startScroll, stopScroll, isScrolling ] = useScrollHTMLElement(scrollRef, { maxScroll: fieldScrollWidth, render, cancelRender, isScrolling: isScrollingCallback, ...scrollOptions });

    return [ fieldRef, scrollRef, startScroll, stopScroll, isScrolling ];
}
