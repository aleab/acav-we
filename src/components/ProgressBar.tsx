import _ from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';

interface ProgressBarProps {
    className?: string;
    percent: number;
    onTop?: boolean;
    spinner?: 'left' | 'right' | false
}

const defaultProps: Required<ProgressBarProps> = {
    className: '',
    percent: 0,
    onTop: false,
    spinner: 'left',
};

export default function ProgressBar(props: ProgressBarProps) {
    const onTop = props.onTop ?? defaultProps.onTop;
    const spinner = props.spinner ?? defaultProps.spinner;

    const [ percent, setPercent ] = useState(props.percent);
    useEffect(() => setPercent(Math.clamp(props.percent, 0, 100)), [props.percent]);

    const className = useMemo(() => {
        const classes = ['progress-bar'];
        if (props.className) classes.push(props.className);
        if (onTop) classes.push('onTop');
        return _.join(classes, ' ');
    }, [ onTop, props.className ]);

    return (
      <div className={className}>
        <div className="progress-bar-percent" style={{ width: `${percent}%` }} />
        {
            spinner ? (
              <div className={_.join([ 'progress-bar-spinner', spinner ], ' ')}>
                <div className="progress-bar-spinner-icon" />
              </div>
            ) : null
        }
      </div>
    );
}
