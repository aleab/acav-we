import VisualizerRenderArgs from '../components/visualizers/VisualizerRenderArgs';
import VisualizerRenderReturnArgs from '../components/visualizers/VisualizerRenderReturnArgs';
import AudioSamplesArray from '../common/AudioSamplesArray';

export default interface IPlugin {
    processAudioData(args: VisualizerRenderArgs): Promise<void>;
    processVisualizerSamplesData(visualizerReturnArgs: VisualizerRenderReturnArgs, samplesBuffer: AudioSamplesArray[] | undefined): Promise<void>;
}
