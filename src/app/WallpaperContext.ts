import { createContext } from 'react';

import PluginManager from '../plugins/PluginManager';
import Properties from './properties/Properties';
import Renderer from './Renderer';

export interface WallpaperContextType {
    windowEvents: Readonly<WindowEvents>;
    wallpaperEvents: Readonly<WallpaperEvents>;
    wallpaperProperties: DeepReadonly<Properties>;
    renderer: ReturnType<typeof Renderer>;
    pluginManager: PluginManager;
}
const WallpaperContext = createContext<WallpaperContextType | undefined>(undefined);

export default WallpaperContext;
