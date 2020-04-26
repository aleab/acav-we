import { RGB } from 'color-convert/conversions';

import { Pivot } from '../../common/Pivot';
import { Position } from '../../common/Position';
import { BackgroundMode } from '../BackgroundMode';
import SpotifyOverlayArtType from '../SpotifyOverlayArtType';
import { TextScrollingType } from '../TextScrollingType';

export default interface SpotifyProperties {
    showOverlay: boolean;
    backendURL: string;
    token: string;
    style: {
        pivot: Pivot;
        left: number;
        top: number;
        width: number;
        fontSize: number;
        textColor: RGB;
        background: {
            mode: BackgroundMode;
            color: RGB;
            /** [0,100] */
            colorAlpha: number;
            css: string;
        };
    };
    art: {
        enabled: boolean;
        type: SpotifyOverlayArtType;
        fetchLocalCovers: boolean;
        fetchLocalCacheMaxAge: number;
    };
    scroll: {
        enabled: boolean;
        type: TextScrollingType;
        speed: number;
        autoDelay: number;
    };
    progressBar: {
        enabled: boolean;
        color: RGB;
        position: Position;
    };
}
