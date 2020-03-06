/* eslint-disable no-extend-native */
/* eslint-disable func-names */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable react/jsx-key */

const fs = require('fs');
const path = require('path');

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const Parser = require('html-react-parser');

function withPropertyIcon(className, text) {
    return renderToStaticMarkup(
      <>
        <span className={`${className} fa-fw propertyIcon`} />
        {Parser(text)}
      </>,
    );
}

function section(name, muted = false) {
    return renderToStaticMarkup(
        muted ? (
          <h3 className="text-muted"><ins>{name}</ins></h3>
        ) : (
          <h3><ins>{name}</ins></h3>
        ),
    );
}

function subSection(name) {
    return renderToStaticMarkup(<h4><ins>{name}</ins></h4>);
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
const scalingFunctionsLink = text => `<a href="https://www.desmos.com/calculator/mz2cdi4qlf">${text}</a>`;
const smoothingLink = text => `<a href="https://www.desmos.com/calculator/4ozdtjxb3r">${text}</a>`;
const colorizerLink = text => `<a href="http://colorizer.org/">${text}</a>`;

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

                    // [BAR VISUALIZER]
                    ui_barVisualizer: section('Bar Visualizer'),
                    ui_barVisualizer_position: indent('Position (%)'),
                    ui_barVisualizer_width: indent('Width (%)'),
                    ui_barVisualizer_flipFrequencies: indent('Flip Frequencies'),
                    ui_barVisualizer_smoothing: indent('Smoothing') + asterisk() + `&nbsp;<sup>${smoothingLink('[2]')}</sup>`,

                    // [BAR VISUALIZER > BARS]
                    ui_barVisualizer_bars: subSection('Bars'),
                    ui_barVisualizer_bars_width: indent('Width (%)'),
                    ui_barVisualizer_bars_height: indent('Height (%)'),
                    ui_barVisualizer_bars_borderRadius: indent('Border Radius (%)'),
                    ui_barVisualizer_bars_alignment: indent('Alignment'),
                    ui_barVisualizer_bars_color: indent('Color'),
                    ui_barVisualizer_bars_responseType: indent('Response Type') + `&nbsp;<sup>${colorizerLink('[3]')}</sup>`,
                    ui_barVisualizer_bars_responseProvider: indent('React to', { n: 3 }) + asterisk(),
                    ui_barVisualizer_bars_responseValueGain: indent('Gain', { n: 3 }) + asterisk(),
                    ui_barVisualizer_bars_responseRange: indent('Range', { n: 3 }),
                    ui_barVisualizer_bars_responseDegree: indent('Degree', { n: 3 }) + asterisk(),
                    ui_barVisualizer_bars_response_toHue: indent('Max Color (Hue)', { n: 3 }),

                    // $[BAR VISUALIZER]
                    ui_$_barVisualizer_bars_responseType: note('This option controls what kind of transformation to apply to the color of each bar.'),
                    ui_$_barVisualizer_bars_responseProvider: note(
                        'This defines which parameter or characteristic <samp>P</samp> of the audio samples to use to determine the <em>amount of effect</em> to apply to the color of each bar.',
                        '<samp><u>Value</u></samp>: the (normalized) value of the current sample.',
                        '<samp><u>Value Change</u></samp>: the (absolute) difference between the current sample and the oldest one in the buffer.',
                    ),
                    ui_$_barVisualizer_bars_responseRange: note(
                        'The intensity of the effect, i.e. the difference between the maximum and minimum possible values of the color component(s) involved after the effect has been applied to the base color.',
                        '<u>Example</u>: for a base color with lightness 75, and a range of 35, the effect will produce a color with lightness 100 when the sample value is 1 (maximum) and 65 when the sample value is 0 (minimum).',
                    ),
                    ui_$_barVisualizer_bars_responseDegree: note('Mathematical <em>degree</em> of the root of <samp>P</samp> used to control the sensitivity, or spread in some way, of the effect.'),

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
        title: 'Aleab\'s Customizable Audio Visualizer',
        type: 'web',
    };
}

module.exports = getProjectJson;
