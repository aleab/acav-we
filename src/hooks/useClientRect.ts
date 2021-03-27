import _ from 'lodash';
import React, { MutableRefObject, useCallback, useReducer, useRef, useState } from 'react';

type UseClientRectReturnType<T extends HTMLElement> = [
    DOMRect | null,
    MutableRefObject<T | null>,
    (node: T) => void
];

export default function useClientRect<T extends HTMLElement>(deps: React.DependencyList): UseClientRectReturnType<T> {
    const [ rect, setRect ] = useReducer((prevRect: DOMRect | null, newRect: DOMRect | null) => {
        if (Object.is(prevRect, newRect)) return prevRect;
        return _.isEqual(prevRect, newRect) ? prevRect : newRect;
    }, null);
    const elementRef = useRef<T | null>(null);
    const callbackRef = useCallback((node: T | null) => {
        elementRef.current = node;
        setRect(node?.getBoundingClientRect() ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return [ rect, elementRef, callbackRef ];
}
