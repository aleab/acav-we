import React from 'react';

import faSpotify from '@fortawesome/fontawesome-free/svgs/brands/spotify.svg';
import faCircleNotch from '@fortawesome/fontawesome-free/svgs/solid/circle-notch.svg';
import faFilter from '@fortawesome/fontawesome-free/svgs/solid/filter.svg';
import faPlug from '@fortawesome/fontawesome-free/svgs/solid/plug.svg';
import faSkull from '@fortawesome/fontawesome-free/svgs/solid/skull.svg';
import faCheckCircle from '@fortawesome/fontawesome-free/svgs/solid/check-circle.svg';
import faChevronCircleDown from '@fortawesome/fontawesome-free/svgs/solid/chevron-circle-down.svg';

function hoc(SvgIcon: React.FunctionComponent<React.SVGAttributes<SVGElement>>): React.FunctionComponent<React.SVGAttributes<SVGElement>> {
    return function FaIcon(props: React.SVGAttributes<SVGElement>) {
        const { className: _className, ...otherProps } = props;
        let className = _className;

        if (className) className = className.split(' ').filter(v => v !== 'svg-inline--fa' && v !== 'fa-w-16').join(' ');
        return (
          <SvgIcon
            role="img" aria-hidden="true" focusable={false} fill="currentColor"
            className={`svg-inline--fa fa-w-16 ${className ?? ''}`}
            {...otherProps}
          />
        );
    };
}

const FaSpotify = hoc(faSpotify);
const FaCircleNotch = hoc(faCircleNotch);
const FaFilter = hoc(faFilter);
const FaPlug = hoc(faPlug);
const FaSkull = hoc(faSkull);
const FaCheckCircle = hoc(faCheckCircle);
const FaChevronCircleDown = hoc(faChevronCircleDown);

export { FaSpotify, FaCircleNotch, FaFilter, FaPlug, FaSkull, FaCheckCircle, FaChevronCircleDown };
