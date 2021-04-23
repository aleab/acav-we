import _ from 'lodash';

type ProjectProperties = typeof import('../project.json/project.properties.json');

export function startPreview(projectProperties: ProjectProperties | null, ms: number) {
    const presets: Array<ProjectProperties> = [
        _.merge({}, projectProperties, {
            background_color: { value: '0 0 0' },
            audioSamples_volumeGain: { value: 35 },
            audioSamples_scale: { value: 'Gaussian' },
            visualizer_type: { value: 'VerticalBars' },
            visualizer_color_responseType: { value: 'HslLightness' },
            visualizer_color_responseProvider: { value: 'ValueNormalized' },
            visualizer_color_responseValueGain: { value: 1 },
            visualizer_color_responseRange: { value: 35 },
            visualizer_color_responseDegree: { value: 0.8 },
            verticalVisualizer_width: { value: 45 },
            verticalVisualizer_alignment: { value: 0 },
            verticalVisualizer_color: { value: '0.176470 0.266667 0.611764' },
            verticalVisualizer_bars_width: { value: 75 },
            verticalVisualizer_bars_height: { value: 35 },
            verticalVisualizer_bars_borderRadius: { value: 0 },
        } as DeepPartial<ProjectProperties>),

        _.merge({}, projectProperties, {
            background_color: { value: '0 0 0' },
            audioSamples_volumeGain: { value: 35 },
            audioSamples_scale: { value: 'Gaussian' },
            visualizer_type: { value: 'VerticalWave' },
            visualizer_color_responseType: { value: 'LabLightness' },
            visualizer_color_responseProvider: { value: 'ValueNormalized' },
            visualizer_color_responseValueGain: { value: 1.5 },
            visualizer_color_responseRange: { value: 35 },
            visualizer_color_responseDegree: { value: 0.8 },
            verticalVisualizer_width: { value: 45 },
            verticalVisualizer_alignment: { value: 0 },
            verticalVisualizer_color: { value: '0.8666666666666667 0.5725490196078431 0' },
            verticalVisualizer_wave_height: { value: 50 },
            verticalVisualizer_wave_showMirrorWave: { value: true },
            verticalVisualizer_wave_fill: { value: false },
            verticalVisualizer_wave_thickness: { value: 2 },
            verticalVisualizer_wave_smoothness: { value: 1 },
        } as DeepPartial<ProjectProperties>),

        _.merge({}, projectProperties, {
            background_color: { value: '0 0 0' },
            audioSamples_volumeGain: { value: 35 },
            audioSamples_scale: { value: 'Gaussian' },
            visualizer_type: { value: 'CircularWave' },
            visualizer_flip: { value: 'LeftChannel' },
            visualizer_color_responseType: { value: 'LabA' },
            visualizer_color_responseProvider: { value: 'ValueNormalized' },
            visualizer_color_responseValueGain: { value: 1.4 },
            visualizer_color_responseRange: { value: 50 },
            visualizer_color_responseDegree: { value: 0.8 },
            circularVisualizer_radius: { value: 18 },
            circularVisualizer_color: { value: '0.596078431372549 0.6313725490196078 0.45098039215686275' },
            circularVisualizer_wave_height: { value: 65 },
            circularVisualizer_wave_showMirrorWave: { value: true },
            circularVisualizer_wave_fill: { value: true },
            circularVisualizer_wave_smoothness: { value: 1 },
        } as DeepPartial<ProjectProperties>),

        _.merge({}, projectProperties, {
            background_color: { value: '0 0 0' },
            audioSamples_volumeGain: { value: 35 },
            audioSamples_scale: { value: 'Gaussian' },
            visualizer_type: { value: 'CircularBars' },
            visualizer_flip: { value: 'LeftChannel' },
            visualizer_color_responseType: { value: 'LabB' },
            visualizer_color_responseProvider: { value: 'Change' },
            visualizer_color_responseValueGain: { value: 3 },
            visualizer_color_responseRange: { value: 40 },
            visualizer_color_responseDegree: { value: 1.2 },
            circularVisualizer_radius: { value: 18 },
            circularVisualizer_color: { value: '0.3137254901960784 0.3215686274509804 0.6823529411764706' },
            circularVisualizer_bars_width: { value: 90 },
            circularVisualizer_bars_height: { value: 75 },
        } as DeepPartial<ProjectProperties>),

        _.merge({}, projectProperties, {
            background_color: { value: '0 0 0' },
            audioSamples_volumeGain: { value: 35 },
            audioSamples_scale: { value: 'Gaussian' },
            visualizer_type: { value: '3DBars' },
            visualizer_color_responseType: { value: 'Saturation' },
            visualizer_color_responseProvider: { value: 'ValueNormalized' },
            visualizer_color_responseValueGain: { value: 2 },
            visualizer_color_responseRange: { value: 50 },
            visualizer_color_responseDegree: { value: 0.5 },
            '3dVisualizer_color': { value: '0.4823529411764706 0.5803921568627451 0.5490196078431372' },
            '3dVisualizer_zoom': { value: 100 },
            '3dVisualizer_bars_width': { value: 85 },
            '3dVisualizer_bars_height': { value: 25 },
            '3dVisualizer_bars_phiX': { value: 123 },
            '3dVisualizer_bars_phiY': { value: 12 },
            '3dVisualizer_bars_y0': { value: 34 },
            '3dVisualizer_bars_deltaX': { value: 16 },
            '3dVisualizer_bars_deltaY': { value: 4 },
        } as DeepPartial<ProjectProperties>),
    ];

    const loop = (i: number) => {
        if (i >= presets.length) {
            if (projectProperties !== null) {
                window.wallpaperPropertyListener?.applyUserProperties?.(projectProperties);
            }
            return;
        }
        if (window.wallpaperPropertyListener === undefined) return;
        if (window.wallpaperPropertyListener.applyUserProperties === undefined) return;

        console.log('%c===| Preview %d', 'color: #350E23; font-weight:bold', i);
        window.wallpaperPropertyListener.applyUserProperties(presets[i]);
        setTimeout(() => loop(i + 1), ms);
    };
    loop(0);
}
