import AudioSamplesScaleProperties from './AudioSamplesScaleProperties';

export default interface AudioSamplesProperties {
    correctSamples: boolean;
    audioVolumeGain: number;
    audioFreqThreshold: number;
    scale: AudioSamplesScaleProperties;
    normalize: boolean;
    temporalSmoothingFactor: number;
    spatialSmoothingFactor: number;
    syncDelayMs: number;
}
