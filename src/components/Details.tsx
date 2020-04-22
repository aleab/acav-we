/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

import React, { useCallback } from 'react';

export default function Details({ children }: any) {
    const onMouseDown = useCallback((event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        // Prevent focus on click
        event.preventDefault();
    }, []);

    return (
      <details onMouseDown={onMouseDown}>
        {children}
      </details>
    );
}
