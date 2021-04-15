import ColorConvert from 'color-convert';
import { LAB, RGB } from 'color-convert/conversions';

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

export function luminance(rgb: RGB): number {
    const c = rgb.map(v => {
        const w = v / 255;
        return w <= 0.03928
            ? w / 12.92
            : ((w + 0.055) / 1.055) ** 2.4;
    });
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}

export function contrast(color1: RGB, color2: RGB): number {
    const l1 = luminance(color1);
    const l2 = luminance(color2);
    const a = Math.max(l1, l2);
    const b = Math.min(l1, l2);

    const c = (a + 0.05) / (b + 0.05);
    return c < 1 ? 1 / c : c;
}

// Lightness: https://en.wikipedia.org/wiki/Lightness#Lightness_and_human_perception
export function isDark(rgb: RGB) {
    const lab: LAB = ColorConvert.rgb.lab(rgb);
    return lab[0] <= 45;
}

export function calcAverageColor(imageData: ImageData): RGB {
    const rgb: RGB = [ 0, 0, 0 ];
    for (let i = 0; i < imageData.width; ++i) {
        for (let j = 0; j < imageData.height; ++j) {
            const ipx = j * (imageData.width * 4) + i * 4;
            rgb[0] += imageData.data[ipx + 0];
            rgb[1] += imageData.data[ipx + 1];
            rgb[2] += imageData.data[ipx + 2];
        }
    }
    const npx = imageData.width * imageData.height;
    rgb[0] /= npx;
    rgb[1] /= npx;
    rgb[2] /= npx;

    return rgb;
}
