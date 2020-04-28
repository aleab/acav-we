import { RGB } from 'color-convert/conversions';
import { VisualizerType } from '../VisualizerType';

import { ColorReactionType } from '../ColorReactionType';
import { AudioResponsiveValueProvider } from '../AudioResponsiveValueProvider';

export interface VisualizerProperties {
    type: VisualizerType;
    flipFrequencies: boolean;
    smoothing: number;

    responseType: ColorReactionType;
    responseProvider: AudioResponsiveValueProvider;
    responseValueGain: number;
    responseRange: number;
    responseDegree: number;
    responseToHue: RGB;
}

export interface VerticalVisualizerProperties {
    position: number;
    width: number;
    alignment: number;
    color: RGBA;
    bars: {
        width: number;
        height: number;
        borderRadius: number;
    };
    blocks: {
        width: number;
        height: number;
        thickness: number;
    };
    wave: {
        height: number;
        thickness: number;
        showSecondaryWave: boolean;
    };
}

export interface CircularVisualizerProperties {
    x: number;
    y: number;
    radius: number;
    rotation: number;
    angle: number;
    color: RGBA;
    bars: {
        width: number;
        height: number;
    };
    blocks: {
        width: number;
        height: number;
        thickness: number;
    };
}
