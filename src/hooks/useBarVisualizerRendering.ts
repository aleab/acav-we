import { useCallback, useContext, useRef } from 'react';
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

export default function useBarVisualizerRendering(canvasContext: CanvasRenderingContext2D | undefined) {
    const context = useContext(WallpaperContext)!;
    const O = useRef(context.wallpaperProperties.barVisualizer);

    return useCallback((args: RenderArgs) => {
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

                if (barColorReaction !== undefined) {
                    const value = barColorReactionValueProvider([ sample[0], sample[1] ], i, { samplesBuffer: args.samplesBuffer, peak: args.peak });

                    if (sample[0] !== 0) {
                        canvasContext.setFillColorRgb(barColorReaction(value[0]) as RGB);
                        canvasContext.fillRect(canvasContext.canvas.width / 2 - dx - barWidth, y[0], barWidth, sample[0] * barHeight);
                    }
                    if (sample[1] !== 0) {
                        canvasContext.setFillColorRgb(barColorReaction(value[1]) as RGB);
                        canvasContext.fillRect(canvasContext.canvas.width / 2 + dx, y[1], barWidth, sample[1] * barHeight);
                    }
                } else {
                    canvasContext.setFillColorRgb(barColorRgb as RGB);
                    if (sample[0] !== 0) {
                        canvasContext.fillRect(canvasContext.canvas.width / 2 - dx - barWidth, y[0], barWidth, sample[0] * barHeight);
                    }
                    if (sample[1] !== 0) {
                        canvasContext.fillRect(canvasContext.canvas.width / 2 + dx, y[1], barWidth, sample[1] * barHeight);
                    }
                }
            });
        }
    }, [ canvasContext, context ]);
}
