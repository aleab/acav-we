import { VisualizerType } from '../VisualizerType';

export default interface VisualizerProperties {
    type: VisualizerType;
    flipFrequencies: boolean;
    smoothing: number;
}
