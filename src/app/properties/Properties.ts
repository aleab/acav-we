/* eslint-disable no-param-reassign */
import _ from 'lodash';
import { RGB } from 'color-convert/conversions';
import { DeepReadonly } from 'utility-types';

import { AudioResponsiveValueProvider } from '../AudioResponsiveValueProvider';
import BackgroundMode from '../BackgroundMode';
import { ColorReactionType } from '../ColorReactionType';
import { ScaleFunction } from '../ScaleFunction';

import AudioSamplesProperties from './AudioSamplesProperties';
import BackgroundProperties from './BackgroundProperties';

export default interface Properties {
    audioprocessing: boolean;
    showStats: boolean;
    limitFps: boolean;
    background: BackgroundProperties;
    audioSamples: AudioSamplesProperties;
    barVisualizer: {
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
    },
    spotify: {
        showOverlay: boolean;
        token: string;
    },
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

function toRgbaColor(color: [number, number, number]): RGBA {
    return [ color[0], color[1], color[2], 255 ];
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

export function mapProperties(raw: DeepReadonly<RawWallpaperProperties>): MappedProperties {
    // .
    const rootOptions: MappedProperties = {};
    setProperty(rootOptions, 'audioprocessing', raw.audioprocessing as WEProperty<'bool'>, _r => _r?.value);
    setProperty(rootOptions, 'showStats', raw.showStats as WEProperty<'bool'>, _r => _r.value);
    setProperty(rootOptions, 'limitFps', raw.limitFps as WEProperty<'bool'>, _r => _r.value);

    // .background
    const backgroundOptions: MappedProperties['background'] = {};
    setProperty(backgroundOptions, 'mode', raw.background_type as WEProperty<'combo'>, _r => parseComboProperty(_r, BackgroundMode));
    setProperty(backgroundOptions, 'color', raw.background_color as WEProperty<'color'>, _r => parseColorProperty(_r));
    setProperty(backgroundOptions, 'imagePath', raw.background_image as WEProperty<'file'>, _r => _r.value);
    setProperty(backgroundOptions, 'css', raw.background_css as WEProperty<'textinput'>, _r => _r.value);
    setProperty(backgroundOptions, 'playlistDirectory', raw.background_playlist as WEProperty<'directory'>, _r => _r.value);
    setProperty(backgroundOptions, 'playlistTimerMinutes', raw.background_playlistTimer as WEProperty<'slider'>, _r => Math.round(parseSliderProperty(_r) * 60));

    // .audioSamples
    const audioSamplesOptions: MappedProperties['audioSamples'] = { scale: {} };
    setProperty(audioSamplesOptions, 'correctSamples', raw.audioSamples_correct as WEProperty<'bool'>, _r => _r.value);
    setProperty(audioSamplesOptions, 'audioVolumeGain', raw.audioSamples_volumeGain as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(audioSamplesOptions, 'audioFreqThreshold', raw.audioSamples_freqThreshold as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(audioSamplesOptions, 'normalize', raw.audioSamples_normalize as WEProperty<'bool'>, _r => _r.value);
    setProperty(audioSamplesOptions, 'bufferLength', raw.audioSamples_buffer as WEProperty<'slider'>, _r => Math.round(parseSliderProperty(_r) * 28));
    // .audioSamples.scale
    setProperty(audioSamplesOptions.scale!, 'function', raw.audioSamples_scale as WEProperty<'combo'>, _r => parseComboProperty(_r, ScaleFunction));
    setProperty(audioSamplesOptions.scale!, 'powExponent', raw.audioSamples_scale_Power_exponent as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(audioSamplesOptions.scale!, 'expBase', raw.audioSamples_scale_Exponential_base as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(audioSamplesOptions.scale!, 'logBase', raw.audioSamples_scale_Logarithm_base as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(audioSamplesOptions.scale!, 'log$powA', raw.audioSamples_scale_Logarithm$Power_a as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(audioSamplesOptions.scale!, 'log$powBase', raw.audioSamples_scale_Logarithm$Power_base as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(audioSamplesOptions.scale!, 'log$powExponent', raw.audioSamples_scale_Logarithm$Power_exponent as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(audioSamplesOptions.scale!, 'gaussianDeviation', raw.audioSamples_scale_Gaussian_deviation as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(audioSamplesOptions.scale!, 'gaussianMean', raw.audioSamples_scale_Gaussian_mean as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    if (_.isEmpty(audioSamplesOptions.scale)) delete audioSamplesOptions.scale;

    // .barVisualizer
    const barVisualizerOptions: MappedProperties['barVisualizer'] = { bars: {} };
    setProperty(barVisualizerOptions, 'position', raw.barVisualizer_position as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions, 'width', raw.barVisualizer_width as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions, 'flipFrequencies', raw.barVisualizer_flipFrequencies as WEProperty<'bool'>, _r => _r.value);
    setProperty(barVisualizerOptions, 'smoothing', raw.barVisualizer_smoothing as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    // .barVisualizer.bars
    setProperty(barVisualizerOptions.bars!, 'width', raw.barVisualizer_bars_width as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'height', raw.barVisualizer_bars_height as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'borderRadius', raw.barVisualizer_bars_borderRadius as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'alignment', raw.barVisualizer_bars_alignment as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'color', raw.barVisualizer_bars_color as WEProperty<'color'>, _r => toRgbaColor(parseColorProperty(_r)));
    setProperty(barVisualizerOptions.bars!, 'responseType', raw.barVisualizer_bars_responseType as WEProperty<'combo'>, _r => parseComboProperty(_r, ColorReactionType));
    setProperty(barVisualizerOptions.bars!, 'responseProvider', raw.barVisualizer_bars_responseProvider as WEProperty<'combo'>, _r => parseComboProperty(_r, AudioResponsiveValueProvider));
    setProperty(barVisualizerOptions.bars!, 'responseValueGain', raw.barVisualizer_bars_responseValueGain as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'responseRange', raw.barVisualizer_bars_responseRange as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'responseDegree', raw.barVisualizer_bars_responseDegree as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'responseToHue', raw.barVisualizer_bars_response_toHue as WEProperty<'color'>, _r => toRgbaColor(parseColorProperty(_r)));
    if (_.isEmpty(barVisualizerOptions.bars)) delete barVisualizerOptions.bars;

    // .spotify
    const spotifyOptions: MappedProperties['spotify'] = {};
    setProperty(spotifyOptions, 'showOverlay', raw.spotify as WEProperty<'bool'>, _r => _r.value);
    setProperty(spotifyOptions, 'token', raw.spotify_token as WEProperty<'textinput'>, _r => _r.value);

    return _.merge(
        { ...rootOptions },
        !_.isEmpty(backgroundOptions) ? { background: backgroundOptions } : {},
        !_.isEmpty(audioSamplesOptions) ? { audioSamples: audioSamplesOptions } : {},
        !_.isEmpty(barVisualizerOptions) ? { barVisualizer: barVisualizerOptions } : {},
        !_.isEmpty(spotifyOptions) ? { spotify: spotifyOptions } : {},
    );
}

function removeUnchangedProperties(_old: any, _new: any) {
    Object.keys(_new).forEach(k => {
        if (_.isArrayLike(_new[k])) {
            if (_.isEqual(_new[k], _old[k])) {
                delete _new[k];
            }
        } else if (_old[k] !== undefined && _.isObjectLike(_new[k])) {
            removeUnchangedProperties(_old[k], _new[k]);
            if (_.isEmpty(_new[k])) {
                delete _new[k];
            }
        } else if (_old[k] === _new[k]) {
            delete _new[k];
        }
    });
}

/**
 * @param properties Mutable properties object
 * @param newRawProperties The raw object received by Wallpaper Engine
 */
export function applyUserProperties(properties: Properties, newRawProperties: DeepReadonly<RawWallpaperProperties>): MappedProperties {
    const newProperties = mapProperties(newRawProperties);
    removeUnchangedProperties(properties, newProperties);
    _.merge(properties, newProperties);
    return _.cloneDeep(newProperties);
}
