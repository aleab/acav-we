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

export interface BarVisualizerProperties {
    position: number;
    width: number;
    bars: {
        width: number;
        height: number;
        borderRadius: number;
        alignment: number;
        color: RGBA;
        blockThickness: number;
        waveThickness: number;
        fullWave: boolean;
    };
}

export interface CircularVisualizerProperties {
    x: number;
    y: number;
    radius: number;
    rotation: number;
    angle: number;
    bars: {
        width: number;
        height: number;
        color: RGBA;
        blockThickness: number;
    };
}
