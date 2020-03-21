import React, { useMemo } from 'react';
import { cssColorToRgba } from '../common/Css';
import { darkenOrLightenRgbColor } from '../common/Colors';

interface SpotifyOverlayErrorProps {
    message: string;
    secondaryMessages?: string[];
    color: string;
}

export default function SpotifyOverlayError(props: SpotifyOverlayErrorProps) {
    const secondaryColorCss = useMemo(() => {
        let _secondaryColorCss = props.color;
        const color = cssColorToRgba(props.color);
        if (color !== undefined) {
            const offColor = darkenOrLightenRgbColor([ color[0], color[1], color[2] ]);
            _secondaryColorCss = `rgba(${offColor[0]}, ${offColor[1]}, ${offColor[2]}, ${color[3]})`;
        }
        return _secondaryColorCss;
    }, [props.color]);

    const secondaryMessages = props.secondaryMessages !== undefined ? props.secondaryMessages.map(m => {
        return m ? <div key={m} style={{ color: secondaryColorCss }}>{m}</div> : null;
    }) : null;

    return (
      <div className="error">
        <div>{props.message}</div>
        {secondaryMessages}
      </div>
    );
}
