import VisualizerRenderArgs from '../components/visualizers/VisualizerRenderArgs';
import VisualizerRenderReturnArgs from '../components/visualizers/VisualizerRenderReturnArgs';
import AudioSamplesArray from '../common/AudioSamplesArray';
import CircularBuffer from '../common/CircularBuffer';

export default interface IPlugin {
    processAudioData(args: VisualizerRenderArgs): Promise<void>;
    processVisualizerSamplesData(visualizerReturnArgs: VisualizerRenderReturnArgs, samplesBuffer: CircularBuffer<AudioSamplesArray> | undefined): Promise<void>;
}
