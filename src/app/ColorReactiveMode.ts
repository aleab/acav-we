import ColorConvert from 'color-convert';
import { HSL, HSV, LAB, RGB } from 'color-convert/conversions';

export enum ResponseType { None, Hue, Saturation, HsvBrightness, HslLightness, LabLightness }
export type ResponseTypeArgs = {
    fromRgb: Readonly<RGB>;
    fromHsv: Readonly<HSV>;
    fromHsl: Readonly<HSL>;
    toRgb: Readonly<RGB>;
    range: number;
};
type ResponseTypesType = {
    [k in ResponseType]: (value: number, degree: number, args: ResponseTypeArgs) => Readonly<RGB>;
};

function isGray(rgb: Readonly<RGB>): boolean {
    return rgb[0] === rgb[1] && rgb[0] === rgb[2];
}

function fitInRange(min: number, max: number, value: number, range: number): number {
    if (range === 0) return value;
    return range > 0
        ? value > max - range ? (max - range) : value
        : value < min - range ? (min - range) : value;
}

function amplifyValue(value: number, degree: number): number {
    return value ** (1 / degree);
}

export const ResponseTypes: ResponseTypesType = {
    [ResponseType.None]: (_value, _degree, { fromRgb }) => fromRgb,
    // HUE
    [ResponseType.Hue]: (value, degree, { fromRgb, fromHsv, toRgb }) => {
        if (isGray(fromRgb) || isGray(toRgb)) return fromRgb; // Gray colors are achromatic, so hue does not apply
        const toHsv = ColorConvert.rgb.hsv(toRgb as RGB);
        const toHue = Math.clamp(Math.lerp(fromHsv[0], toHsv[0], amplifyValue(value, degree)), 0, 360);
        return ColorConvert.hsv.rgb([ toHue, fromHsv[1], fromHsv[2] ]);
    },
    // SATURATION
    [ResponseType.Saturation]: (value, degree, { fromRgb, fromHsv, range }) => {
        if (isGray(fromRgb)) return fromRgb; // Since gray colors have no hue, saturation does not apply either
        const fromSaturation = fitInRange(0, 100, fromHsv[1], range);
        const toSaturation = Math.clamp(fromSaturation + range * amplifyValue(value, degree), 0, 100);
        return ColorConvert.hsv.rgb([ fromHsv[0], toSaturation, fromHsv[2] ]);
    },
    // HSV - Brightness
    [ResponseType.HsvBrightness]: (value, degree, { fromHsv, range }) => {
        const fromBrightness = fitInRange(0, 100, fromHsv[2], range);
        const toBrightness = Math.clamp(fromBrightness + range * amplifyValue(value, degree), 0, 100);
        return ColorConvert.hsv.rgb([ fromHsv[0], fromHsv[1], toBrightness ]);
    },
    // HSL - LIGHTNESS
    [ResponseType.HslLightness]: (value, degree, { fromHsl, range }) => {
        const fromLightness = fitInRange(0, 100, fromHsl[2], range);
        const toLightness = Math.clamp(fromLightness + range * amplifyValue(value, degree), 0, 100);
        return ColorConvert.hsl.rgb([ fromHsl[0], fromHsl[1], toLightness ]);
    },
    // LAB - LIGHTNESS
    [ResponseType.LabLightness]: (value, degree, { fromRgb, range }) => {
        const fromLab: LAB = ColorConvert.rgb.lab(fromRgb as RGB);
        const fromLightness = fitInRange(0, 100, fromLab[0], range);
        const toLightness = Math.clamp(fromLightness + range * amplifyValue(value, degree), 0, 100);
        return ColorConvert.lab.rgb([ toLightness, fromLab[1], fromLab[2] ]);
    },
};
