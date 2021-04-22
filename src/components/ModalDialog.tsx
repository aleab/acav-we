/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */

import _ from 'lodash';
import React, { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pivot, calculatePivotTransform } from '../common/Pivot';
import useClientRect from '../hooks/useClientRect';
import useKeepHtmlElementInsideWindow from '../hooks/useKeepHtmlElementInsideWindow';

interface ModalDialogProps {
    id: string;
    top: string | number;
    left: string | number;
    pivot?: Pivot;
    maxWidth: string | number;
    title: string;
    content?: string | JSX.Element | null,
    children?: JSX.Element | null;
    timeout?: number;
    onTimeoutCallback: () => void;
    fadein?: number,
    fadeout?: number,
}

const defaultProps: PickRequiredOptional<ModalDialogProps> = {
    pivot: Pivot.Center,
    content: null,
    children: null,
    timeout: 3000,
    fadein: 750,
    fadeout: 500,
};

export default function ModalDialog(props: ModalDialogProps) {
    _.defaults(props, defaultProps);

    const FADEIN = useMemo(() => props.fadein!, [props.fadein]);
    const FADEOUT = useMemo(() => props.fadeout!, [props.fadeout]);
    const [ fadingOut, setFadingOut ] = useState(false);
    const [ opacity, setOpacity ] = useState<number | undefined>(0);
    const [ visibility, setVisibility ] = useState<CSSProperties['visibility'] | undefined>();

    const pivot = useMemo(() => calculatePivotTransform(props.pivot!), [props.pivot]);
    const content = useMemo(() => (props.children ? props.children : props.content), [ props.children, props.content ]);
    const timeout = useMemo(() => FADEIN + Math.max(props.timeout!, 1000), [ FADEIN, props.timeout ]);
    const onTimeoutCallback = useMemo(() => props.onTimeoutCallback, [props.onTimeoutCallback]);

    const style = useMemo<CSSProperties>(() => {
        return {
            top: props.top,
            left: props.left,
            transform: pivot.transform,
            maxWidth: props.maxWidth,
            opacity,
            visibility,
            animationDuration: `${(fadingOut ? FADEOUT : FADEIN) / 1000}s`,
        };
    }, [ FADEIN, FADEOUT, fadingOut, opacity, pivot.transform, props.left, props.maxWidth, props.top, visibility ]);

    const fadeout = useCallback(() => {
        setFadingOut(true);
        return window.setTimeout(() => {
            setVisibility('collapse');
            onTimeoutCallback?.();
        }, FADEOUT);
    }, [ FADEOUT, onTimeoutCallback ]);

    const timeoutId = useRef(0);
    useEffect(() => {
        timeoutId.current = window.setTimeout(() => {
            setOpacity(undefined);
            timeoutId.current = fadeout();
        }, timeout);
        return () => {
            clearTimeout(timeoutId.current);
            timeoutId.current = 0;
        };
    }, [ fadeout, timeout ]);

    const onClose = useCallback(() => {
        clearTimeout(timeoutId.current);
        timeoutId.current = 0;
        fadeout();
    }, [fadeout]);

    const [ rect, elementRef, callbackRef ] = useClientRect<HTMLDivElement>([ props.top, props.left, pivot.transform, props.maxWidth, props.title, content ]);
    useKeepHtmlElementInsideWindow(elementRef, rect);

    return (
      <div ref={callbackRef} id={props.id} className={`modal overlay bg-noise ${fadingOut ? 'fade-out' : ''}`} role="dialog" style={style}>
        <div className="modal-header">
          <div className="title">
            {props.title}
            <span className="close" onClick={onClose} />
          </div>
        </div>
        {
            content !== null ? (
              <div className="modal-body">
                {
                    typeof content === 'string' ? (
                      <span>{content}</span>
                    ) : (
                      <>{content}</>
                    )
                }
              </div>
            ) : null
        }
      </div>
    );
}
