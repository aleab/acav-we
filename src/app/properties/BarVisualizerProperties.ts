import { RGB } from 'color-convert/conversions';

import { AudioResponsiveValueProvider } from '../AudioResponsiveValueProvider';
import { ColorReactionType } from '../ColorReactionType';

export default interface BarVisualizerProperties {
    position: number;
    width: number;
    flipFrequencies: boolean;
    smoothing: number;
    bars: {
        width: number;
        height: number;
        borderRadius: number;
        alignment: number;
        color: RGBA;
        responseType: ColorReactionType;
        responseProvider: AudioResponsiveValueProvider;
        responseValueGain: number;
        responseRange: number;
        responseDegree: number;
        responseToHue: RGB;
    };
}
