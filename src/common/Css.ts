import ColorConvert from 'color-convert';
import { HSL, KEYWORD } from 'color-convert/conversions';

export function cssColorToRgba(cssColor: string): RGBA | undefined {
    let rgba: RGBA = [ 255, 255, 255, 1 ];

    if (cssColor === 'transparent') return [ 0, 0, 0, 0 ];
    if (cssColor === 'currentcolor') return undefined;

    const fromKeyword = ColorConvert.keyword.rgb(cssColor as KEYWORD);
    if (fromKeyword) {
        rgba = [ fromKeyword[0], fromKeyword[1], fromKeyword[2], 1 ];
    } else if (cssColor.startsWith('#')) {
        const _rgb = ColorConvert.hex.rgb(cssColor);
        rgba = [ _rgb[0], _rgb[1], _rgb[2], 255 ];
    } else if (cssColor.startsWith('rgb')) {
        // functional notation: rgb[a](R, G, B[, A])  OR  rgb[a](R G B[ / A])
        const _rgba = cssColor.replace(/^.*rgba?\((.+?)\).*$/, '$1')
            .split(/\s|,|\//).filter(v => /[0-9]/.test(v))
            .map((v, i) => {
                if (v.includes('%')) {
                    const p = Number(v.replace('%', '')) / 100;
                    return i <= 2 ? 255 * p : p;
                }
                return Number(v);
            });
        rgba = [ _rgba[0], _rgba[1], _rgba[2], _rgba[3] ?? 1 ];
    } else if (cssColor.startsWith('hsl')) {
        // functional notation: hsl[a](H, S, L[, A])  OR  hsl[a](H S L[ / A])
        const _hsla = cssColor.replace(/^hsla?\((.+?)\)$/, '$1')
            .split(/\s|,|\//).filter(v => /[0-9]/.test(v))
            .map((v, i) => {
                if (v.includes('%')) {
                    const p = Number(v.replace('%', '')) / 100;
                    return i <= 2 ? 255 * p : p;
                }
                return Number(v);
            });
        const _rgb = ColorConvert.hsl.rgb(_hsla as HSL);
        rgba = [ _rgb[0], _rgb[1], _rgb[2], _hsla[3] ];
    } else {
        throw new Error(`Unknown CSS color format: '${cssColor}'`);
    }

    return rgba;
}
