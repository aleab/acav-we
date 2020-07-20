/* eslint-disable no-extend-native */
/* eslint-disable func-names */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable react/jsx-key */

const fs = require('fs');
const path = require('path');

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const Parser = require('html-react-parser');

function withFAIcon(className, text) {
    return renderToStaticMarkup(
      <>
        <i className={`${className} fa-fw`} />
        {Parser(text)}
      </>,
    );
}

function withPropertyIcon(className, text) {
    return withFAIcon(`propertyIcon ${className}`, text);
}

function section(name, muted = false, propertyIcon = null) {
    const icon = propertyIcon ? (
      <span className={`${propertyIcon} fa-fw propertyIcon`} />
    ) : null;
    return renderToStaticMarkup(
        muted ? (
          <h3 className="text-muted">
            {icon}
            <ins>{name}</ins>
          </h3>
        ) : (
          <h3>
            {icon}
            <ins>{name}</ins>
          </h3>
        ),
    );
}

function subSection(name) {
    return renderToStaticMarkup(<h5><ins><b>{name}</b></ins></h5>);
}

function note(...textLines) {
    const lines = textLines.map((text, i, arr) => {
        return (
          <>
            {text ? <span className="text-muted"><small>{Parser(text)}</small></span> : <>&nbsp;</>}
            {i < arr.length - 1 ? <br /> : null}
          </>
        );
    });
    return renderToStaticMarkup(lines);
}

function indent(text, { n = 1, sp = '&nbsp;' } = { n: 1, sp: '&nbsp;' }) {
    return sp.repeat(n) + text;
}

function withTextColor(tag, color, text) {
    return `<${tag} class="text-${color}">${text}</${tag}>`;
}

function samp(text) { return `<samp>${text}</samp>`; }

const asterisk = () => '<sup class="text-warning">*</sup>';
const scalingFunctionsLink = text => `<a href="https://www.desmos.com/calculator/f0rirujpk8">${text}</a>`;
const smoothingLink = text => `<a href="https://www.desmos.com/calculator/4ozdtjxb3r">${text}</a>`;
const colorizerLink = text => `<a href="http://colorizer.org/">${text}</a>`;
const spotifyAuthLink = text => `<a href="https://aleab.github.io/acav-we/token">${text}</a>`;
const musicbrainzLink = text => `<a href="https://musicbrainz.org/search">${text}</a>`;
const bcp47WikiLink = text => `<a href="https://en.wikipedia.org/wiki/IETF_language_tag">${text}</a>`;
const mdnLocaleLink = text => `<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/DateTimeFormat#Syntax">${text}</a>`;

function getProjectJson() {
    const projectJsonProperties = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, 'project.properties.json')).toString(),
    );

    return {
        contentrating: 'Everyone',
        file: 'index.html',
        general: {
            localization: {
                'en-us': {
                    ui_showDescriptions: 'Show Descriptions',
                    ui_showAdvancedOptions: 'Show Advanced Options' + asterisk(),
                    ui_showStats: 'Show Stats' + asterisk(),
                    ui_limitFps: 'Limit FPS' + asterisk(),

                    // [BACKGROUND]
                    ui_background: section('Background'),
                    ui_background_type: indent('Type'),
                    ui_background_color: indent(withPropertyIcon('fas fa-palette', 'Color')),
                    ui_background_image: indent(withPropertyIcon('fas fa-image', 'Image')),
                    ui_background_css: indent(withPropertyIcon('fab fa-css3-alt', 'CSS')),
                    ui_background_playlist: indent(withPropertyIcon('fas fa-images', 'Playlist')),
                    ui_background_playlistTimer: indent(withPropertyIcon('far fa-stopwatch', 'Interval (hours)')),
                    ui_background_$_css: note('Only the <samp>background&#8209;*</samp> style properties and the <samp>background</samp> shorthand are allowed.'),

                    // [AUDIO SAMPLES]
                    ui_audioSamples: section('Audio Samples'),
                    ui_audioSamples_correct: withPropertyIcon('fas fa-filter', 'Correct Samples') + asterisk(),
                    ui_audioSamples_volumeGain: withPropertyIcon('fas fa-microphone', 'Linear Gain'),
                    ui_audioSamples_freqThreshold: withPropertyIcon('far fa-tachometer-slowest', 'Threshold'),
                    ui_audioSamples_buffer: withPropertyIcon('fas fa-stream', 'Buffer Length (s)') + asterisk(),
                    ui_audioSamples_normalize: withPropertyIcon('far fa-balance-scale', 'Normalize') + asterisk(),
                    //
                    // [AUDIO SAMPLES > SCALE]
                    ui_audioSamples_scale: withPropertyIcon('far fa-function', 'Scale') + asterisk() + `&nbsp;<sup>${scalingFunctionsLink('[1]')}</sup>`,
                    ui_audioSamples_scale_Linear: 'x',
                    ui_audioSamples_scale_Power: 'x<sup>n</sup>',
                    ui_audioSamples_scale_Exponential: 'n<sup>x</sup>',
                    ui_audioSamples_scale_Logarithm: 'log<sub>b</sub>(x+1)',
                    ui_audioSamples_scale_Logarithm$Power: 'a&#8201;log<sub>b</sub>(x+1) + c&#8201;x<sup>n</sup>',
                    ui_audioSamples_scale_Gaussian: 'Gaussian',

                    ui_audioSamples_scale_Power_exponent: indent('<var>n</var>', { n: 2 }),
                    ui_audioSamples_scale_Exponential_base: indent('<var>n</var>', { n: 2 }),
                    ui_audioSamples_scale_Logarithm_base: indent('<var>b</var>', { n: 2 }),
                    ui_audioSamples_scale_Logarithm$Power_a: indent('<var>a</var>', { n: 2 }),
                    ui_audioSamples_scale_Logarithm$Power_base: indent('<var>b</var>', { n: 2 }),
                    ui_audioSamples_scale_Logarithm$Power_exponent: indent('<var>n</var>', { n: 2 }),
                    ui_audioSamples_scale_Gaussian_deviation: indent('<samp>&#120590;</samp>', { n: 2 }),
                    ui_audioSamples_scale_Gaussian_mean: indent('<samp>&#120583;</samp>', { n: 2 }),
                    //
                    // $[AUDIO SAMPLES]
                    ui_$_audioSamples: note('The following filters are applied sequentially in the order they are listed here.'),
                    ui_$_audioSamples_buffer: note('How many seconds of samples to buffer for normalization and smoothing purposes.'),
                    ui_$_audioSamples_scale_Power: note(
                        `${samp('n')}&#8201;${samp('&lt;')}&#8201;${samp('1')}: Increases all values, especially lower ones, flattening the whole spectrum.`,
                        `${samp('n')}&#8201;${samp('&gt;')}&#8201;${samp('1')}: Squashes lower values down.`,
                    ),
                    ui_$_audioSamples_scale_Exponential: note(
                        `${samp('n')}&#8201;${samp('&lt;')}&#8201;${samp('2')}: Reduces higher values.`,
                        `${samp('n')}&#8201;${samp('&gt;')}&#8201;${samp('2')}: Increases higher values.`,
                    ),
                    ui_$_audioSamples_scale_Logarithm: note(
                        `${samp('b')}&#8201;${samp('&lt;')}&#8201;${samp('2')}: Increases mid values.`,
                        `${samp('b')}&#8201;${samp('&gt;')}&#8201;${samp('2')}: Reduces higher values.`,
                    ),
                    ui_$_audioSamples_scale_Logarithm$Power: note(
                        'Increasing <samp>a</samp> increases the contribution of the logarithm vs the power function.',
                        'The default settings make this function behave almost like <samp>x<sup>2</sup></samp>, but with low values less squashed and slightly lower peaks.',
                    ),
                    ui_$_audioSamples_scale_Gaussian: note(
                        'The default settings emphasize mid-high values.',
                        'Low values of <samp>&#120590;</samp> tend to isolate and increase values close to <samp>&#120583;</samp> and squash everything else down.',
                        `The most usable values are ${samp('0.4')}&#8239;${samp('&le;')}&#8239;${samp('&#120590;')}&#8239;${samp('&le;')}&#8201;${samp('0.5')} and ${samp('&#120583;')}&#8239;${samp('&ge;')}&#8239;${samp('0.8')}.`,
                    ),

                    // [VISUALIZER]
                    ui_visualizer: section('Visualizer'),
                    ui_visualizer_type: indent('Type'),
                    ui_visualizer_flipFrequencies: indent('Flip Frequencies'),
                    ui_visualizer_smoothing: indent('Smoothing') + asterisk() + `&nbsp;<sup>${smoothingLink('[2]')}</sup>`,

                    ui_visualizer_type_VerticalBars: withFAIcon('far fa-horizontal-rule fa-sm', ' Vertical, Bars'),
                    ui_visualizer_type_VerticalBlocks: withFAIcon('far fa-horizontal-rule fa-sm', ' Vertical, Blocks'),
                    ui_visualizer_type_VerticalWave: withFAIcon('far fa-horizontal-rule fa-sm', ' Vertical, Wave'),
                    ui_visualizer_type_CircularBars: withFAIcon('far fa-circle', ' Circular, Bars'),
                    ui_visualizer_type_CircularBlocks: withFAIcon('far fa-circle', ' Circular, Blocks'),
                    ui_visualizer_type_CircularWave: withFAIcon('far fa-circle', ' Circular, Wave'),
                    ui_visualizer_type_3DBars: withFAIcon('fas fa-cube', ' 3D, Bars'),

                    ui_visualizer_color_responseType: indent('Color Response') + `&nbsp;<sup>${colorizerLink('[3]')}</sup>`,
                    ui_visualizer_color_responseProvider: indent('React to', { n: 3 }) + asterisk(),
                    ui_visualizer_color_responseValueGain: indent('Gain', { n: 3 }) + asterisk(),
                    ui_visualizer_color_responseRange: indent('Range', { n: 3 }),
                    ui_visualizer_color_responseDegree: indent('Degree', { n: 3 }) + asterisk(),
                    ui_visualizer_color_response_toHue: indent('Max Color (Hue)', { n: 3 }),
                    //
                    // $[VISUALIZER]
                    ui_$_visualizer_color_responseType: note('This option controls what kind of transformation to apply to the color of each bar.'),
                    ui_$_visualizer_color_responseProvider: note(
                        'This defines which parameter or characteristic <samp>P</samp> of the audio samples to use to determine the <em>amount of effect</em> to apply to the color of each bar.',
                        '<samp><u>Value</u></samp>: the (normalized) value of the current sample.',
                        '<samp><u>Value Change</u></samp>: the (absolute) difference between the current sample and the oldest one in the buffer.',
                    ),
                    ui_$_visualizer_color_responseRange: note(
                        'The intensity of the effect, i.e. the difference between the maximum and minimum possible values of the color component(s) involved after the effect has been applied to the base color.',
                        '<u>Example</u>: for a base color with lightness 75, and a range of 35, the effect will produce a color with lightness 100 when the sample value is 1 (maximum) and 65 when the sample value is 0 (minimum).',
                    ),
                    ui_$_visualizer_color_responseDegree: note('Mathematical <em>degree</em> of the root of <samp>P</samp> used to control the sensitivity, or spread in some way, of the effect.'),

                    // ~ ~ ~ ~ ~ ~ ~ ~ ~
                    // [VERTICAL VISUALIZER]
                    ui_verticalVisualizer: section('Vertical Visualizer'),
                    ui_verticalVisualizer_position: indent('Position (%)'),
                    ui_verticalVisualizer_width: indent('Width (%)'),
                    ui_verticalVisualizer_alignment: indent('Alignment'),
                    ui_verticalVisualizer_color: indent('Color'),
                    //
                    // [VERTICAL VISUALIZER > BARS]
                    ui_verticalVisualizer_bars: subSection('Bars'),
                    ui_verticalVisualizer_bars_width: indent('Width (%)'),
                    ui_verticalVisualizer_bars_height: indent('Height (%)'),
                    ui_verticalVisualizer_bars_borderRadius: indent('Border Radius (%)'),
                    //
                    // [VERTICAL VISUALIZER > BLOCKS]
                    ui_verticalVisualizer_blocks: subSection('Blocks'),
                    ui_verticalVisualizer_blocks_width: indent('Width (%)'),
                    ui_verticalVisualizer_blocks_height: indent('Height (%)'),
                    ui_verticalVisualizer_blocks_thickness: indent('Thickness (px)'),
                    //
                    // [VERTICAL VISUALIZER > WAVE]
                    ui_verticalVisualizer_wave: subSection('Wave'),
                    ui_verticalVisualizer_wave_height: indent('Height (%)'),
                    ui_verticalVisualizer_wave_thickness: indent('Thickness (px)'),
                    ui_verticalVisualizer_wave_smoothness: indent('Smoothness'),
                    ui_verticalVisualizer_wave_showMirrorWave: indent('Mirror Wave'),
                    ui_verticalVisualizer_wave_fill: indent('Fill'),

                    // ~ ~ ~ ~ ~ ~ ~ ~ ~
                    // [CIRCULAR VISUALIZER]
                    ui_circularVisualizer: section('Circular Visualizer'),
                    ui_circularVisualizer_x: indent('X (%)'),
                    ui_circularVisualizer_y: indent('Y (%)'),
                    ui_circularVisualizer_radius: indent('Radius (%)'),
                    ui_circularVisualizer_rotation: indent('Rotation (deg)'),
                    ui_circularVisualizer_angle: indent('Angle (deg)'),
                    ui_circularVisualizer_color: indent('Color'),
                    //
                    // [CIRCULAR VISUALIZER > BARS]
                    ui_circularVisualizer_bars: subSection('Bars'),
                    ui_circularVisualizer_bars_width: indent('Width (%)'),
                    ui_circularVisualizer_bars_height: indent('Height (%)'),
                    //
                    // [CIRCULAR VISUALIZER > BLOCKS]
                    ui_circularVisualizer_blocks: subSection('Blocks'),
                    ui_circularVisualizer_blocks_width: indent('Width (%)'),
                    ui_circularVisualizer_blocks_height: indent('Height (%)'),
                    ui_circularVisualizer_blocks_thickness: indent('Thickness (px)'),
                    //
                    // [CIRCULAR VISUALIZER > WAVE]
                    ui_circularVisualizer_wave: subSection('Wave'),
                    ui_circularVisualizer_wave_height: indent('Height (%)'),
                    ui_circularVisualizer_wave_thickness: indent('Thickness (px)'),
                    ui_circularVisualizer_wave_smoothness: indent('Smoothness'),
                    ui_circularVisualizer_wave_showMirrorWave: indent('Mirror Wave'),
                    ui_circularVisualizer_wave_fill: indent('Fill'),

                    // ~ ~ ~ ~ ~ ~ ~ ~ ~
                    // [3D VISUALIZER]
                    ui_3dVisualizer: section('3D Visualizer'),
                    ui_3dVisualizer_color: indent('Color'),
                    ui_3dVisualizer_zoom: indent('Zoom'),
                    //
                    // [3D VISUALIZER > BARS]
                    ui_3dVisualizer_bars: subSection('Bars'),
                    ui_3dVisualizer_bars_width: indent('Width (%)'),
                    ui_3dVisualizer_bars_height: indent('Height (%)'),
                    ui_3dVisualizer_bars_phiX: indent('<sample>&#120593;<sub>x</sub></sample> (deg)'),
                    ui_3dVisualizer_bars_phiY: indent('<sample>&#120593;<sub>y</sub></sample> (deg)'),
                    ui_3dVisualizer_bars_y0: indent('<var>y<sub>0</sub></var> (%)'),
                    ui_3dVisualizer_bars_deltaX: indent('<sample>&#120575;<sub>x</sub></sample> (%)'),
                    ui_3dVisualizer_bars_deltaY: indent('<sample>&#120575;<sub>y</sub></sample> (%)'),
                    //
                    // [3D VISUALIZER > BARS > LIGHT]
                    ui_3dVisualizer_bars_light: subSection('Light'),
                    ui_3dVisualizer_bars_light_angleX: indent('<sample>&#120599;<sub>x</sub></sample> (deg)'),
                    ui_3dVisualizer_bars_light_power: indent('Power'),
                    ui_3dVisualizer_bars_light_color: indent('Color'),

                    // [CLOCK]
                    ui_clock: section('Clock', false, 'far fa-clock'),
                    ui_clock_pivot: indent('Pivot'),
                    ui_clock_position_x: indent('X (%)'),
                    ui_clock_position_y: indent('Y (%)'),
                    ui_clock_digital_font: indent('Font'),
                    ui_clock_digital_fontsize: indent('Font Size (px)'),
                    ui_clock_digital_text_color: indent('Text Color'),
                    ui_clock_custom_css: indent(withPropertyIcon('fab fa-css3-alt', 'Style')) + asterisk(),
                    ui_clock_seconds: indent('Show Seconds'),
                    ui_clock_digital_locale: indent('Locale') + asterisk(),
                    ui_clock_digital_24h: indent('24H'),
                    ui_$_clock_digital_locale: note(
                        `A ${bcp47WikiLink('BCP 47 language tag')}; unicode extensions are supported. The documentation of the formatting function used is ${mdnLocaleLink('here')}.`,
                    ),
                    ui_$_clock_digital_locale2: note(
                        'For example, <code>th-TH-u-nu-thai-hc-h12</code> changes the formatting to use the thai language (<em>th-TH</em>), the thai numerals (<em>nu-thai</em>) and a 12-hour clock (<em>hc-h12</em>).',
                    ),
                    //
                    // [CLOCK > BASS EFFECT]
                    ui_clock_bass_effect: subSection('Bass Effect'),
                    ui_clock_bass_effect_frequency: indent('Range (Hz)', { n: 3 }),
                    ui_clock_bass_effect_smoothing: indent('Smoothing', { n: 3 }),

                    // [TASKBAR]
                    ui_taskbar: section('Taskbar', false, 'text-white fab fa-windows'),
                    ui_$_taskbar: note("Simple audio-responsive effect intended to be used with Windows 10's \"Transparency effects\" enabled."),
                    ui_taskbar_isSmall: indent('Small'),
                    ui_taskbar_scale: indent('Scale (%)'),
                    ui_taskbar_size: indent('Size Multiplier'),
                    ui_taskbar_position: indent('Position'),
                    ui_taskbar_frequency_range: indent('Frequency Range'),
                    ui_taskbar_resolution: indent('Resolution (%)'),
                    ui_taskbar_brightness: indent('Brightness (%)'),

                    // [SPOTIFY]
                    ui_spotify: section('Spotify', false, 'text-white fab fa-spotify'),
                    ui_spotify_backend_url: indent('Backend URL') + asterisk(),
                    ui_spotify_token: indent('Token'),
                    ui_$_spotify_token: note(`To use Spotify's overlay you need an access token. You can request a <em>token</em> ${spotifyAuthLink('here')}.`),
                    ui_$_spotify_token_note: note(
                        "<b><u>Note</u></b>: Including your <em>token</em> in shared presets won't leak any potentially private information nor will it " +
                          'let other users use your access token (<samp>AT</samp>). The <em>token</em> is encrypted and only valid for a couple of minutes ' +
                          "until it is exchanged (behind the scenes) for an actual <samp>AT</samp>, which is then saved in your device's local storage.",
                    ),
                    ui_spotify_pivot: indent('Pivot'),
                    ui_spotify_position_x: indent('X (%)'),
                    ui_spotify_position_y: indent('Y (%)'),
                    ui_spotify_width: indent('Width (px)'),
                    ui_spotify_font_size: indent('Font Size (px)'),
                    ui_spotify_text_color: indent('Text Color'),
                    //
                    // [SPOTIFY > BACKGROUND]
                    ui_spotify_background: subSection('Background'),
                    ui_spotify_background_type: indent('Type', { n: 3 }),
                    ui_spotify_background_color: indent(withPropertyIcon('fas fa-palette', 'Color'), { n: 3 }),
                    ui_spotify_background_color_alpha: indent('Alpha', { n: 3 }),
                    ui_spotify_background_css: indent(withPropertyIcon('fab fa-css3-alt', 'CSS'), { n: 3 }),
                    //
                    // [SPOTIFY > ART]
                    ui_spotify_art: subSection('Cover Art / Icon'),
                    ui_spotify_art_type: indent('Type', { n: 3 }),
                    ui_spotify_art_fetch_local: indent('Fetch Local', { n: 3 }),
                    ui_$_spotify_art_fetch_local: note(
                        '<b><u>Experimental</u></b>',
                        `Use an external provider (${musicbrainzLink('musicbrainz.com')}) to fetch cover arts of local files.`,
                    ),
                    ui_$_spotify_art_fetch_local_note: note(
                        'Local files must contain album and artist(s) metadata, which should match as closely as possible the information ' +
                          `provided by ${musicbrainzLink('musicbrainz.com')}, especially in regard to romanized names and titles; ` +
                          'proximity, fuzzy and partial searches will be performed nonetheless in order to always find the best match.',
                        "<u>MusicBrainz's terminology</u>",
                        '- <em>recording</em>: a song',
                        '- <em>release-group</em>: an album, single, etc.',
                        '- <em>release</em>: a specific version/issuing of an album, single, etc.',
                    ),
                    ui_spotify_art_fetch_local_cache_age: indent('Cache (days)', { n: 3 }) + asterisk(),
                    //
                    // [SPOTIFY > TEXT SCROLLING]
                    ui_spotify_scroll: subSection('Text Scrolling'),
                    ui_spotify_scroll_type: indent('Type', { n: 3 }),
                    ui_spotify_scroll_speed: indent('Speed (px/s)', { n: 3 }),
                    ui_spotify_scroll_auto_delay: indent('Delay (s)', { n: 3 }),
                    //
                    // [SPOTIFY > PROGRESS BAR]
                    ui_spotify_progressbar: subSection('Progress Bar'),
                    ui_spotify_progressbar_position: indent('Position', { n: 3 }),
                    ui_spotify_progressbar_color: indent('Color', { n: 3 }),

                    // [iCUE]
                    ui_icue: section('iCUE'),
                    ui_icue_boost: indent('Boost'),
                    ui_icue_spectrum_start: indent('Spectrum Start (%)'),
                    ui_$_icue_spectrum_start: note('The index of the first audio sample to use.', null),
                    ui_icue_spectrum_width: indent('Spectrum Width (%)'),
                    ui_$_icue_spectrum_width: note('The amount of audio samples to use.', null),

                    // [NOTES]
                    ui_notes: section('Notes', true),
                    ui_note1: note(
                        `<sup>${scalingFunctionsLink('[1]')}</sup> Graphical comparison of the scaling functions.`,
                        `<sup>${smoothingLink('[2]')}</sup> Graphical visualization of the smoothing function.`,
                    ),
                    ui_note2: note(
                        `<sup>${colorizerLink('[3]')}</sup> Color spaces comparison and conversions.`,
                        null,
                    ),
                },
            },
            properties: projectJsonProperties,
            supportsaudioprocessing: true,
        },
        preview: 'preview.gif',
        tags: ['Abstract'],
        title: 'Customizable Audio Visualizer',
        type: 'web',
        workshopid: '2071366191',
    };
}

module.exports = getProjectJson;
