import { MutableRefObject, useCallback, useRef, useState } from 'react';

type UseClientRectReturnType<T extends HTMLElement> = [
    DOMRect | null,
    MutableRefObject<T | null>,
    (node: T) => void
];

export default function useClientRect<T extends HTMLElement>(): UseClientRectReturnType<T> {
    const [ rect, setRect ] = useState<DOMRect | null>(null);
    const elementRef = useRef<T | null>(null);
    const callbackRef = useCallback((node: T | null) => {
        elementRef.current = node;
        if (node !== null) {
            setRect(node.getBoundingClientRect());
        }
    }, []);
    return [ rect, elementRef, callbackRef ];
}
