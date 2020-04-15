/* eslint-disable object-property-newline */
/* eslint-disable no-continue */

import _ from 'lodash';
import ColorConvert from 'color-convert';
import { LAB, RGB } from 'color-convert/conversions';
import React, { RefObject, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import {
    BACKGROUND_CLIP,
    BACKGROUND_ORIGIN,
    BackgroundParser,
    CacheStorage,
    Color,
    Gradient,
    ICSSImage,
    LengthPercentage,
    Logger,
    PropertyDescriptors,
    calculateBackgroundSize,
    isLinearGradient,
    isRadialGradient,
    isUrlImage,
} from 'html2canvas/background-parser';

import { FaSpotify } from '../fa';
import Log from '../common/Log';
import Bounds from '../common/Bounds';
import { CancellationToken, CancellationTokenSource } from '../common/CancellationToken';
import { colorEquals, lerp as colorLerp } from '../common/Colors';
import { cssColorToRgba, getComputedBackgroundProperties } from '../common/Css';

const SPOTIFY_LIGHT_GREEN = { hex: '#1ED760', rgb: [ 30, 215, 96 ] };
const SPOTIFY_WHITE = { hex: '#FFFFFF', rgb: [ 255, 255, 255 ] };
const SPOTIFY_BLACK = { hex: '#191414', rgb: [ 25, 20, 20 ] };

type ComputedBackgroundProperties = ReturnType<typeof getComputedBackgroundProperties>;
type DrawDimensions = {
    sx: number; sy: number; sw: number; sh: number; // source coordinates and size
    dx: number; dy: number; dw: number; dh: number; // destination coordinates and size
};

interface SpotifyOverlayIconProps {
    style?: any;
    overlayHtmlRef: RefObject<HTMLElement>;
    backgroundHtmlRef: RefObject<HTMLElement>;
}

// Lightness: https://en.wikipedia.org/wiki/Lightness#Lightness_and_human_perception
function isDark(rgb: RGB) {
    const lab: LAB = ColorConvert.rgb.lab(rgb);
    return lab[0] <= 45;
}

// =========================
//  RENDER CANVAS FUNCTIONS
// =========================

function setCanvasSize(canvas: OffscreenCanvas | HTMLCanvasElement, width: number, height: number) {
    canvas.height = height;
    canvas.width = width;
}

function renderToCanvas(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    backgroundImage: ICSSImage[],
    props: NonNullable<ComputedBackgroundProperties>,
    elementRect: DOMRect,
    border: { top: number, right: number, bottom: number, left: number },
    padding: { top: number, right: number, bottom: number, left: number },
    fontSize: number,
    ct: CancellationToken,
): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (ctx === null) return Promise.reject();

    if (props.backgroundColor !== PropertyDescriptors.backgroundColor.initialValue) {
        ctx.save();
        ctx.fillStyle = props.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    if (backgroundImage.length === 0) {
        return Promise.resolve();
    }

    const backgroundClip = BackgroundParser.parseBackgroundClip(props.backgroundClip);
    const backgroundOrigin = BackgroundParser.parseBackgroundOrigin(props.backgroundOrigin);
    const backgroundPosition = BackgroundParser.parseBackgroundPosition(props.backgroundPosition);
    const backgroundRepeat = BackgroundParser.parseBackgroundRepeat(props.backgroundRepeat);
    const backgroundSize = BackgroundParser.parseBackgroundSize(props.backgroundSize);

    //  Apply background-* properties
    // ===============================
    // background-origin
    function applyOrigin(i: number, containerRect: DOMRect, drawDimensions: DrawDimensions) {
        const origin = backgroundOrigin.length === 1 ? backgroundOrigin[0] : backgroundOrigin[i];

        let w = containerRect.width;
        let h = containerRect.height;

        if (origin !== undefined) {
            switch (origin) {
                case BACKGROUND_ORIGIN.BORDER_BOX: break;
                case BACKGROUND_ORIGIN.PADDING_BOX:
                    drawDimensions.dx += border.left;
                    drawDimensions.dy += border.top;
                    w -= border.left + border.right;
                    h -= border.top + border.bottom;
                    break;
                case BACKGROUND_ORIGIN.CONTENT_BOX:
                    drawDimensions.dx += border.left + padding.left;
                    drawDimensions.dy += border.top + padding.top;
                    w -= (border.left + padding.left) + (border.right + padding.right);
                    h -= (border.top + padding.top) + (border.bottom + padding.bottom);
                    break;
                default: break;
            }
        }

        return new Bounds(drawDimensions.dx, drawDimensions.dy, w, h);
    }
    // background-size
    function applySize(i: number, bounds: Bounds, imgWidth: number, imgHeight: number, drawDimensions: DrawDimensions) {
        const size = backgroundSize.length === 1 ? backgroundSize[0] : backgroundSize[i];
        if (size === undefined) return;

        const [ width, height ] = calculateBackgroundSize(backgroundSize[i], [ imgWidth, imgHeight, imgWidth / imgHeight ], bounds);
        drawDimensions.dw = width;
        drawDimensions.dh = height;
    }
    // background-position
    // https://developer.mozilla.org/en-US/docs/Web/CSS/background-position
    function applyPosition(i: number, containerWidth: number, containerHeight: number, imgWidth: number, imgHeight: number, drawDimensions: DrawDimensions) {
        const position = backgroundPosition.length === 1 ? backgroundPosition[0] : backgroundPosition[i];
        if (position === undefined) return;

        const [ xOffset, yOffset ] = LengthPercentage.getAbsoluteValueForTuple(backgroundPosition[i], containerWidth - imgWidth, containerHeight - imgHeight, fontSize);
        drawDimensions.dx += xOffset;
        drawDimensions.dy += yOffset;
    }

    function fixDimensions(containerRect: DOMRect, [ imgNaturalWidth, imgNaturalHeight ]: [number, number], drawDimensions: DrawDimensions) {
        if (drawDimensions.dx < containerRect.left) {
            const outOfBoundsSegmentWidth = containerRect.left - drawDimensions.dx;
            drawDimensions.sx = outOfBoundsSegmentWidth * (imgNaturalWidth / drawDimensions.dw);
            drawDimensions.sw = imgNaturalWidth - drawDimensions.sx;
            drawDimensions.dw -= outOfBoundsSegmentWidth;
            drawDimensions.dx = containerRect.left;
        } else if (drawDimensions.dx >= containerRect.right) {
            drawDimensions.sw = 0;
        }

        if (drawDimensions.dy < containerRect.top) {
            const outOFBoundsSegmentHeight = containerRect.top - drawDimensions.dy;
            drawDimensions.sy = outOFBoundsSegmentHeight * (imgNaturalHeight / drawDimensions.dh);
            drawDimensions.sh = imgNaturalHeight - drawDimensions.sy;
            drawDimensions.sw -= outOFBoundsSegmentHeight;
            drawDimensions.dy = containerRect.top;
        } else if (drawDimensions.dy >= containerRect.bottom) {
            drawDimensions.sh = 0;
        }
    }

    let i = 0;
    function nextOrResolve(resolve: () => void, reject: (reason?: any) => void, _loop: (resolve: () => void, reject: (reason?: any) => void) => void) {
        if (i < backgroundImage.length) {
            _loop(resolve, reject);
        } else {
            resolve();
        }
    }
    function loop(resolve: () => void, reject: (reason?: any) => void) {
        if (ct.isCancelled()) { reject(); return; }
        if (ctx === null) { reject(); return; }
        const j = i;
        i++;

        const image = backgroundImage[j];
        if (isUrlImage(image)) {
            const img = new Image();
            img.onload = () => {
                if (ct.isCancelled()) { reject(); return; }
                if (ctx === null) { reject(); return; }

                // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
                const drawDimensions: DrawDimensions = {
                    sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight,
                    dx: elementRect.left, dy: elementRect.top, dw: img.naturalWidth, dh: img.naturalHeight,
                };

                // origin -> size -> position -> repeat -> clip

                const bounds = applyOrigin(j, elementRect, drawDimensions);
                applySize(j, bounds, img.naturalWidth, img.naturalHeight, drawDimensions);
                applyPosition(j, elementRect.width, elementRect.height, img.naturalWidth, img.naturalHeight, drawDimensions);
                fixDimensions(elementRect, [ img.naturalWidth, img.naturalHeight ], drawDimensions);

                // TODO: background-repeat

                const clip = (backgroundClip.length === 1 ? backgroundClip[0] : backgroundClip[i]) ?? BACKGROUND_CLIP.BORDER_BOX;
                if (clip === BACKGROUND_CLIP.BORDER_BOX) {
                    if (ct.isCancelled()) { reject(); return; }
                    ctx.drawImage(
                        img,
                        drawDimensions.sx, drawDimensions.sy, drawDimensions.sw, drawDimensions.sh,
                        drawDimensions.dx, drawDimensions.dy, drawDimensions.dw, drawDimensions.dh,
                    );
                } else if (clip === BACKGROUND_CLIP.PADDING_BOX || clip === BACKGROUND_CLIP.CONTENT_BOX) {
                    // background-clip -- use temp canvas to clip this background layer only
                    const tempCanvas = new OffscreenCanvas(canvas.width, canvas.height);
                    const tempCtx = tempCanvas.getContext('2d');
                    if (tempCtx !== null) {
                        tempCtx.drawImage(
                            img,
                            drawDimensions.sx, drawDimensions.sy, drawDimensions.sw, drawDimensions.sh,
                            drawDimensions.dx, drawDimensions.dy, drawDimensions.dw, drawDimensions.dh,
                        );
                        if (clip === BACKGROUND_CLIP.PADDING_BOX) {
                            tempCtx.rect(
                                elementRect.left + border.left,
                                elementRect.top + border.top,
                                elementRect.width - border.left - border.right,
                                elementRect.height - border.top - border.bottom,
                            );
                        } else {
                            tempCtx.rect(
                                elementRect.left + border.left + padding.left,
                                elementRect.top + border.top + padding.top,
                                elementRect.width - (border.left + padding.left) - (border.right + padding.right),
                                elementRect.height - (border.top + padding.top) - (border.bottom + padding.bottom),
                            );
                        }
                        tempCtx.clip();

                        // Copy the clipped background over to the working canvas
                        if (ct.isCancelled()) { reject(); return; }
                        ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, canvas.width, canvas.height);
                    }
                }

                nextOrResolve(resolve, reject, loop);
            };
            img.onerror = () => {
                if (ct.isCancelled()) { reject(); return; }
                nextOrResolve(resolve, reject, loop);
            };
            img.src = image.url;
        } else if (isLinearGradient(image)) {
            const [ length, x0, x1, y0, y1 ] = Gradient.calculateGradientDirection(image.angle, elementRect.width, elementRect.height);
            const gradient = ctx.createLinearGradient(elementRect.left + x0, elementRect.top + y0, elementRect.left + x1, elementRect.top + y1);
            Gradient.processColorStops(image.stops, length).forEach(colorStop => {
                gradient.addColorStop(colorStop.stop, Color.asString(colorStop.color));
            });

            ctx.save();
            ctx.fillStyle = gradient;
            ctx.fillRect(elementRect.left, elementRect.top, elementRect.width, elementRect.height);
            ctx.restore();

            nextOrResolve(resolve, reject, loop);
        } else if (isRadialGradient(image)) {
            const position = image.position.length !== 0 ? image.position : [{
                type: 16,
                number: 50,
                flags: 1 << 2,
            }];
            const x = LengthPercentage.getAbsoluteValue(position[0], elementRect.width, fontSize);
            const y = LengthPercentage.getAbsoluteValue(position[position.length - 1], elementRect.height, fontSize);

            const [ rx, ry ] = Gradient.calculateRadius(image, x, y, elementRect.width, elementRect.height);
            if (rx > 0 && ry > 0) {
                const gradient = ctx.createRadialGradient(elementRect.left + x, elementRect.top + y, 0, elementRect.left + x, elementRect.top + y, rx);

                Gradient.processColorStops(image.stops, rx * 2).forEach(colorStop => {
                    gradient.addColorStop(colorStop.stop, Color.asString(colorStop.color));
                });

                ctx.save();
                ctx.fillStyle = gradient;
                ctx.rect(elementRect.left, elementRect.top, elementRect.width, elementRect.height);
                if (rx !== ry) {
                    // Elliptical radial gradient
                    const midX = elementRect.left + 0.5 * elementRect.width;
                    const midY = elementRect.top + 0.5 * elementRect.height;
                    const f = ry / rx;

                    ctx.translate(midX, midY);
                    ctx.transform(1, 0, 0, f, 0, 0);
                    ctx.translate(-midX, -midY);
                    ctx.fillRect(elementRect.left, (elementRect.top - midY) / f + midY, elementRect.width, elementRect.height / f);
                } else {
                    ctx.fill();
                }
                ctx.restore();
            }

            nextOrResolve(resolve, reject, loop);
        }
    }

    return new Promise((resolve, reject) => {
        if (ct.isCancelled()) {
            reject();
        } else {
            loop(resolve, reject);
        }
    });
}

function getComputedBorderPaddingAndFontSize(element: HTMLElement) {
    const {
        borderTop, borderRight, borderBottom, borderLeft,
        paddingTop, paddingRight, paddingBottom, paddingLeft,
        fontSize,
    } = getComputedStyle(element);
    const border = {
        top: Number(borderTop.slice(0, -2)),
        right: Number(borderRight.slice(0, -2)),
        bottom: Number(borderBottom.slice(0, -2)),
        left: Number(borderLeft.slice(0, -2)),
    };
    const padding = {
        top: Number(paddingTop.slice(0, -2)),
        right: Number(paddingRight.slice(0, -2)),
        bottom: Number(paddingBottom.slice(0, -2)),
        left: Number(paddingLeft.slice(0, -2)),
    };
    return { border, padding, fontSize: Number(fontSize.slice(0, -2)) };
}

// ===========
//  COMPONENT
// ===========

export default function SpotifyOverlayIcon(props: SpotifyOverlayIconProps) {
    // Spotify's Branding Guidelines: https://developer.spotify.com/branding-guidelines/
    const [ iconColor, setIconColor ] = useState(SPOTIFY_LIGHT_GREEN);
    const iconRef = useRef<HTMLElement>(null);

    const html2canvasCache = useRef<ReturnType<typeof CacheStorage.create>>();
    useEffect(() => {
        const instanceName = (Math.round(Math.random() * 1000) + Date.now()).toString(16);
        html2canvasCache.current = CacheStorage.create(instanceName, {
            allowTaint: false,
            imageTimeout: 15000,
            proxy: undefined,
            useCORS: false,
        });
        Logger.create({ id: instanceName, enabled: false });

        return () => {
            CacheStorage.destroy(instanceName);
            Logger.destroy(instanceName);
            html2canvasCache.current = undefined;
        };
    }, []);

    const computedBackgroundPropertiesReducer = useCallback((prevProps: ComputedBackgroundProperties, newProps: ComputedBackgroundProperties) => {
        if (prevProps !== null && newProps !== null && _.isMatch(prevProps, newProps)) return prevProps;
        return newProps;
    }, []);
    const [ overlayBackgroundProperties, setOverlayBackgroundProperties ] = useReducer(computedBackgroundPropertiesReducer, getComputedBackgroundProperties(props.overlayHtmlRef.current));
    const [ wallpaperBackgroundProperties, setWallpaperBackgroundProperties ] = useReducer(computedBackgroundPropertiesReducer, getComputedBackgroundProperties(props.backgroundHtmlRef.current));

    const decideIconColor = useCallback((rgb: RGB, isBackgroundImage: boolean = false) => {
        // Use green icon if the color is black'ish or white'ish
        const hsl = ColorConvert.rgb.hsl(rgb);
        if (!isBackgroundImage && ((hsl[2] <= 3 || colorEquals(rgb, SPOTIFY_BLACK.rgb)) || (hsl[2] > 95))) {
            setIconColor(SPOTIFY_LIGHT_GREEN);
        } else {
            setIconColor(isDark(rgb) ? SPOTIFY_WHITE : SPOTIFY_BLACK);
        }
    }, []);

    const offscreenCanvas = useMemo(() => new OffscreenCanvas(0, 0), []);
    const getAverageColorOfBackgrounds = useCallback(async (
        wallpaperBgProps: ComputedBackgroundProperties,
        overlayBgProps: ComputedBackgroundProperties,
        ct: CancellationToken,
    ): Promise<RGB> => {
        if (ct.isCancelled()) return Promise.reject();
        if (wallpaperBgProps === null || overlayBgProps === null) return Promise.reject();
        if (props.backgroundHtmlRef.current === null || props.overlayHtmlRef.current === null) return Promise.reject();
        if (iconRef.current === null) return Promise.reject();

        const ctx = offscreenCanvas.getContext('2d');
        if (ctx !== null) {
            const canvasRect = props.backgroundHtmlRef.current.getBoundingClientRect();
            setCanvasSize(offscreenCanvas, canvasRect.width, canvasRect.height);
            ctx.clearRect(0, 0, canvasRect.width, canvasRect.height);

            try {
                // Render the wallpaper
                const wallpaperBackgroundImage = BackgroundParser.parseBackgroundImage(wallpaperBgProps.backgroundImage);
                const { border: wBorder, padding: wPadding, fontSize: wFontSize } = getComputedBorderPaddingAndFontSize(props.backgroundHtmlRef.current);
                await renderToCanvas(offscreenCanvas, wallpaperBackgroundImage, wallpaperBgProps, canvasRect, wBorder, wPadding, wFontSize, ct);
                if (ct.isCancelled()) return Promise.reject();

                // Render the overlay
                const overlayBackgroundImage = BackgroundParser.parseBackgroundImage(overlayBgProps.backgroundImage);
                const { border: oBorder, padding: oPadding, fontSize: oFontSize } = getComputedBorderPaddingAndFontSize(props.overlayHtmlRef.current);
                await renderToCanvas(offscreenCanvas, overlayBackgroundImage, overlayBgProps, props.overlayHtmlRef.current.getBoundingClientRect(), oBorder, oPadding, oFontSize, ct);
                if (ct.isCancelled()) return Promise.reject();
            } catch (err) {
                Log.error(err);
                return Promise.reject();
            }

            const spotifyIconRect = iconRef.current.getBoundingClientRect();
            const { marginTop, marginRight, marginBottom, marginLeft } = getComputedStyle(iconRef.current);
            const margin = {
                top: Number(marginTop.slice(0, -2)),
                right: Number(marginRight.slice(0, -2)),
                bottom: Number(marginBottom.slice(0, -2)),
                left: Number(marginLeft.slice(0, -2)),
            };

            const imageData = ctx.getImageData(
                spotifyIconRect.left - margin.left,
                spotifyIconRect.top - margin.top,
                spotifyIconRect.width + margin.left + margin.right,
                spotifyIconRect.height + margin.top + margin.bottom,
            );
            const rgb: RGB = [ 0, 0, 0 ];
            for (let i = 0; i < imageData.width; ++i) {
                for (let j = 0; j < imageData.height; ++j) {
                    const ipx = j * (imageData.width * 4) + i * 4;
                    rgb[0] += imageData.data[ipx + 0];
                    rgb[1] += imageData.data[ipx + 1];
                    rgb[2] += imageData.data[ipx + 2];
                }
            }
            const npx = imageData.width * imageData.height;
            rgb[0] /= npx;
            rgb[1] /= npx;
            rgb[2] /= npx;

            return rgb;
        }

        return [ 0, 0, 0 ] as RGB;
    }, [ offscreenCanvas, props.backgroundHtmlRef, props.overlayHtmlRef ]);

    // Change the icon's color based on the background to respect Spotify's guidelines
    const cts = useRef(new CancellationTokenSource());
    useEffect(() => {
        /* 1) check if overlay has a solid background color
         *    2) check if it's semi-transparent
         *       3) check if the wallpaper has a solid background color
         *          4) blend overlay color with wallpaper color (and with black if wallpaper color is semi-transparent)
         *        4b) ELSE render on offscreen canvas and compute average color
         *     3b) ELSE use `overlayBackgroundProperties.backgroundColor`
         *  2b) ELSE render on offscreen canvas and compute average color
         */
        if (html2canvasCache.current === undefined) return;
        if (overlayBackgroundProperties === null || wallpaperBackgroundProperties === null) return;
        cts.current.cancel();
        cts.current = new CancellationTokenSource();

        // 1)
        // `background-image` has always higher priority than `background-color` in CSS
        if (overlayBackgroundProperties.backgroundImage.toLowerCase() === PropertyDescriptors.backgroundImage.initialValue) {
            // 2)
            const overlayBackgroundColor = cssColorToRgba(overlayBackgroundProperties.backgroundColor) ?? [ 0, 0, 0, 0 ];
            if (overlayBackgroundColor[3] < 1) {
                // 3)
                if (wallpaperBackgroundProperties.backgroundImage.toLowerCase() === PropertyDescriptors.backgroundImage.initialValue) {
                    // 4)
                    const wallpaperBackgroundColor = cssColorToRgba(wallpaperBackgroundProperties.backgroundColor) ?? [ 0, 0, 0, 0 ];
                    let rgb = wallpaperBackgroundColor.slice(0, 3) as RGB;
                    if (wallpaperBackgroundColor[3] < 1) {
                        rgb = colorLerp([ 0, 0, 0 ], rgb, wallpaperBackgroundColor[3]);
                    }
                    rgb = colorLerp(rgb, overlayBackgroundColor as unknown as RGB, overlayBackgroundColor[3]);
                    decideIconColor(rgb);
                } else {
                    // 4b)
                    CacheStorage.attachInstance(html2canvasCache.current);
                    getAverageColorOfBackgrounds(wallpaperBackgroundProperties, overlayBackgroundProperties, cts.current.token).then(rgb => {
                        decideIconColor(rgb);
                    }).catch(() => {}).finally(() => CacheStorage.detachInstance());
                }
            } else {
                // 3b)
                decideIconColor(overlayBackgroundColor as unknown as RGB);
            }
        } else {
            // 2b)
            CacheStorage.attachInstance(html2canvasCache.current);
            getAverageColorOfBackgrounds(wallpaperBackgroundProperties, overlayBackgroundProperties, cts.current.token).then(rgb => {
                decideIconColor(rgb);
            }).catch(() => {}).finally(() => CacheStorage.detachInstance());
        }
    }, [ html2canvasCache, decideIconColor, overlayBackgroundProperties, getAverageColorOfBackgrounds, wallpaperBackgroundProperties, offscreenCanvas ]);

    useEffect(() => {
        setOverlayBackgroundProperties(getComputedBackgroundProperties(props.overlayHtmlRef.current));
        setWallpaperBackgroundProperties(getComputedBackgroundProperties(props.backgroundHtmlRef.current));
    });

    return (
      <span className="spotify-icon" style={props.style} ref={iconRef}>
        <FaSpotify color={iconColor.hex} />
      </span>
    );
}
