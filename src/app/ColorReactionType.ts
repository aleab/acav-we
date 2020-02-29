/* eslint-disable no-param-reassign */
import ColorConvert from 'color-convert';
import { HSL, HSV, LAB, RGB } from 'color-convert/conversions';
import Log from '../common/Log';

export enum ColorReactionType { None, Hue, Saturation, HsvBrightness, HslLightness, LabLightness, LabA, LabB }
export type ColorReactionArgs = {
    fromRgb: Readonly<RGB>;
    toRgb?: Readonly<RGB>;
    degree: number;
    range: number;
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
    return Math.sign(value) * (Math.abs(value) ** (1 / degree));
}

const ColorReactions: {
    [k in ColorReactionType]: (value: number, args: ColorReactionArgs) => Readonly<RGB>;
} = {
    [ColorReactionType.None]: (_value, { fromRgb }) => fromRgb,
    // HUE
    [ColorReactionType.Hue]: (value, { fromRgb, toRgb, degree }) => {
        if (isGray(fromRgb) || isGray(toRgb!)) return fromRgb; // Gray colors are achromatic, so hue does not apply
        const fromHsv = ColorConvert.rgb.hsv(fromRgb as RGB);
        const toHsv = ColorConvert.rgb.hsv(toRgb as RGB);
        const toHue = Math.clamp(Math.lerp(fromHsv[0], toHsv[0], amplifyValue(value, degree)), 0, 360);
        return ColorConvert.hsv.rgb([ toHue, fromHsv[1], fromHsv[2] ]);
    },
    // SATURATION
    [ColorReactionType.Saturation]: (value, { fromRgb, degree, range }) => {
        if (isGray(fromRgb)) return fromRgb; // Since gray colors have no hue, saturation does not apply either
        const fromHsv = ColorConvert.rgb.hsv(fromRgb as RGB);
        const fromSaturation = fitInRange(0, 100, fromHsv[1], Math.sign(value) * range);
        const toSaturation = Math.clamp(fromSaturation + range * amplifyValue(value, degree), 0, 100);
        return ColorConvert.hsv.rgb([ fromHsv[0], toSaturation, fromHsv[2] ]);
    },
    // HSV - Brightness
    [ColorReactionType.HsvBrightness]: (value, { fromRgb, degree, range }) => {
        const fromHsv = ColorConvert.rgb.hsv(fromRgb as RGB);
        const fromBrightness = fitInRange(0, 100, fromHsv[2], Math.sign(value) * range);
        const toBrightness = Math.clamp(fromBrightness + range * amplifyValue(value, degree), 0, 100);
        return ColorConvert.hsv.rgb([ fromHsv[0], fromHsv[1], toBrightness ]);
    },
    // HSL - LIGHTNESS
    [ColorReactionType.HslLightness]: (value, { fromRgb, degree, range }) => {
        const fromHsl = ColorConvert.rgb.hsl(fromRgb as RGB);
        const fromLightness = fitInRange(0, 100, fromHsl[2], Math.sign(value) * range);
        const toLightness = Math.clamp(fromLightness + range * amplifyValue(value, degree), 0, 100);
        return ColorConvert.hsl.rgb([ fromHsl[0], fromHsl[1], toLightness ]);
    },
    // LAB - LIGHTNESS
    [ColorReactionType.LabLightness]: (value, { fromRgb, degree, range }) => {
        const fromLab: LAB = ColorConvert.rgb.lab(fromRgb as RGB);
        const fromLightness = fitInRange(0, 100, fromLab[0], Math.sign(value) * range);
        const toLightness = Math.clamp(fromLightness + range * amplifyValue(value, degree), 0, 100);
        return ColorConvert.lab.rgb([ toLightness, fromLab[1], fromLab[2] ]);
    },
    // LAB - A
    [ColorReactionType.LabA]: (value, { fromRgb, degree, range }) => {
        const fromLab: LAB = ColorConvert.rgb.lab(fromRgb as RGB);
        const fromA = fitInRange(-128, 127, fromLab[1], Math.sign(value) * range);
        const toA = Math.clamp(fromA + range * amplifyValue(value, degree), -128, 127);
        return ColorConvert.lab.rgb([ fromLab[0], toA, fromLab[2] ]);
    },
    // LAB - B
    [ColorReactionType.LabB]: (value, { fromRgb, degree, range }) => {
        const fromLab: LAB = ColorConvert.rgb.lab(fromRgb as RGB);
        const fromB = fitInRange(-128, 127, fromLab[2], Math.sign(value) * range);
        const toB = Math.clamp(fromB + range * amplifyValue(value, degree), -128, 127);
        return ColorConvert.lab.rgb([ fromLab[0], fromLab[1], toB ]);
    },
};

export const ColorReactionFactory = {
    buildColorReaction(type: ColorReactionType, args: ColorReactionArgs): (value: number) => RGB {
        let colorReaction = ColorReactions[type];
        if (!colorReaction) {
            Log.warn('Unhandled ColorReactionType:', ColorReactionType[type]);
            colorReaction = ColorReactions[ColorReactionType.None];
        }

        return (value: number) => colorReaction(value, args) as RGB;
    },
};
