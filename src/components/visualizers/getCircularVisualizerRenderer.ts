import { MutableRefObject, RefObject } from 'react';

import { CircularVisualizerType } from '../../app/VisualizerType';
import { WallpaperContextType } from '../../app/WallpaperContext';
import { CircularVisualizerProperties, VisualizerProperties } from '../../app/properties/VisualizerProperties';

import { IVisualizerRenderer, NullRenderer } from './VisualizerBaseRenderer';
import CircularBarsRenderer from './circular/CircularBarsRenderer';
import CircularBlocksRenderer from './circular/CircularBlocksRenderer';
import CircularWaveRenderer from './circular/CircularWaveRenderer';

export default function getCircularVisualizerRenderer(
    context: WallpaperContextType,
    canvas: RefObject<HTMLCanvasElement>,
    visualizerOptions: MutableRefObject<DeepReadonly<VisualizerProperties>>,
    circularVisualizerOptions: MutableRefObject<DeepReadonly<CircularVisualizerProperties>>,
    type: CircularVisualizerType,
): IVisualizerRenderer {
    const O = circularVisualizerOptions;

    let renderer: IVisualizerRenderer | undefined;
    switch (type) {
        case CircularVisualizerType.Bars:
            renderer = new CircularBarsRenderer(context, canvas, {
                visualizerOptions,
                get commonOptions() { return O.current; },
                get options() { return O.current.bars; },
            });
            break;

        case CircularVisualizerType.Blocks:
            renderer = new CircularBlocksRenderer(context, canvas, {
                visualizerOptions,
                get commonOptions() { return O.current; },
                get options() { return O.current.blocks; },
            });
            break;

        case CircularVisualizerType.Wave:
            renderer = new CircularWaveRenderer(context, canvas, {
                visualizerOptions,
                get commonOptions() { return O.current; },
                get options() { return O.current.wave; },
            });
            break;

        default: break;
    }

    return renderer ?? NullRenderer;
}
