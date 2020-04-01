import React from 'react';

interface SpinnerProps {
    color?: string;
    size?: string;
    gap?: string;
}

export default function Spinner(props: SpinnerProps) {
    const colorStyle: any = props.color ? { '--color': props.color } : undefined;
    const sizeStyle: any = props.size ? { '--size': props.size } : undefined;
    const gapStyle: any = props.gap ? { '--gap': props.gap } : undefined;
    return (
      <div className="spinner" style={{ ...colorStyle, ...sizeStyle, ...gapStyle }}>
        <div className="bounce1" />
        <div className="bounce2" />
        <div className="bounce3" />
      </div>
    );
}
