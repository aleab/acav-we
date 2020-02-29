import { createContext } from 'react';
import { DeepReadonly } from 'utility-types';

import Properties from './properties/Properties';

export interface WallpaperContextType {
    windowEvents: Readonly<WindowEvents>;
    wallpaperEvents: Readonly<WallpaperEvents>;
    wallpaperProperties: DeepReadonly<Properties>;
}
const WallpaperContext = createContext<WallpaperContextType | undefined>(undefined);

export default WallpaperContext;
