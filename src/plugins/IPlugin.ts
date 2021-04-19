import VisualizerRenderArgs from '../components/visualizers/VisualizerRenderArgs';
import VisualizerRenderReturnArgs from '../components/visualizers/VisualizerRenderReturnArgs';
import AudioSamplesArray from '../common/AudioSamplesArray';

export default interface IPlugin {
    processAudioData(timestamp: number, args: VisualizerRenderArgs): Promise<void>;
    processVisualizerSamplesData(timestamp: number, visualizerReturnArgs: VisualizerRenderReturnArgs, samplesBuffer: AudioSamplesArray[] | undefined): Promise<void>;
}
