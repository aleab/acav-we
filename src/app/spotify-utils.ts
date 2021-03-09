/* eslint-disable object-property-newline */
/* eslint-disable no-continue */

import _ from 'lodash';
import ColorConvert from 'color-convert';
import { RGB } from 'color-convert/conversions';

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

import Log from '../common/Log';
import Bounds from '../common/Bounds';
import { CancellationToken, CancellationTokenSource } from '../common/CancellationToken';
import { colorEquals, lerp as colorLerp, isDark } from '../common/Colors';
import { cssColorToRgba, getComputedBackgroundProperties } from '../common/Css';
import Stack from '../common/Stack';

type Cache = ReturnType<typeof CacheStorage.create>;
type ComputedBackgroundProperties = ReturnType<typeof getComputedBackgroundProperties>;
type DrawDimensions = {
    sx: number; sy: number; sw: number; sh: number; // source coordinates and size
    dx: number; dy: number; dw: number; dh: number; // destination coordinates and size
};

const SPOTIFY_LIGHT_GREEN = { hex: '#1ED760', rgb: [ 30, 215, 96 ] as RGB };
const SPOTIFY_WHITE = { hex: '#FFFFFF', rgb: [ 255, 255, 255 ] as RGB };
const SPOTIFY_BLACK = { hex: '#191414', rgb: [ 25, 20, 20 ] as RGB };

const OFFSCREEN_CANVAS = new OffscreenCanvas(0, 0);

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

// ===========================
//  PRIVATE UTILITY FUNCTIONS
// ===========================

function _chooseColor(backgroundRgb: RGB, isBackgroundImage: boolean = false) {
    const hsl = ColorConvert.rgb.hsl(backgroundRgb);
    if (!isBackgroundImage && ((hsl[2] <= 3 || colorEquals(backgroundRgb, SPOTIFY_BLACK.rgb)) || (hsl[2] > 95))) {
        return SPOTIFY_LIGHT_GREEN;
    }
    return isDark(backgroundRgb) ? SPOTIFY_WHITE : SPOTIFY_BLACK;
}

function _calcBoundingRect(backgroundRefs: React.RefObject<HTMLElement>[]) {
    let minLeft = Number.POSITIVE_INFINITY;
    let minTop = Number.POSITIVE_INFINITY;
    let maxRight = Number.NEGATIVE_INFINITY;
    let maxBottom = Number.NEGATIVE_INFINITY;

    backgroundRefs.forEach(ref => {
        if (ref.current !== null) {
            const rect = ref.current.getBoundingClientRect();
            if (rect.left < minLeft) minLeft = rect.left;
            if (rect.top < minTop) minTop = rect.top;
            if (rect.right > maxRight) maxRight = rect.right;
            if (rect.bottom > maxBottom) maxBottom = rect.bottom;
        }
    });

    return new DOMRect(minLeft, minTop, maxRight - minLeft, maxBottom - minTop);
}

async function _getAverageColorOfBackgrounds(
    backgroundRefs: React.RefObject<HTMLElement>[],
    backgroundProps: ComputedBackgroundProperties[],
    selfRef: React.RefObject<HTMLElement>,
    ct: CancellationToken,
): Promise<RGB> {
    if (ct.isCancelled()) return Promise.reject();
    if (backgroundProps.length !== backgroundRefs.length) return Promise.reject();
    if (_.some(backgroundProps, p => p === null)) return Promise.reject();
    if (_.some(backgroundRefs, r => r.current === null)) return Promise.reject();
    if (selfRef.current === null) return Promise.reject();

    if (backgroundRefs.length === 0) return [ 0, 0, 0 ] as RGB;

    const ctx = OFFSCREEN_CANVAS.getContext('2d');
    if (ctx !== null) {
        // const canvasRect = backgroundHtmlRef.current.getBoundingClientRect();
        const canvasRect = _calcBoundingRect(backgroundRefs);
        setCanvasSize(OFFSCREEN_CANVAS, canvasRect.width, canvasRect.height);
        ctx.clearRect(0, 0, canvasRect.width, canvasRect.height);

        try {
            for (let i = 0; i < backgroundRefs.length; ++i) {
                const backgroundImage = BackgroundParser.parseBackgroundImage(backgroundProps[i]!.backgroundImage);
                const { border: wBorder, padding: wPadding, fontSize: wFontSize } = getComputedBorderPaddingAndFontSize(backgroundRefs[i].current!);
                // eslint-disable-next-line no-await-in-loop
                await renderToCanvas(OFFSCREEN_CANVAS, backgroundImage, backgroundProps[i]!, canvasRect, wBorder, wPadding, wFontSize, ct);
                if (ct.isCancelled()) return Promise.reject();
            }
        } catch (err) {
            Log.error(err);
            return Promise.reject();
        }

        const selfRect = selfRef.current.getBoundingClientRect();
        const { marginTop, marginRight, marginBottom, marginLeft } = getComputedStyle(selfRef.current);
        const margin = {
            top: Number(marginTop.slice(0, -2)),
            right: Number(marginRight.slice(0, -2)),
            bottom: Number(marginBottom.slice(0, -2)),
            left: Number(marginLeft.slice(0, -2)),
        };

        const imageData = ctx.getImageData(
            selfRect.left - margin.left,
            selfRect.top - margin.top,
            selfRect.width + margin.left + margin.right,
            selfRect.height + margin.top + margin.bottom,
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
}

function _lerpColorStack(colorsStack: Stack<RGBA>): RGB {
    // The last item of the stack is the foremost background
    if (!colorsStack || colorsStack.isEmpty()) return [ 0, 0, 0 ];

    const firstColor = colorsStack.pop();
    if (firstColor === undefined) return [ 0, 0, 0 ];
    if (firstColor[3] < 1) Log.getLogger('_lerpColorStack', 'black').warn('First color of stack is transparent');

    let currentColor = firstColor.slice(0, 3) as RGB;
    let color: RGBA | undefined;
    while ((color = colorsStack.pop()) !== undefined) {
        currentColor = colorLerp(currentColor, color as unknown as RGB, color[3]);
    }
    return currentColor;
}

/** Recursively add colors to the lerp stack from front to back. */
function _lerpBackgroundColors(
    i: number,
    colorsStack: Stack<RGBA>,
    /** Back to front. */ backgroundProps: ComputedBackgroundProperties[],
): RGB {
    if (i < 0) {
        colorsStack.push([ 0, 0, 0, 1 ]);
    } else {
        const backgroundColor = cssColorToRgba(backgroundProps[i]!.backgroundColor) ?? [ 0, 0, 0, 0 ];

        //// Is the color semi-transparent?
        if (backgroundColor[3] < 1) {
            //// [IT IS] Add color to the stack and recurse to the next one
            colorsStack.push(backgroundColor);
            return _lerpBackgroundColors(i - 1, colorsStack, backgroundProps);
        }

        //// [IT IS NOT] Add color to the stack and stop
        colorsStack.push(backgroundColor);
    }

    return _lerpColorStack(colorsStack);
}

// ====================
//  EXPORTED FUNCTIONS
// ====================

function createHtml2canvasCache(id: string): [ Cache, () => void, ] {
    const cacheId = `${id}-${(Math.round(Math.random() * 1000) + Date.now()).toString(16)}`;
    const cache = CacheStorage.create(cacheId, {
        allowTaint: false,
        imageTimeout: 15000,
        proxy: undefined,
        useCORS: false,
    });
    Logger.create({ id: cacheId, enabled: true });

    return [
        cache,
        () => {
            CacheStorage.destroy(cacheId);
            Logger.destroy(cacheId);
        },
    ];
}

function chooseAppropriateSpotifyColor(
    html2canvasCache: React.MutableRefObject<Cache | undefined>,
    /** Back to front. */ backgroundRefs: React.RefObject<HTMLElement>[],
    /** Back to front. */ backgroundProps: ComputedBackgroundProperties[],
    selfRef: React.RefObject<HTMLElement>,
    cts: React.MutableRefObject<CancellationTokenSource>,
    callback: (color: { hex: string, rgb: RGB }) => void,
) {
    if (html2canvasCache.current === undefined) return;
    if (backgroundProps.length !== backgroundRefs.length) return;
    if (_.some(backgroundProps, p => p === null)) return;
    if (_.some(backgroundRefs, r => r.current === null)) return;

    cts.current.cancel();
    cts.current = new CancellationTokenSource();

    // If there's a single background that is not a simple background-color,
    // then render everything on the offscreen canvas and compute the average color.
    if (_.some(backgroundProps, p => p?.backgroundImage.toLowerCase() !== PropertyDescriptors.backgroundImage.initialValue)) {
        CacheStorage.attachInstance(html2canvasCache.current);
        _getAverageColorOfBackgrounds(backgroundRefs, backgroundProps, selfRef, cts.current.token).then(rgb => {
            callback(_chooseColor(rgb));
        }).catch(() => {}).finally(() => CacheStorage.detachInstance());
    } else {
        const rgb = _lerpBackgroundColors(backgroundProps.length - 1, new Stack<RGBA>(), backgroundProps);
        callback(_chooseColor(rgb));
    }
}

export default {
    SPOTIFY_LIGHT_GREEN, SPOTIFY_WHITE, SPOTIFY_BLACK,
    createHtml2canvasCache,
    chooseAppropriateSpotifyColor,
};
