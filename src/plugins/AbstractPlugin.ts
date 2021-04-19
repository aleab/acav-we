import VisualizerRenderArgs from '../components/visualizers/VisualizerRenderArgs';
import VisualizerRenderReturnArgs from '../components/visualizers/VisualizerRenderReturnArgs';

import AudioSamplesArray from '../common/AudioSamplesArray';
import IPlugin from './IPlugin';
import { PluginArgs, PluginName } from './PluginManager';

export default abstract class AbstractPlugin<T extends PluginName> implements IPlugin {
    protected readonly args: PluginArgs<T>;

    private readonly minFrameTime: number;
    private prevTimestamp: number = -1;

    protected constructor(args: PluginArgs<T>) {
        this.args = args;
        this.minFrameTime = args.fpsLimit !== undefined && args.fpsLimit > 0 ? 1000 / args.fpsLimit : -1;
    }

    protected limitFps(timestamp: number): boolean {
        if (this.minFrameTime <= 0) return false;

        const frameTime = timestamp - this.prevTimestamp;
        if (frameTime >= this.minFrameTime) {
            this.prevTimestamp = timestamp;
            return false;
        }
        return true;
    }

    abstract processAudioData(timestamp: number, args: VisualizerRenderArgs): Promise<void>;
    abstract processVisualizerSamplesData(timestamp: number, visualizerReturnArgs: VisualizerRenderReturnArgs, samplesBuffer: AudioSamplesArray[] | undefined): Promise<void>;
}
