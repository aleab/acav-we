import { ForegroundMode } from '../BackgroundMode';

export default interface ForegroundProperties {
    enabled: boolean;
    mode: ForegroundMode;
    imagePath: string;
    css: string;
}
