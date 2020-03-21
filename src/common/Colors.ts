import ColorConvert from 'color-convert';
import { RGB } from 'color-convert/conversions';

export function darkenOrLightenRgbColor(rgb: RGB, brightnessThreshold: number = 0.4): RGB {
    const hsv = ColorConvert.rgb.hsv([ rgb[0], rgb[1], rgb[2] ]);
    hsv[2] = hsv[2] > 50 ? hsv[2] * (1 - brightnessThreshold) : hsv[2] * (1 + brightnessThreshold);
    return ColorConvert.hsv.rgb(hsv);
}
