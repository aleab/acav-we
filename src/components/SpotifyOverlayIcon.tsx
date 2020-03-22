/* eslint-disable no-continue */

import _ from 'lodash';
import ColorConvert from 'color-convert';
import { LAB, RGB } from 'color-convert/conversions';
import html2canvas from 'html2canvas';
import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpotify } from '@fortawesome/free-brands-svg-icons';

import Log from '../common/Log';
import { CssBackground } from '../app/BackgroundMode';
import { cssColorToRgba } from '../common/Css';

const SPOTIFY_LIGHT_GREEN = { hex: '#1ED760', rgb: [ 30, 215, 96 ] };
const SPOTIFY_WHITE = { hex: '#FFFFFF', rgb: [ 255, 255, 255 ] };
const SPOTIFY_BLACK = { hex: '#191414', rgb: [ 25, 20, 20 ] };

interface SpotifyOverlayIconProps {
    style?: any;
    background?: CssBackground;
    backgroundBeneath?: CssBackground;
}

interface H2CAlphaState {
    iconRect?: { x: number, y: number, width: number, height: number };
    backgroundBeneathProperty?: { name: string, value: string };

    alpha: number;
    rgb: RGB;
    averageColor: RGB;
}
type H2CAlphaStateS = Omit<H2CAlphaState, 'alpha' | 'averageColor' | 'rgb'>;

// Lightness: https://en.wikipedia.org/wiki/Lightness#Lightness_and_human_perception
function isDark(rgb: RGB) {
    const lab: LAB = ColorConvert.rgb.lab(rgb);
    return lab[0] <= 45;
}

export default function SpotifyOverlayIcon(props: SpotifyOverlayIconProps) {
    // Spotify's Branding Guidelines: https://developer.spotify.com/branding-guidelines/
    const [ iconColor, setIconColor ] = useState(SPOTIFY_LIGHT_GREEN);
    const iconRef = useRef<HTMLElement>(null);

    const html2canvasTimeoutId = useRef(0);
    const stateWhenLastUsedHtml2CanvasDueToTransparentBackground = useRef<H2CAlphaState>({
        alpha: 0,
        rgb: [ 0, 0, 0 ],
        averageColor: [ 0, 0, 0 ],
    });
    const hasStateWhenLastUsedHtml2CanvasDueToTransparentBackgroundChanged = useCallback((newState: H2CAlphaStateS) => {
        const prev = stateWhenLastUsedHtml2CanvasDueToTransparentBackground.current;
        const current = newState;
        return prev.iconRect?.x === current.iconRect?.x && prev.iconRect?.y === current.iconRect?.y &&
               prev.iconRect?.width === current.iconRect?.width && prev.iconRect?.height === current.iconRect?.height &&
               prev.backgroundBeneathProperty?.name === current.backgroundBeneathProperty?.name &&
               prev.backgroundBeneathProperty?.value === current.backgroundBeneathProperty?.value;
    }, []);

    /**
     * Takes a "screenshot" of the whole document turning it into a canvas, and then decides which color to use
     * for the Spotify's icon based on the average color of the portion of screen where the icon would be placed.
     *
     * This solves all the cases where calculating the icon's background color manually would be a pita:
     * gradients, images, semi-transparent color on top of non-solid backgrounds.
     *
     * THIS METHOD SHOULD BE USED SPARINGLY SINCE IT'S BUGGY AND COULD HANG OR FREEZE THE WHOLE APP!
     *
     * @see https://developer.spotify.com/branding-guidelines/
     */
    const setIconColorUsingHtml2Canvas = useCallback((then?: (averageColor: RGB) => void) => {
        clearTimeout(html2canvasTimeoutId.current);
        html2canvasTimeoutId.current = setTimeout((() => {
            Log.warn('html2canvas');
            if (iconRef.current === null) {
                setIconColor(SPOTIFY_LIGHT_GREEN);
            } else {
                const rect = iconRef.current.getBoundingClientRect();
                html2canvas(document.body, {
                    logging: false,
                    backgroundColor: null,
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    ignoreElements: element => {
                        return element.tagName === 'CANVAS';
                    },
                    onclone: doc => {
                        // Make all text transparent
                        const treeWalker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null, false);
                        let n: Node | null;
                        while (n = treeWalker.nextNode()) {
                            if (n.parentElement) {
                                n.parentElement.style.color = 'transparent';
                            }
                        }
                    },
                }).then(canvas => {
                    html2canvasTimeoutId.current = 0;
                    if (window.acav.resetAudioListener !== undefined) {
                        // For some reason the registered audio listener gets removed once html2canvas is done
                        window.acav.resetAudioListener();
                    }

                    const ctx = canvas.getContext('2d');
                    if (ctx !== null) {
                        // Calculate average color
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const rgb: RGB = [ 0, 0, 0 ];
                        for (let i = 0; i < imageData.width; ++i) {
                            for (let j = 0; j < imageData.height; ++j) {
                                const ipx = j * (imageData.width * 4) + i * 4;
                                rgb.forEach((_v, _i, _a) => {
                                    _a[_i] += imageData.data[ipx + _i];
                                });
                            }
                        }

                        const npx = imageData.width * imageData.height;
                        rgb.forEach((_v, _i, _a) => { _a[_i] /= npx; });
                        setIconColor(isDark(rgb) ? SPOTIFY_WHITE : SPOTIFY_BLACK);
                        then?.(rgb);
                    } else {
                        setIconColor(SPOTIFY_LIGHT_GREEN);
                    }
                });
            }
        }) as TimerHandler, 100);
    }, []);

    const getLastBackgroundProperty = useCallback((cssBackground: CssBackground) => {
        let lastBackgroundProperty: { k: string, v: string } | undefined;
        const ownProps = Object.getOwnPropertyNames(cssBackground);
        for (let i = ownProps.length - 1; i >= 0; --i) {
            const backgroundPropName = ownProps[i];
            const backgroundPropValue: string = (cssBackground as any)[backgroundPropName];
            if (backgroundPropValue === undefined) continue;
            if (backgroundPropName === 'backgroundColor' || backgroundPropName === 'backgroundImage' || backgroundPropName === 'background') {
                lastBackgroundProperty = { k: backgroundPropName, v: backgroundPropValue };
                break;
            }
        }
        return lastBackgroundProperty;
    }, []);

    // Change the icon's color based on the background to respect Spotify's guidelines
    useEffect(() => {
        if (!props.background) return;

        const lastBackgroundProperty = getLastBackgroundProperty(props.background);
        if (!lastBackgroundProperty) {
            setIconColor(SPOTIFY_LIGHT_GREEN);
            return;
        }

        switch (lastBackgroundProperty.k) {
            case 'backgroundColor': {
                // NOTE: Use html2canvas SPARINGLY here because when the color changes too fast html2canvas tends to hang and then freeze the whole app!

                const rgba = cssColorToRgba(lastBackgroundProperty.v);
                if (rgba === undefined) break;

                const rgb = rgba.slice(0, 3) as RGB;

                if (rgba[3] < 1) {
                    // Semi-transparent; if the background beneath this overlay is a solid color then lerp
                    const bbRgb: RGB = [ 0, 0, 0 ];
                    const bbLastBackgroundProperty = props.backgroundBeneath !== undefined ? getLastBackgroundProperty(props.backgroundBeneath) : undefined;
                    if (bbLastBackgroundProperty !== undefined) {
                        if (bbLastBackgroundProperty.k === 'backgroundColor') {
                            // Solid background
                            const _bbRgba = cssColorToRgba(bbLastBackgroundProperty.v);
                            if (_bbRgba !== undefined) {
                                bbRgb[0] = _bbRgba[0];
                                bbRgb[1] = _bbRgba[1];
                                bbRgb[2] = _bbRgba[2];
                            }
                        } else {
                            // Non-solid-color background: check if it's actually necessary to use html2canvas
                            // e.g. if only the RGB values of the overlay's background changed then it's not necessary to use html2canvas
                            //      if we store the average color we calculated previously.
                            const h2cAlphaState: H2CAlphaStateS = {
                                iconRect: iconRef.current?.getBoundingClientRect(),
                                backgroundBeneathProperty: { name: bbLastBackgroundProperty.k, value: bbLastBackgroundProperty.v },
                            };

                            if (hasStateWhenLastUsedHtml2CanvasDueToTransparentBackgroundChanged(h2cAlphaState)) {
                                // Use html2canvas only if one of the following changes:
                                // - the overlay position
                                // - the background beneath
                                setIconColorUsingHtml2Canvas(averageColor => {
                                    stateWhenLastUsedHtml2CanvasDueToTransparentBackground.current = {
                                        ...h2cAlphaState,
                                        alpha: rgba[3],
                                        rgb: rgb.slice() as RGB,
                                        averageColor: averageColor.slice() as RGB,
                                    };
                                });
                                break;
                            } else {
                                // PrevAverageColor = (1 - alpha) * PrevAverageColorBB + alpha * PrevRGB
                                const prev = stateWhenLastUsedHtml2CanvasDueToTransparentBackground.current;
                                const prevAverageColorBB = [
                                    Math.round((prev.averageColor[0] - prev.alpha * prev.rgb[0]) / (1 - prev.alpha)),
                                    Math.round((prev.averageColor[1] - prev.alpha * prev.rgb[1]) / (1 - prev.alpha)),
                                    Math.round((prev.averageColor[2] - prev.alpha * prev.rgb[2]) / (1 - prev.alpha)),
                                ];

                                bbRgb[0] = prevAverageColorBB[0];
                                bbRgb[1] = prevAverageColorBB[1];
                                bbRgb[2] = prevAverageColorBB[2];
                            }
                        }
                    }

                    rgb[0] = Math.round(Math.lerp(bbRgb[0], rgb[0], rgba[3]));
                    rgb[1] = Math.round(Math.lerp(bbRgb[1], rgb[1], rgba[3]));
                    rgb[2] = Math.round(Math.lerp(bbRgb[2], rgb[2], rgba[3]));
                }

                // Use green icon if the color is black or white
                const hsl = ColorConvert.rgb.hsl(rgb);
                if ((hsl[2] <= 3 || _.every(rgb, (v, i) => v === SPOTIFY_BLACK.rgb[i])) || (hsl[2] > 95)) {
                    setIconColor(SPOTIFY_LIGHT_GREEN);
                } else {
                    setIconColor(isDark(rgb) ? SPOTIFY_WHITE : SPOTIFY_BLACK);
                }

                break;
            }

            case 'background':
            case 'backgroundImage':
                setIconColorUsingHtml2Canvas();
                break;

            default: break;
        }
    }, [ getLastBackgroundProperty, hasStateWhenLastUsedHtml2CanvasDueToTransparentBackgroundChanged, props.background, props.backgroundBeneath, setIconColorUsingHtml2Canvas ]);

    return (
      <span className="spotify-icon" style={props.style} ref={iconRef} data-html2canvas-ignore>
        <FontAwesomeIcon icon={faSpotify} color={iconColor.hex} />
      </span>
    );
}
