import _ from 'lodash';
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

function matchesFilter(propertyName: string, filter?: Array<string | RegExp>) {
    return filter === undefined ? true : _.some(filter, v => {
        return typeof v === 'string' ? (v.toLowerCase() === propertyName.toLowerCase()) : v.test(propertyName);
    });
}
export function parseCustomCss(css: string, filter?: Array<string | RegExp>, toReactStyleNames: boolean = true) {
    const regex = /([\w-]+)\s*:\s*((['"]).*\3|[^;]*)/g;
    const custom: { [key: string]: string } = {};
    let match: RegExpExecArray | null;
    while ((match = regex.exec(css)) !== null) {
        if (matchesFilter(match[1], filter)) {
            const propertyName = toReactStyleNames ? match[1].replace(/-(.)/g, (_s, v) => v.toUpperCase()) : match[1]; // background-image  =>  backgroundImage
            if (propertyName) {
                custom[propertyName] = match[2];
            }
        }
    }
    return custom;
}

export function getComputedBackgroundProperties(htmlElement: HTMLElement | null) {
    if (htmlElement === null) return null;
    const { backgroundClip, backgroundColor, backgroundImage, backgroundOrigin, backgroundPosition, backgroundRepeat, backgroundSize } = getComputedStyle(htmlElement);
    return { backgroundClip, backgroundColor, backgroundImage, backgroundOrigin, backgroundPosition, backgroundRepeat, backgroundSize };
}
