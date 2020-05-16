import { RGB } from 'color-convert/conversions';

import { Pivot } from '../../common/Pivot';
import { ClockFontFamily } from '../ClockFontFamily';

export default interface ClockProperties {
    enabled: boolean;
    pivot: Pivot;
    left: number;
    top: number;
    customCss: string;
    digital: {
        font: ClockFontFamily;
        fontSize: number;
        textColor: RGB;
        is24h: boolean;
        locale: string;
    };
    showSeconds: boolean;
    bassEffect: {
        enabled: boolean;
        frequency: number;
        smoothing: number;
    };
}
