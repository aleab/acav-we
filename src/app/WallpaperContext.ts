import { createContext } from 'react';

import PluginManager from '../plugins/PluginManager';
import Properties from './properties/Properties';
import { IReadonlyAudioHistory } from './AudioHistory';
import Renderer from './Renderer';

export interface WallpaperContextType {
    windowEvents: Readonly<WindowEvents>;
    wallpaperEvents: Readonly<WallpaperEvents>;
    wallpaperProperties: DeepReadonly<Properties>;
    renderer: ReturnType<typeof Renderer>;
    audioHistory: IReadonlyAudioHistory;
    pluginManager: PluginManager;
}
const WallpaperContext = createContext<WallpaperContextType | undefined>(undefined);

export default WallpaperContext;
