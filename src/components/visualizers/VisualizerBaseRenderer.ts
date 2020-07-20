import { RGB } from 'color-convert/conversions';
import { MutableRefObject, RefObject } from 'react';

import { VisualizerProperties } from '../../app/properties/VisualizerProperties';
import { AudioResponsiveValueProviderFunction } from '../../app/AudioResponsiveValueProvider';
import { WallpaperContextType } from '../../app/WallpaperContext';

import VisualizerRenderArgs from './VisualizerRenderArgs';
import VisualizerRenderReturnArgs from './VisualizerRenderReturnArgs';

export interface VisualizerRendererOptions<TCommonOptions, TOptions> {
    visualizerOptions: MutableRefObject<DeepReadonly<VisualizerProperties>>;
    readonly commonOptions: DeepReadonly<TCommonOptions>;
    readonly options: DeepReadonly<TOptions>;
}

export interface IVisualizerRenderer {
    render(timestamp: number, args: VisualizerRenderArgs): VisualizerRenderReturnArgs | null;
    clear(): void;
}

export const NullRenderer: IVisualizerRenderer = {
    render: () => null,
    clear: () => {},
};

export default abstract class VisualizerBaseRenderer<T extends VisualizerRendererOptions<any, any>> implements IVisualizerRenderer {
    protected readonly context: WallpaperContextType;
    protected readonly canvas: RefObject<HTMLCanvasElement>;
    protected readonly options: T;

    public get commonOptions() { return this.options.commonOptions; }

    constructor(
        context: WallpaperContextType,
        canvas: RefObject<HTMLCanvasElement>,
        options: T,
    ) {
        this.context = context;
        this.canvas = canvas;
        this.options = options;
    }

    protected setCanvasColor(canvasContext: CanvasRenderingContext2D, color: RGB | undefined) {
        if (color !== undefined) {
            canvasContext.setFillColorRgb(color);
            canvasContext.setStrokeColorRgb(color);
        }
    }

    protected computeFillColor(
        i: number,
        args: VisualizerRenderArgs,
        baseColor: Readonly<RGB>,
        colorReaction: ((value: number) => RGB) | undefined,
        colorReactionValueProvider: AudioResponsiveValueProviderFunction,
    ): Readonly<RGB>[] {
        const fillColor = [ baseColor, baseColor ];
        if (args.samples !== undefined) {
            const sample = args.samples.getSample(i);
            if (colorReaction !== undefined) {
                const value = colorReactionValueProvider([ sample[0], sample[1] ], i, { samplesBuffer: args.samplesBuffer, peak: args.peak });
                if (!Number.isNaN(value[0]) && !Number.isNaN(value[1])) {
                    fillColor[0] = colorReaction(value[0]);
                    fillColor[1] = colorReaction(value[1]);
                }
            }
        }

        return fillColor;
    }

    abstract getHeight(maxHeight: number): number;

    abstract render(timestamp: number, args: VisualizerRenderArgs): VisualizerRenderReturnArgs | null;

    clear() {
        const canvasContext = this.canvas.current?.getContext('2d');
        if (canvasContext) {
            canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
        }
    }
}
