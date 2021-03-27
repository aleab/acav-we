/* eslint-disable no-param-reassign */
import _ from 'lodash';

import { Pivot } from '../../common/Pivot';
import { Position } from '../../common/Position';
import { AudioResponsiveValueProvider } from '../AudioResponsiveValueProvider';
import { BackgroundMode, ForegroundMode } from '../BackgroundMode';
import { ColorReactionType } from '../ColorReactionType';
import { ClockFontFamily } from '../ClockFontFamily';
import { FrequencyRange } from '../FrequencyRange';
import { ScaleFunction } from '../ScaleFunction';
import SpotifyOverlayArtType from '../SpotifyOverlayArtType';
import { TaskbarPosition } from '../TaskbarPosition';
import { TextScrollingType } from '../TextScrollingType';
import { VisualizerType } from '../VisualizerType';

import AudioSamplesProperties from './AudioSamplesProperties';
import BackgroundProperties from './BackgroundProperties';
import ForegroundProperties from './ForegroundProperties';
import ClockProperties from './ClockProperties';
import SpotifyProperties from './SpotifyProperties';
import TaskbarProperties from './TaskbarProperties';
import { CircularVisualizerProperties, ThreeDVisualizerProperties, VerticalVisualizerProperties, VisualizerProperties } from './VisualizerProperties';

export default interface Properties {
    audioprocessing: boolean;
    showStats: boolean;
    limitFps: boolean;
    background: BackgroundProperties;
    foreground: ForegroundProperties;
    audioSamples: AudioSamplesProperties;
    visualizer: VisualizerProperties;
    verticalVisualizer: VerticalVisualizerProperties;
    circularVisualizer: CircularVisualizerProperties;
    threeDVisualizer: ThreeDVisualizerProperties;
    clock: ClockProperties;
    taskbar: TaskbarProperties;
    spotify: SpotifyProperties;
    icuePlugin: {
        enabled: boolean;
        boost: number;
        spectrumStart: number;
        spectrumWidth: number;
    };
}

function parseComboProperty<TEnum>(prop: WEProperty<'combo'>, EnumType: TEnum): TEnum[keyof TEnum] {
    let key = prop.value as keyof typeof EnumType;
    if (!_.some(prop.options, o => o.value === key)) {
        key = prop.options[0].value as keyof typeof EnumType;
    }
    return EnumType[key];
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

    // .foreground
    const foregroundOptions: MappedProperties['foreground'] = {};
    setProperty(foregroundOptions, 'enabled', raw.foreground as WEProperty<'bool'>, _r => _r.value);
    setProperty(foregroundOptions, 'mode', raw.foreground_type as WEProperty<'combo'>, _r => parseComboProperty(_r, ForegroundMode));
    setProperty(foregroundOptions, 'imagePath', raw.foreground_image as WEProperty<'file'>, _r => _r.value);
    setProperty(foregroundOptions, 'css', raw.foreground_css as WEProperty<'textinput'>, _r => _r.value);

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

    // .verticalVisualizer
    const verticalVisualizerOptions: MappedProperties['verticalVisualizer'] = { bars: {}, blocks: {}, wave: {} };
    setProperty(verticalVisualizerOptions, 'position', raw.verticalVisualizer_position as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(verticalVisualizerOptions, 'width', raw.verticalVisualizer_width as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(verticalVisualizerOptions, 'alignment', raw.verticalVisualizer_alignment as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(verticalVisualizerOptions, 'color', raw.verticalVisualizer_color as WEProperty<'color'>, _r => toRgbaColor(parseColorProperty(_r)));
    setProperty(verticalVisualizerOptions, 'useSilentColor', raw.verticalVisualizer_silentColor_bool as WEProperty<'bool'>, _r => _r.value);
    setProperty(verticalVisualizerOptions, 'silentColor', raw.verticalVisualizer_silentColor as WEProperty<'color'>, _r => toRgbaColor(parseColorProperty(_r)));
    // .verticalVisualizer.bars
    setProperty(verticalVisualizerOptions.bars!, 'width', raw.verticalVisualizer_bars_width as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(verticalVisualizerOptions.bars!, 'height', raw.verticalVisualizer_bars_height as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(verticalVisualizerOptions.bars!, 'minHeight', raw.verticalVisualizer_bars_minHeight as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(verticalVisualizerOptions.bars!, 'borderRadius', raw.verticalVisualizer_bars_borderRadius as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    if (_.isEmpty(verticalVisualizerOptions.bars)) delete verticalVisualizerOptions.bars;
    // .verticalVisualizer.blocks
    setProperty(verticalVisualizerOptions.blocks!, 'width', raw.verticalVisualizer_blocks_width as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(verticalVisualizerOptions.blocks!, 'height', raw.verticalVisualizer_blocks_height as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(verticalVisualizerOptions.blocks!, 'thickness', raw.verticalVisualizer_blocks_thickness as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(verticalVisualizerOptions.blocks!, 'hideWhenSilent', raw.verticalVisualizer_blocks_hideWhenSilent as WEProperty<'bool'>, _r => _r.value);
    if (_.isEmpty(verticalVisualizerOptions.blocks)) delete verticalVisualizerOptions.blocks;
    // .verticalVisualizer.wave
    setProperty(verticalVisualizerOptions.wave!, 'height', raw.verticalVisualizer_wave_height as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(verticalVisualizerOptions.wave!, 'showMirrorWave', raw.verticalVisualizer_wave_showMirrorWave as WEProperty<'bool'>, _r => _r.value);
    setProperty(verticalVisualizerOptions.wave!, 'fill', raw.verticalVisualizer_wave_fill as WEProperty<'bool'>, _r => _r.value);
    setProperty(verticalVisualizerOptions.wave!, 'thickness', raw.verticalVisualizer_wave_thickness as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(verticalVisualizerOptions.wave!, 'smoothness', raw.verticalVisualizer_wave_smoothness as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(verticalVisualizerOptions.wave!, 'hideWhenSilent', raw.verticalVisualizer_wave_hideWhenSilent as WEProperty<'bool'>, _r => _r.value);
    if (_.isEmpty(verticalVisualizerOptions.wave)) delete verticalVisualizerOptions.wave;

    // .circularVisualizer
    const circularVisualizerOptions: MappedProperties['circularVisualizer'] = { bars: {}, blocks: {}, wave: {} };
    setProperty(circularVisualizerOptions, 'x', raw.circularVisualizer_x as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions, 'y', raw.circularVisualizer_y as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions, 'radius', raw.circularVisualizer_radius as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions, 'rotation', raw.circularVisualizer_rotation as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions, 'angle', raw.circularVisualizer_angle as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions, 'color', raw.circularVisualizer_color as WEProperty<'color'>, _r => toRgbaColor(parseColorProperty(_r)));
    setProperty(circularVisualizerOptions, 'useSilentColor', raw.circularVisualizer_silentColor_bool as WEProperty<'bool'>, _r => _r.value);
    setProperty(circularVisualizerOptions, 'silentColor', raw.circularVisualizer_silentColor as WEProperty<'color'>, _r => toRgbaColor(parseColorProperty(_r)));
    // .circularVisualizer.bars
    setProperty(circularVisualizerOptions.bars!, 'width', raw.circularVisualizer_bars_width as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions.bars!, 'height', raw.circularVisualizer_bars_height as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions.bars!, 'minHeight', raw.circularVisualizer_bars_minHeight as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    if (_.isEmpty(circularVisualizerOptions.bars)) delete circularVisualizerOptions.bars;
    // .circularVisualizer.blocks
    setProperty(circularVisualizerOptions.blocks!, 'width', raw.circularVisualizer_blocks_width as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions.blocks!, 'height', raw.circularVisualizer_blocks_height as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions.blocks!, 'thickness', raw.circularVisualizer_blocks_thickness as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions.blocks!, 'hideWhenSilent', raw.circularVisualizer_blocks_hideWhenSilent as WEProperty<'bool'>, _r => _r.value);
    if (_.isEmpty(circularVisualizerOptions.blocks)) delete circularVisualizerOptions.blocks;
    // .circularVisualizer.wave
    setProperty(circularVisualizerOptions.wave!, 'height', raw.circularVisualizer_wave_height as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions.wave!, 'thickness', raw.circularVisualizer_wave_thickness as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions.wave!, 'smoothness', raw.circularVisualizer_wave_smoothness as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(circularVisualizerOptions.wave!, 'showMirrorWave', raw.circularVisualizer_wave_showMirrorWave as WEProperty<'bool'>, _r => _r.value);
    setProperty(circularVisualizerOptions.wave!, 'fill', raw.circularVisualizer_wave_fill as WEProperty<'bool'>, _r => _r.value);
    setProperty(circularVisualizerOptions.wave!, 'hideWhenSilent', raw.circularVisualizer_wave_hideWhenSilent as WEProperty<'bool'>, _r => _r.value);
    if (_.isEmpty(circularVisualizerOptions.wave)) delete circularVisualizerOptions.wave;

    // .threeDVisualizer
    const threeDVisualizerOptions: MappedProperties['threeDVisualizer'] = { bars: { light: {} } };
    setProperty(threeDVisualizerOptions, 'color', raw['3dVisualizer_color'] as WEProperty<'color'>, _r => toRgbaColor(parseColorProperty(_r)));
    setProperty(threeDVisualizerOptions, 'zoom', raw['3dVisualizer_zoom'] as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(threeDVisualizerOptions, 'useSilentColor', raw['_3dVisualizer_silentColor_bool'] as WEProperty<'bool'>, _r => _r.value);
    setProperty(threeDVisualizerOptions, 'silentColor', raw['3dVisualizer_silentColor'] as WEProperty<'color'>, _r => toRgbaColor(parseColorProperty(_r)));
    setProperty(threeDVisualizerOptions, 'hideWhenSilent', raw['3dVisualizer_hideWhenSilent'] as WEProperty<'bool'>, _r => _r.value);
    // .threeDVisualizer.bars
    setProperty(threeDVisualizerOptions.bars!, 'width', raw['3dVisualizer_bars_width'] as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(threeDVisualizerOptions.bars!, 'height', raw['3dVisualizer_bars_height'] as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(threeDVisualizerOptions.bars!, 'phiX', raw['3dVisualizer_bars_phiX'] as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(threeDVisualizerOptions.bars!, 'phiY', raw['3dVisualizer_bars_phiY'] as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(threeDVisualizerOptions.bars!, 'y0', raw['3dVisualizer_bars_y0'] as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(threeDVisualizerOptions.bars!, 'deltaX', raw['3dVisualizer_bars_deltaX'] as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(threeDVisualizerOptions.bars!, 'deltaY', raw['3dVisualizer_bars_deltaY'] as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    // .threeDVisualizer.bars.light
    setProperty(threeDVisualizerOptions.bars!.light!, 'angleX', raw['3dVisualizer_bars_light_angleX'] as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(threeDVisualizerOptions.bars!.light!, 'power', raw['3dVisualizer_bars_light_power'] as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(threeDVisualizerOptions.bars!.light!, 'color', raw['3dVisualizer_bars_light_color'] as WEProperty<'color'>, _r => parseColorProperty(_r));
    if (_.isEmpty(threeDVisualizerOptions.bars!.light)) delete threeDVisualizerOptions.bars!.light;
    if (_.isEmpty(threeDVisualizerOptions.bars)) delete threeDVisualizerOptions.bars;

    // .clock
    const clockOptions: MappedProperties['clock'] = { digital: {}, bassEffect: {} };
    setProperty(clockOptions, 'enabled', raw.clock as WEProperty<'bool'>, _r => _r.value);
    setProperty(clockOptions, 'pivot', raw.clock_pivot as WEProperty<'combo'>, _r => parseComboProperty(_r, Pivot));
    setProperty(clockOptions, 'left', raw.clock_position_x as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(clockOptions, 'top', raw.clock_position_y as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(clockOptions, 'customCss', raw.clock_custom_css as WEProperty<'textinput'>, _r => _r.value);
    setProperty(clockOptions, 'showSeconds', raw.clock_seconds as WEProperty<'bool'>, _r => _r.value);
    // .clock.digital
    setProperty(clockOptions.digital!, 'font', raw.clock_digital_font as WEProperty<'combo'>, _r => parseComboProperty(_r, ClockFontFamily));
    setProperty(clockOptions.digital!, 'fontSize', raw.clock_digital_fontsize as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(clockOptions.digital!, 'textColor', raw.clock_digital_text_color as WEProperty<'color'>, _r => parseColorProperty(_r));
    setProperty(clockOptions.digital!, 'locale', raw.clock_digital_locale as WEProperty<'textinput'>, _r => _r.value);
    setProperty(clockOptions.digital!, 'is24h', raw.clock_digital_24h as WEProperty<'bool'>, _r => _r.value);
    if (_.isEmpty(clockOptions.digital)) delete clockOptions.digital;
    // .clock.bassEffect
    setProperty(clockOptions.bassEffect!, 'enabled', raw.clock_bass_effect as WEProperty<'bool'>, _r => _r.value);
    setProperty(clockOptions.bassEffect!, 'frequency', raw.clock_bass_effect_frequency as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(clockOptions.bassEffect!, 'smoothing', raw.clock_bass_effect_smoothing as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    if (_.isEmpty(clockOptions.bassEffect)) delete clockOptions.bassEffect;

    // .taskbar
    const taskbarOptions: MappedProperties['taskbar'] = {};
    setProperty(taskbarOptions, 'enabled', raw.taskbar as WEProperty<'bool'>, _r => _r.value);
    setProperty(taskbarOptions, 'isSmall', raw.taskbar_isSmall as WEProperty<'bool'>, _r => _r.value);
    setProperty(taskbarOptions, 'scale', raw.taskbar_scale as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(taskbarOptions, 'position', raw.taskbar_position as WEProperty<'combo'>, _r => parseComboProperty(_r, TaskbarPosition));
    setProperty(taskbarOptions, 'size', raw.taskbar_size as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(taskbarOptions, 'frequencyRange', raw.taskbar_frequency_range as WEProperty<'combo'>, _r => parseComboProperty(_r, FrequencyRange));
    setProperty(taskbarOptions, 'resolution', raw.taskbar_resolution as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(taskbarOptions, 'brightness', raw.taskbar_brightness as WEProperty<'slider'>, _r => parseSliderProperty(_r));

    // .spotify
    const spotifyOptions: MappedProperties['spotify'] = { style: { background: {} }, logo: {}, art: {}, scroll: {}, progressBar: {} };
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
    // .spotify.style.logo
    setProperty(spotifyOptions.logo!, 'preferMonochrome', raw.spotify_logo_preferMonochrome as WEProperty<'bool'>, _r => _r.value);
    setProperty(spotifyOptions.logo!, 'position', raw.spotify_logo_position as WEProperty<'combo'>, _r => parseComboProperty(_r, Position));
    setProperty(spotifyOptions.logo!, 'alignment', raw.spotify_logo_alignment as WEProperty<'combo'>, _r => parseComboProperty(_r, Position));
    if (_.isEmpty(spotifyOptions.logo)) delete spotifyOptions.logo;
    // .spotify.art
    setProperty(spotifyOptions.art!, 'enabled', raw.spotify_art as WEProperty<'bool'>, _r => _r.value);
    setProperty(spotifyOptions.art!, 'type', raw.spotify_art_type as WEProperty<'combo'>, _r => parseComboProperty(_r, SpotifyOverlayArtType));
    setProperty(spotifyOptions.art!, 'position', raw.spotify_art_position as WEProperty<'combo'>, _r => parseComboProperty(_r, Position));
    setProperty(spotifyOptions.art!, 'fetchLocalCovers', raw.spotify_art_fetch_local as WEProperty<'bool'>, _r => _r.value);
    setProperty(spotifyOptions.art!, 'fetchLocalCacheMaxAge', raw.spotify_art_fetch_local_cache_age as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(spotifyOptions.art!, 'hideMusicbrainzLogo', raw.spotify_art_fetch_local_hideMusicbrainzLogo as WEProperty<'bool'>, _r => _r.value);
    if (_.isEmpty(spotifyOptions.art)) delete spotifyOptions.art;
    // .spotify.scroll
    setProperty(spotifyOptions.scroll!, 'type', raw.spotify_scroll_type as WEProperty<'combo'>, _r => parseComboProperty(_r, TextScrollingType));
    setProperty(spotifyOptions.scroll!, 'speed', raw.spotify_scroll_speed as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(spotifyOptions.scroll!, 'autoDelay', raw.spotify_scroll_auto_delay as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    if (_.isEmpty(spotifyOptions.scroll)) delete spotifyOptions.scroll;
    // .spotify.progressBar
    setProperty(spotifyOptions.progressBar!, 'enabled', raw.spotify_progressbar as WEProperty<'bool'>, _r => _r.value);
    setProperty(spotifyOptions.progressBar!, 'color', raw.spotify_progressbar_color as WEProperty<'color'>, _r => parseColorProperty(_r));
    setProperty(spotifyOptions.progressBar!, 'position', raw.spotify_progressbar_position as WEProperty<'combo'>, _r => parseComboProperty(_r, Position));
    if (_.isEmpty(spotifyOptions.progressBar)) delete spotifyOptions.progressBar;

    // .icue
    const icueOptions: MappedProperties['icuePlugin'] = {};
    setProperty(icueOptions, 'enabled', raw.icue as WEProperty<'bool'>, _r => _r.value);
    setProperty(icueOptions, 'boost', raw.icue_boost as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(icueOptions, 'spectrumStart', raw.icue_spectrum_start as WEProperty<'slider'>, _r => parseSliderProperty(_r));
    setProperty(icueOptions, 'spectrumWidth', raw.icue_spectrum_width as WEProperty<'slider'>, _r => parseSliderProperty(_r));

    return _.merge(
        { ...rootOptions },
        !_.isEmpty(backgroundOptions) ? { background: backgroundOptions } : {},
        !_.isEmpty(foregroundOptions) ? { foreground: foregroundOptions } : {},
        !_.isEmpty(audioSamplesOptions) ? { audioSamples: audioSamplesOptions } : {},
        !_.isEmpty(visualizerOptions) ? { visualizer: visualizerOptions } : {},
        !_.isEmpty(verticalVisualizerOptions) ? { verticalVisualizer: verticalVisualizerOptions } : {},
        !_.isEmpty(circularVisualizerOptions) ? { circularVisualizer: circularVisualizerOptions } : {},
        !_.isEmpty(threeDVisualizerOptions) ? { threeDVisualizer: threeDVisualizerOptions } : {},
        !_.isEmpty(clockOptions) ? { clock: clockOptions } : {},
        !_.isEmpty(taskbarOptions) ? { taskbar: taskbarOptions } : {},
        !_.isEmpty(spotifyOptions) ? { spotify: spotifyOptions } : {},
        !_.isEmpty(icueOptions) ? { icuePlugin: icueOptions } : {},
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
