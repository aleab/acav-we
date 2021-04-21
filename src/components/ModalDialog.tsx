/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */

import _ from 'lodash';
import React, { CSSProperties, useCallback, useEffect, useMemo, useRef } from 'react';
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
    timeout?: number;
    onTimeoutCallback: () => void;
    children?: JSX.Element | null;
}

const defaultProps: PickRequiredOptional<ModalDialogProps> = {
    pivot: Pivot.Center,
    content: null,
    timeout: 3000,
    children: null,
};

// TODO: fade-in/out
export default function ModalDialog(props: ModalDialogProps) {
    _.defaults(props, defaultProps);

    const pivot = useMemo(() => calculatePivotTransform(props.pivot!), [props.pivot]);
    const content = useMemo(() => (props.children ? props.children : props.content), [ props.children, props.content ]);
    const timeout = useMemo(() => Math.max(props.timeout!, 1000), [props.timeout]);
    const onTimeoutCallback = useMemo(() => props.onTimeoutCallback, [props.onTimeoutCallback]);

    const style = useMemo<CSSProperties>(() => {
        return {
            top: props.top,
            left: props.left,
            transform: pivot.transform,
            maxWidth: props.maxWidth,
        };
    }, [ pivot.transform, props.left, props.maxWidth, props.top ]);

    const timeoutId = useRef(0);
    useEffect(() => {
        timeoutId.current = setTimeout(onTimeoutCallback as TimerHandler, timeout);
        return () => {
            clearTimeout(timeoutId.current);
            timeoutId.current = 0;
        };
    }, [ onTimeoutCallback, timeout ]);

    const onClose = useCallback(() => {
        clearTimeout(timeoutId.current);
        timeoutId.current = 0;
        onTimeoutCallback?.();
    }, [onTimeoutCallback]);

    const [ rect, elementRef, callbackRef ] = useClientRect<HTMLDivElement>([ props.top, props.left, pivot.transform, props.maxWidth, props.title, content ]);
    useKeepHtmlElementInsideWindow(elementRef, rect);

    return (
      <div ref={callbackRef} id={props.id} className="modal overlay bg-noise" role="dialog" style={style}>
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
