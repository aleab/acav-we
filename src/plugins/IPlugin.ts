import VisualizerRenderArgs from '../components/visualizers/VisualizerRenderArgs';
import VisualizerRenderReturnArgs from '../components/visualizers/VisualizerRenderReturnArgs';

export default interface IPlugin {
    processAudioData(args: VisualizerRenderArgs): Promise<void>;
    processVisualizerSamplesData(visualizerReturnArgs: VisualizerRenderReturnArgs): Promise<void>;
}
