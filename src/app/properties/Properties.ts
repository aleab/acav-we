/* eslint-disable no-param-reassign */
import _ from 'lodash';

import { Pivot } from '../../common/Pivot';
import { Position } from '../../common/Position';
import { AudioResponsiveValueProvider } from '../AudioResponsiveValueProvider';
import { BackgroundMode } from '../BackgroundMode';
import { ColorReactionType } from '../ColorReactionType';
import { ScaleFunction } from '../ScaleFunction';
import SpotifyOverlayArtType from '../SpotifyOverlayArtType';
import { TextScrollingType } from '../TextScrollingType';
import { VisualizerType } from '../VisualizerType';

import AudioSamplesProperties from './AudioSamplesProperties';
import BackgroundProperties from './BackgroundProperties';
import SpotifyProperties from './SpotifyProperties';
import { BarVisualizerProperties, CircularVisualizerProperties, VisualizerProperties } from './VisualizerProperties';

export default interface Properties {
    audioprocessing: boolean;
    showStats: boolean;
    limitFps: boolean;
    background: BackgroundProperties;
    audioSamples: AudioSamplesProperties;
    visualizer: VisualizerProperties;
    barVisualizer: BarVisualizerProperties;
    circularVisualizer: CircularVisualizerProperties;
    spotify: SpotifyProperties;
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

    // .visualizer
    const visualizerOptions: MappedProperties['visualizer'] = {};
    setProperty(visualizerOptions, 'type', raw.visualizer_type as WEProperty<'combo'>, _r => parseComboProperty(_r, VisualizerType));
    setProperty(visualizerOptions, 'flipFrequencies', raw.visualizer_flipFrequencies as WEProperty<'bool'>, _r => _r.value);
    setProperty(visualizerOptions, 'smoothing', raw.visualizer_smoothing as WEProperty<'slider'>, _r => parseSliderProperty(_r));

    setProperty(visualizerOptions, 'responseType', raw.visualizer_color_responseType as WEProperty<'combo'>, _r => parseComboProperty(_r, ColorReactionType));
    setProperty(visualizerOptions, 'responseProvider', raw.visualizer_color_responseProvider as WEProperty<'combo'>, _r => parseComboProperty(_r, AudioResponsiveValueProvider));
    setProperty(visualizerOptions, 'responseValueGain', raw.visualizer_color_responseValueGain as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(visualizerOptions, 'responseRange', raw.visualizer_color_responseRange as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(visualizerOptions, 'responseDegree', raw.visualizer_color_responseDegree as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(visualizerOptions, 'responseToHue', raw.visualizer_color_response_toHue as WEProperty<'color'>, _r => toRgbaColor(parseColorProperty(_r)));

    // .barVisualizer
    const barVisualizerOptions: MappedProperties['barVisualizer'] = { bars: {} };
    setProperty(barVisualizerOptions, 'position', raw.barVisualizer_position as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions, 'width', raw.barVisualizer_width as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    // .barVisualizer.bars
    setProperty(barVisualizerOptions.bars!, 'width', raw.barVisualizer_bars_width as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'height', raw.barVisualizer_bars_height as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'borderRadius', raw.barVisualizer_bars_borderRadius as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'alignment', raw.barVisualizer_bars_alignment as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(barVisualizerOptions.bars!, 'color', raw.barVisualizer_bars_color as WEProperty<'color'>, _r => toRgbaColor(parseColorProperty(_r)));
    setProperty(barVisualizerOptions.bars!, 'blockThickness', raw.barVisualizer_bars_blockThickness as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    if (_.isEmpty(barVisualizerOptions.bars)) delete barVisualizerOptions.bars;

    // .circularVisualizer
    const circularVisualizerOptions: MappedProperties['circularVisualizer'] = { bars: {} };
    setProperty(circularVisualizerOptions, 'x', raw.circularVisualizer_x as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions, 'y', raw.circularVisualizer_y as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions, 'radius', raw.circularVisualizer_radius as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions, 'rotation', raw.circularVisualizer_rotation as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions, 'angle', raw.circularVisualizer_angle as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    // .circularVisualizer.bars
    setProperty(circularVisualizerOptions.bars!, 'width', raw.circularVisualizer_bars_width as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions.bars!, 'height', raw.circularVisualizer_bars_height as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions.bars!, 'color', raw.circularVisualizer_bars_color as WEProperty<'color'>, _r => toRgbaColor(parseColorProperty(_r)));
    setProperty(circularVisualizerOptions.bars!, 'blockThickness', raw.circularVisualizer_bars_blockThickness as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    if (_.isEmpty(circularVisualizerOptions.bars)) delete circularVisualizerOptions.bars;

    // .spotify
    const spotifyOptions: MappedProperties['spotify'] = { style: { background: {} }, art: {}, scroll: {}, progressBar: {} };
    setProperty(spotifyOptions, 'showOverlay', raw.spotify as WEProperty<'bool'>, _r => _r.value);
    setProperty(spotifyOptions, 'backendURL', raw.spotify_backend_url as WEProperty<'textinput'>, _r => _r.value);
    setProperty(spotifyOptions, 'token', raw.spotify_token as WEProperty<'textinput'>, _r => _r.value);
    // .spotify.style
    setProperty(spotifyOptions.style!, 'pivot', raw.spotify_pivot as WEProperty<'combo'>, _r => parseComboProperty(_r, Pivot));
    setProperty(spotifyOptions.style!, 'left', raw.spotify_position_x as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(spotifyOptions.style!, 'top', raw.spotify_position_y as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(spotifyOptions.style!, 'width', raw.spotify_width as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(spotifyOptions.style!, 'fontSize', raw.spotify_font_size as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(spotifyOptions.style!, 'textColor', raw.spotify_text_color as WEProperty<'color'>, _r => parseColorProperty(_r));
    // .spotify.style.background
    setProperty(spotifyOptions.style!.background!, 'mode', raw.spotify_background_type as WEProperty<'combo'>, _r => parseComboProperty(_r, BackgroundMode));
    setProperty(spotifyOptions.style!.background!, 'color', raw.spotify_background_color as WEProperty<'color'>, _r => parseColorProperty(_r));
    setProperty(spotifyOptions.style!.background!, 'colorAlpha', raw.spotify_background_color_alpha as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(spotifyOptions.style!.background!, 'css', raw.spotify_background_css as WEProperty<'textinput'>, _r => _r.value);
    if (_.isEmpty(spotifyOptions.style!.background)) delete spotifyOptions.style!.background;
    if (_.isEmpty(spotifyOptions.style)) delete spotifyOptions.style;
    // .spotify.art
    setProperty(spotifyOptions.art!, 'enabled', raw.spotify_art as WEProperty<'bool'>, _r => _r.value);
    setProperty(spotifyOptions.art!, 'type', raw.spotify_art_type as WEProperty<'combo'>, _r => parseComboProperty(_r, SpotifyOverlayArtType));
    setProperty(spotifyOptions.art!, 'fetchLocalCovers', raw.spotify_art_fetch_local as WEProperty<'bool'>, _r => _r.value);
    setProperty(spotifyOptions.art!, 'fetchLocalCacheMaxAge', raw.spotify_art_fetch_local_cache_age as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    if (_.isEmpty(spotifyOptions.art)) delete spotifyOptions.art;
    // .spotify.scroll
    setProperty(spotifyOptions.scroll!, 'enabled', raw.spotify_scroll as WEProperty<'bool'>, _r => _r.value);
    setProperty(spotifyOptions.scroll!, 'type', raw.spotify_scroll_type as WEProperty<'combo'>, _r => parseComboProperty(_r, TextScrollingType));
    setProperty(spotifyOptions.scroll!, 'speed', raw.spotify_scroll_speed as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(spotifyOptions.scroll!, 'autoDelay', raw.spotify_scroll_auto_delay as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    if (_.isEmpty(spotifyOptions.scroll)) delete spotifyOptions.scroll;
    // .spotify.progressBar
    setProperty(spotifyOptions.progressBar!, 'enabled', raw.spotify_progressbar as WEProperty<'bool'>, _r => _r.value);
    setProperty(spotifyOptions.progressBar!, 'color', raw.spotify_progressbar_color as WEProperty<'color'>, _r => parseColorProperty(_r));
    setProperty(spotifyOptions.progressBar!, 'position', raw.spotify_progressbar_position as WEProperty<'combo'>, _r => parseComboProperty(_r, Position));
    if (_.isEmpty(spotifyOptions.progressBar)) delete spotifyOptions.progressBar;

    return _.merge(
        { ...rootOptions },
        !_.isEmpty(backgroundOptions) ? { background: backgroundOptions } : {},
        !_.isEmpty(audioSamplesOptions) ? { audioSamples: audioSamplesOptions } : {},
        !_.isEmpty(visualizerOptions) ? { visualizer: visualizerOptions } : {},
        !_.isEmpty(barVisualizerOptions) ? { barVisualizer: barVisualizerOptions } : {},
        !_.isEmpty(circularVisualizerOptions) ? { circularVisualizer: circularVisualizerOptions } : {},
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
