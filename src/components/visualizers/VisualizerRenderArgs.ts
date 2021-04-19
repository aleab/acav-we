import AudioSamplesArray from '../../common/AudioSamplesArray';

export default interface VisualizerRenderArgs {
    readonly samples: AudioSamplesArray | undefined;
    readonly samplesBuffer: AudioSamplesArray[] | undefined;
    readonly peak: number;
    readonly isSilent: boolean;
}
