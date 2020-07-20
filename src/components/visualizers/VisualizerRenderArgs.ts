import AudioSamplesArray from '../../common/AudioSamplesArray';
import CircularBuffer from '../../common/CircularBuffer';

export default interface VisualizerRenderArgs {
    readonly samples: AudioSamplesArray | undefined;
    readonly samplesBuffer: CircularBuffer<AudioSamplesArray> | undefined;
    readonly peak: number;
    readonly isSilent: boolean;
}
