import { FrequencyRange } from '../FrequencyRange';
import { TaskbarPosition } from '../TaskbarPosition';

export default interface TaskbarProperties {
    enabled: boolean;
    isSmall: boolean;
    scale: number;
    size: number;
    position: TaskbarPosition;
    frequencyRange: FrequencyRange;
    resolution: number;
    brightness: number;
}
