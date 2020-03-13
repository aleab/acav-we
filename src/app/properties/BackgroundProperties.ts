import { RGB } from 'color-convert/conversions';

import { BackgroundMode } from '../BackgroundMode';

export default interface BackgroundProperties {
    mode: BackgroundMode;
    color: RGB;
    imagePath: string;
    css: string;
    playlistDirectory: string;
    playlistTimerMinutes: number;
}
