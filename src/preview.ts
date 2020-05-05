import _ from 'lodash';

type ProjectProperties = typeof import('../project.json/project.properties.json');

export function startPreview(projectProperties: ProjectProperties | null, ms: number) {
    const presets: Array<ProjectProperties> = [
        _.merge({}, projectProperties, {
            audioSamples_volumeGain: { value: 35 },
            audioSamples_scale: { value: 'Logarithm' },
            audioSamples_scale_Logarithm_base: { value: 2.2 },
            visualizer_type: { value: 'VerticalBars' },
            visualizer_color_responseType: { value: 'HslLightness' },
            visualizer_color_responseProvider: { value: 'ValueNormalized' },
            visualizer_color_responseValueGain: { value: 1 },
            visualizer_color_responseRange: { value: 35 },
            visualizer_color_responseDegree: { value: 0.8 },
            verticalVisualizer_width: { value: 45 },
            verticalVisualizer_alignment: { value: 0 },
            verticalVisualizer_color: { value: '0.176470 0.266667 0.611764' },
            verticalVisualizer_bars_width: { value: 60 },
            verticalVisualizer_bars_height: { value: 40 },
            verticalVisualizer_bars_borderRadius: { value: 0 },
        } as DeepPartial<ProjectProperties>),

        _.merge({}, projectProperties, {
            audioSamples_volumeGain: { value: 30 },
            audioSamples_scale: { value: 'Logarithm' },
            audioSamples_scale_Logarithm_base: { value: 2.2 },
            visualizer_type: { value: 'VerticalWave' },
            visualizer_color_responseType: { value: 'LabLightness' },
            visualizer_color_responseProvider: { value: 'ValueNormalized' },
            visualizer_color_responseValueGain: { value: 1 },
            visualizer_color_responseRange: { value: 35 },
            visualizer_color_responseDegree: { value: 0.8 },
            verticalVisualizer_width: { value: 45 },
            verticalVisualizer_alignment: { value: 0 },
            verticalVisualizer_color: { value: '0.8666666666666667 0.5725490196078431 0' },
            verticalVisualizer_wave_height: { value: 35 },
            verticalVisualizer_wave_thickness: { value: 2 },
            verticalVisualizer_wave_showMirrorWave: { value: true },
            verticalVisualizer_wave_fill: { value: false },
        } as DeepPartial<ProjectProperties>),

        _.merge({}, projectProperties, {
            audioSamples_volumeGain: { value: 35 },
            audioSamples_scale: { value: 'Gaussian' },
            visualizer_type: { value: 'CircularWave' },
            visualizer_color_responseType: { value: 'LabB' },
            visualizer_color_responseProvider: { value: 'ValueNormalized' },
            visualizer_color_responseValueGain: { value: 1 },
            visualizer_color_responseRange: { value: 50 },
            visualizer_color_responseDegree: { value: 0.8 },
            circularVisualizer_radius: { value: 22 },
            circularVisualizer_color: { value: '0.596078431372549 0.6313725490196078 0.45098039215686275' },
            circularVisualizer_wave_height: { value: 65 },
            circularVisualizer_wave_showMirrorWave: { value: true },
            circularVisualizer_wave_fill: { value: true },
        } as DeepPartial<ProjectProperties>),

        _.merge({}, projectProperties, {
            audioSamples_volumeGain: { value: 35 },
            audioSamples_scale: { value: 'Gaussian' },
            visualizer_type: { value: 'CircularBlocks' },
            visualizer_color_responseType: { value: 'LabA' },
            visualizer_color_responseProvider: { value: 'Change' },
            visualizer_color_responseValueGain: { value: 4.5 },
            visualizer_color_responseRange: { value: 50 },
            visualizer_color_responseDegree: { value: 1.4 },
            circularVisualizer_radius: { value: 22 },
            circularVisualizer_color: { value: '0.3137254901960784 0.3215686274509804 0.6823529411764706' },
            circularVisualizer_blocks_width: { value: 100 },
            circularVisualizer_blocks_height: { value: 75 },
            circularVisualizer_blocks_thickness: { value: 5 },
        } as DeepPartial<ProjectProperties>),
    ];

    const loop = (i: number) => {
        if (i >= presets.length) return;
        if (window.wallpaperPropertyListener === undefined) return;
        if (window.wallpaperPropertyListener.applyUserProperties === undefined) return;

        console.log('%c===| Preview %d', 'color: #350E23; font-weight:bold', i);
        window.wallpaperPropertyListener.applyUserProperties(presets[i]);
        setTimeout(() => loop(i + 1), ms);
    };
    loop(0);
}
