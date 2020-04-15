import ColorConvert from 'color-convert';
import { RGB } from 'color-convert/conversions';

export function darkenOrLightenRgbColor(rgb: RGB, brightnessThreshold: number = 0.4): RGB {
    const hsv = ColorConvert.rgb.hsv([ rgb[0], rgb[1], rgb[2] ]);
    hsv[2] = hsv[2] > 50 ? hsv[2] * (1 - brightnessThreshold) : hsv[2] * (1 + brightnessThreshold);
    return ColorConvert.hsv.rgb(hsv);
}

export function colorEquals(color1: number[], color2: number[]): boolean {
    if (color1.length !== color2.length) return false;
    for (let i = 0; i < color1.length; ++i) {
        if (color1[i] !== color2[i]) return false;
    }
    return true;
}

export function lerp(color1: RGB, color2: RGB, k: number): RGB {
    return [
        Math.round(Math.lerp(color1[0], color2[0], k)),
        Math.round(Math.lerp(color1[1], color2[1], k)),
        Math.round(Math.lerp(color1[2], color2[2], k)),
    ] as RGB;
}
