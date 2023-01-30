import { RGB } from 'color-convert/conversions';

import { Pivot } from '../../common/Pivot';
import { ClockFontFamily } from '../ClockFontFamily';
import { ClockType } from '../ClockType';
import BassEffectProperties from './BassEffectProperties';

export default interface ClockProperties {
    enabled: boolean;
    type: ClockType;
    pivot: Pivot;
    left: number;
    top: number;
    customCss: string;
    digital: {
        font: ClockFontFamily;
        fontSize: number;
        textColor: RGB;
        border: {
            enabled: boolean;
            thickness: number;
            style: string;
            color: RGB;
            paddingVertical: number;
            paddingHorizontal: number;
        };
        showSeconds: boolean;
        is24h: boolean;
        locale: string;
    };
    analog: {
        radius: number;
        backgroundColor: RGB;
        /** [0,100] */
        backgroundColorAlpha: number;
        showSeconds: boolean;
        border: {
            thickness: number;
            color: RGB;
        };
        ticks: {
            radius: number;
            thickness: number;
            length: number;
            color: RGB;
        };
        numbers: {
            font: ClockFontFamily;
            fontSize: number;
            radius: number;
            color: RGB;
        };
        hands: {
            hoursLength: number;
            hoursColor: RGB;
            minutesLength: number;
            minutesColor: RGB;
            secondsLength: number;
            secondsColor: RGB;
        };
    };
    bassEffect: BassEffectProperties;
}
