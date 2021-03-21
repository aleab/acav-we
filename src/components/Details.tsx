/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

import React, { useCallback, useMemo, useRef } from 'react';

interface DetailsProps {
    toggleCallback?: (t: HTMLElement, open: boolean) => void;
    children?: any;
}

export default function Details(props: DetailsProps) {
    const toggleCallback = useMemo(() => props.toggleCallback, [props.toggleCallback]);
    const ref = useRef<HTMLElement>(null);

    const onMouseDown = useCallback((event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        // Prevent focus on click
        event.preventDefault();
    }, []);

    const onToggle = useCallback((event: React.SyntheticEvent<HTMLElement, Event>) => {
        if (ref.current) {
            toggleCallback?.(ref.current, ref.current.hasAttribute('open'));
        }
    }, [toggleCallback]);

    return (
      <details ref={ref} onMouseDown={onMouseDown} onToggle={onToggle}>
        {props.children}
      </details>
    );
}
