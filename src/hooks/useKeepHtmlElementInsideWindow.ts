import { RefObject, useEffect } from 'react';

export default function useKeepHtmlElementInsideWindow<T extends HTMLElement>(ref: RefObject<T>, _rect: DOMRect | undefined | null) {
    const element = ref.current;
    const rect = _rect === null ? element?.getBoundingClientRect() : _rect;

    useEffect(() => {
        if (!element || !rect) return;

        const style = getComputedStyle(element);
        let left = Number(style.left.replace('px', ''));
        let top = Number(style.top.replace('px', ''));

        if (rect.left < 0) {
            left -= rect.left;
            element.style.left = `${left}px`;
            element.style.removeProperty('right');
            rect.x = 0;
        }
        if (rect.top < 0) {
            top -= rect.top;
            element.style.top = `${top}px`;
            element.style.removeProperty('bottom');
            rect.y = 0;
        }
        if (rect.left + rect.width > window.innerWidth) {
            const dx = rect.left + rect.width - window.innerWidth;
            left -= dx;
            element.style.left = `${left}px`;
            element.style.removeProperty('right');
            rect.x -= dx;
        }
        if (rect.top + rect.height > window.innerHeight) {
            const dy = rect.top + rect.height - window.innerHeight;
            top -= dy;
            element.style.top = `${top}px`;
            element.style.removeProperty('bottom');
            rect.y -= dy;
        }
    }, [ element, rect ]);
}
