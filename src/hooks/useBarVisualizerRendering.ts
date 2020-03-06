import { RefObject, useCallback, useContext, useRef } from 'react';
import { RGB } from 'color-convert/conversions';

import Log from '../common/Log';
import AudioSamplesArray from '../common/AudioSamplesArray';
import AudioSamplesBuffer from '../common/AudioSamplesBuffer';
import { AudioResponsiveValueProviderFactory } from '../app/AudioResponsiveValueProvider';
import { ColorReactionFactory, ColorReactionType } from '../app/ColorReactionType';
import WallpaperContext from '../app/WallpaperContext';

interface RenderArgs {
    readonly samples: AudioSamplesArray | undefined;
    readonly samplesBuffer: AudioSamplesBuffer | undefined;
    readonly peak: number;
}

/**
 * @param x x coordinate of the top-left corner of the bar.
 * @param y y coordinate of the top-left corner of the bar.
 */
function renderBar(canvasContext: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, borderRadius: number) {
    const radius = borderRadius > width / 2 ? width / 2 : borderRadius;
    if (height > 1 && radius > 0) {
        canvasContext.beginPath();
        if (height > 2 * radius) {
            canvasContext.rect(x, y + radius, width, height - 2 * radius);
            canvasContext.arc(x + radius, y + radius, radius, -Math.PI, -Math.PI_2);          // top-left
            canvasContext.arc(x + width - radius, y + radius, radius, -Math.PI_2, 0);         // top-right
            canvasContext.arc(x + width - radius, y + height - radius, radius, 0, Math.PI_2); // bottom-right
            canvasContext.arc(x + radius, y + height - radius, radius, Math.PI_2, Math.PI);   // bottom-left
            if (radius < width / 2) {
                canvasContext.rect(x + radius, y, width - 2 * radius, radius);
                canvasContext.rect(x + radius, y + height - radius, width - 2 * radius, radius);
            }
        } else {
            canvasContext.ellipse(x + radius, y + height / 2, radius, height / 2, 0, Math.PI_2, 3 * Math.PI_2);      // left
            canvasContext.ellipse(x + width - radius, y + height / 2, radius, height / 2, 0, -Math.PI_2, Math.PI_2); // right
        }
        canvasContext.fill();
    } else {
        canvasContext.fillRect(x, y, width, height);
    }
}

export default function useBarVisualizerRendering(canvas: RefObject<HTMLCanvasElement>) {
    const context = useContext(WallpaperContext)!;
    const O = useRef(context.wallpaperProperties.barVisualizer);

    return useCallback((args: RenderArgs) => {
        const canvasContext = canvas.current?.getContext('2d');
        if (!canvasContext) return;

        canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
        if (!context.wallpaperProperties.audioprocessing) {
            args.samples?.clear();
        } else if (args.samples) {
            const N_BARS = args.samples.length * 2;

            // Snapshot current properties, to render all bars consistently with the same settings
            const width = canvasContext.canvas.width * (O.current.width / 100);
            const flipFrequencies = O.current.flipFrequencies;
            const alignment = O.current.bars.alignment;
            const position = canvasContext.canvas.height * (O.current.position / 100);
            const barWidth = (width / N_BARS) * (O.current.bars.width / 100);
            const barHeight = Math.min(
                (2 / (1 - alignment)) * position,                                   // (1-a)/2: section of the bar below the pivot point
                (2 / (1 + alignment)) * (canvasContext.canvas.height - position),   // (1+a)/2: section of the bar above the pivot point
            ) * (O.current.bars.height / 100);
            const barBorderRadius = (barWidth / 2) * (O.current.bars.borderRadius / 100);

            const barColorRgb: Readonly<RGB> = [ O.current.bars.color[0], O.current.bars.color[1], O.current.bars.color[2] ];
            const barColorReaction = O.current.bars.responseType !== ColorReactionType.None
                ? ColorReactionFactory.buildColorReaction(O.current.bars.responseType, {
                    fromRgb: barColorRgb,
                    toRgb: [ O.current.bars.responseToHue[0], O.current.bars.responseToHue[1], O.current.bars.responseToHue[2] ],
                    degree: O.current.bars.responseDegree,
                    range: O.current.bars.responseRange,
                }) : undefined;
            const barColorReactionValueProvider = AudioResponsiveValueProviderFactory.buildAudioResponsiveValueProvider(O.current.bars.responseProvider, O.current.bars.responseValueGain);

            const spacing = (width - N_BARS * barWidth) / (N_BARS - 1);

            if (barColorReaction === undefined) {
                canvasContext.setFillColorRgb(barColorRgb as RGB);
            }
            args.samples.forEach((sample, i) => {
                if (sample[0] === 0 && sample[1] === 0) return;
                if (sample[0] > args.peak || sample[1] > args.peak) {
                    Log.warn('A sample is > the current peak!', { sample, peak: args.peak });
                } else if (sample[0] > 1 || sample[1] > 1) {
                    Log.warn('A sample is > 1!', sample);
                }

                // y = H - p - h∙(1+a)/2
                const y = [
                    canvasContext.canvas.height - position - 0.5 * (1 + alignment) * (sample[0] * barHeight),
                    canvasContext.canvas.height - position - 0.5 * (1 + alignment) * (sample[1] * barHeight),
                ];

                const index = flipFrequencies ? (args.samples!.length - 1 - i) : i;
                const dx = spacing / 2 + index * (barWidth + spacing);

                const fillColor = [barColorRgb];
                if (barColorReaction !== undefined) {
                    const value = barColorReactionValueProvider([ sample[0], sample[1] ], i, { samplesBuffer: args.samplesBuffer, peak: args.peak });
                    fillColor[0] = barColorReaction(value[0]);
                    fillColor[1] = barColorReaction(value[1]);
                }

                canvasContext.save();
                if (sample[0] !== 0) {
                    canvasContext.setFillColorRgb(fillColor[0] as RGB);
                    renderBar(canvasContext, canvasContext.canvas.width / 2 - dx - barWidth, y[0], barWidth, sample[0] * barHeight, barBorderRadius);
                }
                if (sample[1] !== 0) {
                    if (fillColor.length > 0) {
                        canvasContext.setFillColorRgb(fillColor[1] as RGB);
                    }
                    renderBar(canvasContext, canvasContext.canvas.width / 2 + dx, y[1], barWidth, sample[1] * barHeight, barBorderRadius);
                }
                canvasContext.restore();
            });
        }
    }, [ canvas, context ]);
}
