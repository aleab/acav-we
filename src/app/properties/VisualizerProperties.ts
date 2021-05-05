import { RGB } from 'color-convert/conversions';

import { VisualizerType } from '../VisualizerType';
import { AudioResponsiveValueProvider } from '../AudioResponsiveValueProvider';
import { ColorReactionType } from '../ColorReactionType';
import { Visualizer3DParametricGeometries } from '../Visualizer3DParametricGeometries';
import { VisualizerFlipType } from '../VisualizerFlipType';

export interface VisualizerProperties {
    type: VisualizerType;
    flip: VisualizerFlipType;

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
    useSilentColor: boolean;
    silentColor: RGBA;
    bars: {
        width: number;
        height: number;
        minHeight: number;
        borderRadius: number;
    };
    blocks: {
        width: number;
        height: number;
        thickness: number;
        hideWhenSilent: boolean;
    };
    wave: {
        height: number;
        showMirrorWave: boolean;
        fill: boolean;
        thickness: number;
        smoothness: number;
        hideWhenSilent: boolean;
    };
}

export interface CircularVisualizerProperties {
    x: number;
    y: number;
    radius: number;
    rotation: number;
    angle: number;
    color: RGBA;
    useSilentColor: boolean;
    silentColor: RGBA;
    bars: {
        width: number;
        height: number;
        minHeight: number;
        showMirror: boolean;
    };
    blocks: {
        width: number;
        height: number;
        showMirror: boolean;
        thickness: number;
        hideWhenSilent: boolean;
    };
    wave: {
        height: number;
        showMirrorWave: boolean;
        fill: boolean;
        thickness: number;
        smoothness: number;
        hideWhenSilent: boolean;
    };
}

export interface ThreeDVisualizerProperties {
    color: RGBA;
    zoom: number;
    useSilentColor: boolean;
    silentColor: RGBA;
    hideWhenSilent: boolean;
    bars: {
        width: number;
        height: number;
        phiX: number;
        phiY: number;
        y0: number;
        deltaX: number;
        deltaY: number;
        light: {
            angleX: number;
            power: number;
            color: RGB;
        };
    };
    parametric: {
        geometry: Visualizer3DParametricGeometries;
        light: {
            angleX: number;
            power: number;
            color: RGB;
        };
    };
}
