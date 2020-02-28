import _ from 'lodash';
import { DeepReadonly } from 'utility-types';

import { ScaleFunction } from './ScaleFunction';
import { ResponseType } from './ColorReactiveMode';
import { ColorReactiveValueProvider } from './ColorReactiveValueProvider';

export default interface WallpaperProperties {
    audioprocessing: boolean;
    audioSamples: {
        correctSamples: boolean;
        audioVolumeGain: number;
        audioFreqThreshold: number;
        scale: ScaleFunction;
        normalize: boolean;
        bufferLength: number;
    };
    barVisualizer: {
        position: number;
        width: number;
        flipFrequencies: boolean;
        smoothing: number;
        bars: {
            width: number;
            height: number;
            alignment: number;
            color: RgbaColor;
            responseType: ResponseType;
            responseProvider: ColorReactiveValueProvider;
            responseValueGain: number;
            responseRange: number;
            responseDegree: number;
            responseToHue: RgbaColor;
        };
    }
}

function parseComboProperty<TEnum>(prop: WEProperty<'combo'>, EnumType: TEnum): TEnum[keyof TEnum] {
    return EnumType[prop.value as keyof typeof EnumType];
}

function parseColorProperty(prop: WEProperty<'color'>): [number, number, number] {
    const color = prop.value.split(' ').map(v => Math.round(Number(v) * 255));
    return [ color[0], color[1], color[2] ];
}

function parseSliderProperty(prop: WEProperty<'slider'>): number {
    return Math.clamp(prop.value, prop.min, prop.max);
}

function toRgbaColor(color: [number, number, number]): RgbaColor {
    return { r: color[0], g: color[1], b: color[2], a: 255 };
}

function setProperty<TOption, Type extends WEPropertyType | string, P extends keyof TOption>(
    properties: TOption, propName: P, rawProperty: WEProperty<Type> | undefined,
    parse: (rawProperty: WEProperty<Type>) => TOption[P],
) {
    if (rawProperty !== undefined) {
        // eslint-disable-next-line no-param-reassign
        properties[propName] = parse(rawProperty);
        if (properties[propName] === undefined) {
            // eslint-disable-next-line no-param-reassign
            delete properties[propName];
        }
    }
}

export function mapProperties(raw: DeepReadonly<RawWallpaperProperties>): MappedWallpaperProperties {
    // .
    const rootOptions: MappedWallpaperProperties = {};
    if (raw.audioprocessing) {
        setProperty(rootOptions, 'audioprocessing', raw.audioprocessing as WEProperty<'bool'>, _r => _r.value);
    }

    // .audioSamples
    const audioSamplesOptions: MappedWallpaperProperties['audioSamples'] = {};
    setProperty(audioSamplesOptions, 'correctSamples', raw.audioSamples_correct as WEProperty<'bool'>, _r => _r.value);
    setProperty(audioSamplesOptions, 'audioVolumeGain', raw.audioSamples_volumeGain as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(audioSamplesOptions, 'audioFreqThreshold', raw.audioSamples_freqThreshold as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(audioSamplesOptions, 'scale', raw.audioSamples_scale as WEProperty<'combo'>, _r => parseComboProperty(_r, ScaleFunction));
    setProperty(audioSamplesOptions, 'normalize', raw.audioSamples_normalize as WEProperty<'bool'>, _r => _r.value);
    setProperty(audioSamplesOptions, 'bufferLength', raw.audioSamples_buffer as WEProperty<'slider'>, _r => Math.round(parseSliderProperty(_r) * 28));

    // .barVisualizer
    const barVisualizerOptions: MappedWallpaperProperties['barVisualizer'] = { bars: {} };
    setProperty(barVisualizerOptions, 'position', raw.barVisualizer_position as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions, 'width', raw.barVisualizer_width as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions, 'flipFrequencies', raw.barVisualizer_flipFrequencies as WEProperty<'bool'>, _r => _r.value);
    setProperty(barVisualizerOptions, 'smoothing', raw.barVisualizer_smoothing as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    // .barVisualizer.bars
    setProperty(barVisualizerOptions.bars!, 'width', raw.barVisualizer_bars_width as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'height', raw.barVisualizer_bars_height as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'alignment', raw.barVisualizer_bars_alignment as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'color', raw.barVisualizer_bars_color as WEProperty<'color'>, _r => toRgbaColor(parseColorProperty(_r)));
    setProperty(barVisualizerOptions.bars!, 'responseType', raw.barVisualizer_bars_responseType as WEProperty<'combo'>, _r => parseComboProperty(_r, ResponseType));
    setProperty(barVisualizerOptions.bars!, 'responseProvider', raw.barVisualizer_bars_responseProvider as WEProperty<'combo'>, _r => parseComboProperty(_r, ColorReactiveValueProvider));
    setProperty(barVisualizerOptions.bars!, 'responseValueGain', raw.barVisualizer_bars_responseValueGain as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'responseRange', raw.barVisualizer_bars_responseRange as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'responseDegree', raw.barVisualizer_bars_responseDegree as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'responseToHue', raw.barVisualizer_bars_response_toHue as WEProperty<'color'>, _r => toRgbaColor(parseColorProperty(_r)));

    return _.merge(
        { ...rootOptions },
        !_.isEmpty(audioSamplesOptions) ? { audioSamples: audioSamplesOptions } : {},
        !_.isEmpty(barVisualizerOptions) ? { barVisualizer: barVisualizerOptions } : {},
    );
}

/**
 * @param properties Mutable properties object
 * @param newRawProperties The raw object received by Wallpaper Engine
 */
export function applyUserProperties(properties: WallpaperProperties, newRawProperties: DeepReadonly<RawWallpaperProperties>): MappedWallpaperProperties {
    const newProperties = mapProperties(newRawProperties);
    _.merge(properties, newProperties);
    return _.cloneDeep(newProperties);
}
