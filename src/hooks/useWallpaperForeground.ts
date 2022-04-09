import _ from 'lodash';
import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';

import Log from '../common/Log';
import { parseLocalStorageStringValue } from '../common/util';
import { CssBackground, ForegroundMode, generateCssStyle } from '../app/BackgroundMode';
import Properties from '../app/properties/Properties';

const Logc = Log.getLogger('useWallpaperForeground', 'darkolivegreen');

interface UseWallpaperForegroundArgs {
    localStorageKeys: {
        currentImage: string;
    };
    options: MutableRefObject<Properties>;
}

export default function useWallpaperForeground(args: UseWallpaperForegroundArgs) {
    const O = args.options;

    const [ styleForeground, setStyleForeground ] = useState<CssBackground>({});
    const foregroundImagePath: MutableRefObject<string | null | undefined> = useRef(undefined);

    const setForegroundImage = useCallback((imagePath: string) => {
        if (!imagePath) {
            setStyleForeground({});
        } else if (imagePath !== foregroundImagePath.current) {
            foregroundImagePath.current = imagePath;
            window.localStorage.setItem(args.localStorageKeys.currentImage, JSON.stringify(imagePath));

            setStyleForeground(generateCssStyle(ForegroundMode.Image, { imagePath }));

            Logc.debug(`Foreground image set to "${imagePath}"`);
        }
    }, [args.localStorageKeys.currentImage]);

    const firstForegroundUpdate = useRef(true);
    const updateForeground = useCallback(() => {
        Logc.debug('Updating foreground...', { firstUpdate: firstForegroundUpdate.current, foreground: _.cloneDeep(O.current.foreground) });

        foregroundImagePath.current = null;
        window.localStorage.removeItem(args.localStorageKeys.currentImage);

        if (O.current.foreground.mode === ForegroundMode.Image) {
            setForegroundImage(O.current.foreground.imagePath);
        } else if (O.current.foreground.mode === ForegroundMode.Css) {
            setStyleForeground(generateCssStyle(ForegroundMode.Css, { css: O.current.foreground.css }));
        }

        firstForegroundUpdate.current = false;
    }, [ O, setForegroundImage, args.localStorageKeys.currentImage ]);

    // init foreground
    useEffect(() => {
        const currentImage = parseLocalStorageStringValue(args.localStorageKeys.currentImage);
        if (currentImage && currentImage.length > 0) {
            setForegroundImage(currentImage);
        }
    }, [ args.localStorageKeys.currentImage, setForegroundImage ]);

    return {
        styleForeground,
        updateForeground,
    };
}
