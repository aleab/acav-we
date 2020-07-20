import { RGB } from 'color-convert/conversions';

import { VerticalVisualizerType } from '../../../app/VisualizerType';
import VisualizerRenderArgs from '../VisualizerRenderArgs';
import VerticalRenderer, { VisualizerParams } from './VerticalRenderer';

/**
 * @param {number} x x coordinate of the top-left corner of the bar.
 * @param {number} y y coordinate of the top-left corner of the bar.
 */
function renderBlock(canvasContext: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, thickness: number) {
    canvasContext.fillRect(x, y - thickness, width, thickness);
    canvasContext.fillRect(x, y + height, width, thickness);
}

export default class VerticalBlocksRenderer extends VerticalRenderer<VerticalVisualizerType.Blocks> {
    getHeight(maxHeight: number): number {
        return maxHeight * (this.options.options.height / 100);
    }

    renderSamples(args: VisualizerRenderArgs, visualizerParams: VisualizerParams): void {
        if (args.samples === undefined) return;

        const O = this.options.options;
        if (args.isSilent && O.hideWhenSilent) return;

        const {
            canvasContext,
            N: N_BARS,
            flipFrequencies,
            visualizerPosition,
            visualizerWidth,
            alignment,
            height,
            colorRgb,
            colorReaction,
            colorReactionValueProvider,
        } = visualizerParams;

        const width = (visualizerWidth / N_BARS) * (O.width / 100);
        const blockThickness = O.thickness;
        const spacing = (visualizerWidth - N_BARS * width) / (N_BARS - 1);

        args.samples.forEach((sample, i) => {
            // y = H - p - h∙(1+a)/2
            const y = [
                canvasContext.canvas.height - visualizerPosition - 0.5 * (1 + alignment) * (sample[0] * height),
                canvasContext.canvas.height - visualizerPosition - 0.5 * (1 + alignment) * (sample[1] * height),
            ];

            const index = flipFrequencies ? (args.samples!.length - 1 - i) : i;
            const dx = spacing / 2 + index * (width + spacing);
            const fillColor = this.computeFillColor(i, args, colorRgb, colorReaction, colorReactionValueProvider);

            // Render left and right samples
            canvasContext.save();

            canvasContext.setFillColorRgb(fillColor[0] as RGB);
            canvasContext.setStrokeColorRgb(fillColor[0] as RGB);
            renderBlock(canvasContext, canvasContext.canvas.width / 2 - dx - width, y[0], width, sample[0] * height, blockThickness);

            if (fillColor.length > 0) {
                canvasContext.setFillColorRgb(fillColor[1] as RGB);
                canvasContext.setStrokeColorRgb(fillColor[1] as RGB);
            }
            renderBlock(canvasContext, canvasContext.canvas.width / 2 + dx, y[1], width, sample[1] * height, blockThickness);

            canvasContext.restore();
        });
    }
}
