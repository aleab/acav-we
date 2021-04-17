import { RGB } from 'color-convert/conversions';

import { VerticalVisualizerType } from '../../../app/VisualizerType';
import VisualizerRenderArgs from '../VisualizerRenderArgs';
import VerticalRenderer, { VisualizerParams } from './VerticalRenderer';

/**
 * @param {number} x x coordinate of the top-left corner of the bar.
 * @param {number} y y coordinate of the top-left corner of the bar.
 */
function renderBar(
    canvasContext: CanvasRenderingContext2D,
    x: number, y: number,
    width: number, height: number,
    minHeight: number, barBorderRadius: number,
) {
    const radius = barBorderRadius > width / 2 ? width / 2 : barBorderRadius;
    if (height > minHeight && height > 1 && radius > 0) {
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
        const h = height > minHeight ? height : minHeight;
        canvasContext.fillRect(x, y, width, h);
    }
}

export default class VerticalBarsRenderer extends VerticalRenderer<VerticalVisualizerType.Bars> {
    getHeight(maxHeight: number): number {
        return maxHeight * (this.options.options.height / 100);
    }

    renderSamples(args: VisualizerRenderArgs, visualizerParams: VisualizerParams): void {
        if (args.samples === undefined) return;

        const O = this.options.options;
        if (args.isSilent && O.minHeight === 0) return;

        const {
            canvasContext,
            N: N_BARS,
            flip,
            visualizerPosition,
            visualizerWidth,
            alignment,
            height,
            colorRgb,
            colorReaction,
            colorReactionValueProvider,
        } = visualizerParams;

        const width = (visualizerWidth / N_BARS) * (O.width / 100);
        const barBorderRadius = (width / 2) * (O.borderRadius / 100);
        const spacing = (visualizerWidth - N_BARS * width) / (N_BARS - 1);

        args.samples.forEach((sample, i) => {
            // y = H - p - h∙(1+a)/2
            const y = [
                canvasContext.canvas.height - visualizerPosition - 0.5 * (1 + alignment) * (sample[0] * height),
                canvasContext.canvas.height - visualizerPosition - 0.5 * (1 + alignment) * (sample[1] * height),
            ];

            const dx = this.getSampleDx(args.samples!.length, i, flip, spacing, width);
            const fillColor = this.computeFillColor(i, args, colorRgb, colorReaction, colorReactionValueProvider);

            // Render left and right samples
            canvasContext.save();

            canvasContext.setFillColorRgb(fillColor[0] as RGB);
            canvasContext.setStrokeColorRgb(fillColor[0] as RGB);
            renderBar(canvasContext, canvasContext.canvas.width / 2 - dx[0] - width, y[0], width, sample[0] * height, O.minHeight, barBorderRadius);

            if (fillColor.length > 0) {
                canvasContext.setFillColorRgb(fillColor[1] as RGB);
                canvasContext.setStrokeColorRgb(fillColor[1] as RGB);
            }
            renderBar(canvasContext, canvasContext.canvas.width / 2 + dx[1], y[1], width, sample[1] * height, O.minHeight, barBorderRadius);

            canvasContext.restore();
        });
    }
}
