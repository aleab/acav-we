import { RGB } from 'color-convert/conversions';

import { BackgroundMode } from '../BackgroundMode';
import { CssObjectFit } from '../CssObjectFit';

export default interface BackgroundProperties {
    mode: BackgroundMode;
    color: RGB;
    imagePath: string;
    videoPath: string;
    videoObjectFit: CssObjectFit;
    css: string;
    playlistDirectory: string;
    playlistTimerMinutes: number;
}
