import React, { createContext } from 'react';

import { Logger } from '../../common/Log';

export interface SpotifyOverlayContextType {
    logger: Logger;
    overlayHtmlRef: React.MutableRefObject<HTMLDivElement | null>;
    backgroundHtmlRef: React.RefObject<HTMLElement>;
}
const SpotifyOverlayContext = createContext<SpotifyOverlayContextType | undefined>(undefined);

export default SpotifyOverlayContext;
