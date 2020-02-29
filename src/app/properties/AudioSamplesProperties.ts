import AudioSamplesScaleProperties from './AudioSamplesScaleProperties';

export default interface AudioSamplesProperties {
    correctSamples: boolean;
    audioVolumeGain: number;
    audioFreqThreshold: number;
    scale: AudioSamplesScaleProperties;
    normalize: boolean;
    bufferLength: number;
}
