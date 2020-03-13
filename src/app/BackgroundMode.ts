import { RGB } from 'color-convert/conversions';

export enum BackgroundMode { Color, Image, Css, Playlist }

export function generateCssStyle(mode: BackgroundMode.Color, options: { color: RGB, alpha?: number }): any;
export function generateCssStyle(mode: BackgroundMode.Image | BackgroundMode.Playlist, options: { imagePath: string }): any;
export function generateCssStyle(mode: BackgroundMode.Css, options: { css: string }): any;
export function generateCssStyle(mode: BackgroundMode, options: any): any {
    switch (mode) {
        case BackgroundMode.Color:
            return {
                backgroundColor: options.alpha !== undefined
                    ? `rgb(${options.color[0]}, ${options.color[1]}, ${options.color[2]})`
                    : `rgba(${options.color[0]}, ${options.color[1]}, ${options.color[2]}, ${options.alpha})`,
            };

        case BackgroundMode.Playlist:
        case BackgroundMode.Image:
            return {
                background: `center / cover no-repeat url("file:///${options.imagePath}")`,
            };

        case BackgroundMode.Css: {
            const newStyle: any = {};
            const regex = /([\w-]+)\s*:\s*((['"]).*\3|[^;]*)/g;
            let match;
            while ((match = regex.exec(options.css)) !== null) {
                const propertyName = match[1].replace(/-(.)/g, (_s, v) => v.toUpperCase());
                if (propertyName) {
                    newStyle[propertyName] = match[2];
                }
            }
            return newStyle;
        }

        default: return {};
    }
}
