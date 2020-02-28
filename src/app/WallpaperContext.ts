import { createContext } from 'react';
import { DeepReadonly } from 'utility-types';

import WallpaperProperties from './properties';

export interface WallpaperContextType {
    windowEvents: Readonly<WindowEvents>;
    wallpaperEvents: Readonly<WallpaperEvents>;
    wallpaperProperties: DeepReadonly<WallpaperProperties>;
}
const WallpaperContext = createContext<WallpaperContextType | undefined>(undefined);

export default WallpaperContext;
