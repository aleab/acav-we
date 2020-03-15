import _ from 'lodash';
import { MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';

import Log from '../common/Log';
import { BackgroundMode, CssBackground, generateCssStyle } from '../app/BackgroundMode';
import Properties from '../app/properties/Properties';

const Logc = Log.getLogger('useWallpaperBackground', 'darkolivegreen');

interface UseWallpaperBackgroundArgs {
    localStorageKeys: {
        currentImage: string;
        playlistTimer: string;
    };
    options: MutableRefObject<Properties>;
}

export default function useWallpaperBackground(args: UseWallpaperBackgroundArgs) {
    const O = args.options;

    const [ styleBackground, setStyleBackground ] = useState<CssBackground>({});
    const backgroundImagePath: MutableRefObject<string | null | undefined> = useRef(undefined);
    const backgroundPlaylistTimer = useRef(0);

    const scheduleBackgroundImageChange = useCallback((fn: () => void, ms: number) => {
        clearTimeout(backgroundPlaylistTimer.current);
        backgroundPlaylistTimer.current = setTimeout((() => fn()) as TimerHandler, ms);
        Logc.debug(`Scheduled background image change in ${ms / 1000}s.`);
    }, []);

    const setBackgroundImage = useCallback((imagePath: string) => {
        if (!imagePath) {
            setStyleBackground({});
        } else if (imagePath !== backgroundImagePath.current) {
            backgroundImagePath.current = imagePath;
            window.localStorage.setItem(args.localStorageKeys.currentImage, imagePath);

            setStyleBackground(generateCssStyle(BackgroundMode.Image, { imagePath }));

            Logc.debug(`Background image set to "${imagePath}"`);
        }
    }, [args.localStorageKeys.currentImage]);

    const applyNewRandomImageRequestId = useRef('');
    const applyNewRandomImage = useCallback((maxTries: number = 3) => {
        applyNewRandomImageRequestId.current = (Math.random() * 10 ** 8).toFixed(0);

        const _dir = O.current.background.playlistDirectory;
        if (_dir && _dir.length > 0) {
            const _id = applyNewRandomImageRequestId.current;
            window.wallpaperRequestRandomFileForProperty('background_playlist', (_p, filePath) => {
                Logc.debug('Got new image from wallpaperRequestRandomFileForProperty:', `"${filePath}"`);

                // Depending on the size of the selected directory and its subdirectories, wallpaperRequestRandomFileForProperty may
                // take a while get a file and execute this callback, so we need to check if the user still needs this random file
                const tooSlow = O.current.background.mode !== BackgroundMode.Playlist
                            || O.current.background.playlistDirectory !== _dir
                            || _id !== applyNewRandomImageRequestId.current;
                if (tooSlow) return;
                if ((!filePath || filePath === backgroundImagePath.current) && maxTries > 0) {
                    // Same image or no image at all (?!), retry
                    applyNewRandomImage(maxTries - 1);
                } else {
                    setBackgroundImage(filePath);
                    window.localStorage.setItem(args.localStorageKeys.playlistTimer, Date.now().toString());
                    scheduleBackgroundImageChange(applyNewRandomImage, O.current.background.playlistTimerMinutes * 60 * 1000);
                }
            });
        }
    }, [ O, args.localStorageKeys.playlistTimer, scheduleBackgroundImageChange, setBackgroundImage ]);

    const firstBackgroundUpdate = useRef(true);
    const updateBackground = useCallback(() => {
        Logc.debug('Updating background...', { firstUpdate: firstBackgroundUpdate.current, background: _.cloneDeep(O.current.background) });

        function clearPlaylistState() {
            backgroundImagePath.current = null;
            window.localStorage.removeItem(args.localStorageKeys.currentImage);
            window.localStorage.removeItem(args.localStorageKeys.playlistTimer);
            clearTimeout(backgroundPlaylistTimer.current);
        }

        if (O.current.background.mode === BackgroundMode.Playlist) {
            // If the wallpaper app just started and the local storage has a LOCALSTORAGE_BG_PLAYLIST_TIMER set
            // from a previous execution, then use that to determine when we need to request a new wallpaper.
            const prevChangeTime = window.localStorage.getItem(args.localStorageKeys.playlistTimer);
            if (prevChangeTime && firstBackgroundUpdate.current) {
                const timeElapsed = Date.now() - Number(prevChangeTime);
                if (timeElapsed >= O.current.background.playlistTimerMinutes * 60 * 1000) {
                    applyNewRandomImage();
                } else {
                    const timeRemaining = O.current.background.playlistTimerMinutes * 60 * 1000 - timeElapsed;
                    scheduleBackgroundImageChange(applyNewRandomImage, timeRemaining);
                }
            } else if (O.current.background.playlistDirectory) {
                applyNewRandomImage();
            } else {
                clearPlaylistState();
                setStyleBackground({});
            }
        } else {
            clearPlaylistState();

            if (O.current.background.mode === BackgroundMode.Color) {
                const color = O.current.background.color ?? [ 0, 0, 0 ];
                setStyleBackground(generateCssStyle(BackgroundMode.Color, { color }));
            } else if (O.current.background.mode === BackgroundMode.Image) {
                setBackgroundImage(O.current.background.imagePath);
            } else if (O.current.background.mode === BackgroundMode.Css) {
                setStyleBackground(generateCssStyle(BackgroundMode.Css, { css: O.current.background.css }));
            }
        }

        firstBackgroundUpdate.current = false;
    }, [ O, applyNewRandomImage, args.localStorageKeys.currentImage, args.localStorageKeys.playlistTimer, scheduleBackgroundImageChange, setBackgroundImage ]);

    // init background
    useEffect(() => {
        const currentImage = window.localStorage.getItem(args.localStorageKeys.currentImage);
        if (currentImage && currentImage.length > 0) {
            setBackgroundImage(currentImage);
        }
    }, [ args.localStorageKeys.currentImage, setBackgroundImage ]);

    const _scheduleBackgroundImageChange = useCallback((ms: number) => scheduleBackgroundImageChange(applyNewRandomImage, ms), [ scheduleBackgroundImageChange, applyNewRandomImage ]);

    return {
        styleBackground,
        updateBackground,
        scheduleBackgroundImageChange: _scheduleBackgroundImageChange,
    };
}
