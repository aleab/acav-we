import _ from 'lodash';
import { RGB } from 'color-convert/conversions';

import { parseCustomCss } from '../common/Css';

export enum BackgroundMode { Color, Image, Css, Playlist }

type ColorOptions = { color: RGB, alpha?: number };
type ImageOptions = { imagePath: string };
type CssOptions = { css: string };
export type CssBackground = {
    background?: string;
    backgroundClip?: string;
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundOrigin?: string;
    backgroundPosition?: string;
    backgroundRepeat?: string;
    backgroundSize?: string;
    backgroundAttachment?: string;
};

export function generateCssStyle(mode: BackgroundMode.Color, options: ColorOptions): CssBackground;
export function generateCssStyle(mode: BackgroundMode.Image | BackgroundMode.Playlist, options: ImageOptions): CssBackground;
export function generateCssStyle(mode: BackgroundMode.Css, options: CssOptions): CssBackground;
export function generateCssStyle<Mode extends BackgroundMode>(mode: Mode, options: Partial<ColorOptions & ImageOptions & CssOptions>): CssBackground;
export function generateCssStyle(mode: BackgroundMode, options: any): CssBackground {
    switch (mode) {
        case BackgroundMode.Color:
            return options.color ? {
                backgroundColor: options.alpha === undefined || options.alpha === 1
                    ? `rgb(${options.color[0]}, ${options.color[1]}, ${options.color[2]})`
                    : `rgba(${options.color[0]}, ${options.color[1]}, ${options.color[2]}, ${options.alpha})`,
            } : {};

        case BackgroundMode.Playlist:
        case BackgroundMode.Image:
            return {
                background: `center / cover no-repeat url("file:///${options.imagePath}")`,
            };

        case BackgroundMode.Css: {
            if (!options.css) return {};
            return parseCustomCss(options.css, [/^background(-[a-z]+)?/]);
        }

        default: return {};
    }
}
