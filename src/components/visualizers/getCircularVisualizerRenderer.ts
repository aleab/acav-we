import { MutableRefObject, RefObject } from 'react';

import { CircularVisualizerType } from '../../app/VisualizerType';
import { WallpaperContextType } from '../../app/WallpaperContext';
import { CircularVisualizerProperties, VisualizerProperties } from '../../app/properties/VisualizerProperties';

import { ICircularRenderer } from './circular/CircularRenderer';
import CircularBarsRenderer from './circular/CircularBarsRenderer';
import CircularBlocksRenderer from './circular/CircularBlocksRenderer';

export default function getCircularVisualizerRenderer(
    context: WallpaperContextType,
    canvas: RefObject<HTMLCanvasElement>,
    visualizerOptions: MutableRefObject<DeepReadonly<VisualizerProperties>>,
    circularVisualizerOptions: MutableRefObject<DeepReadonly<CircularVisualizerProperties>>,
    type: CircularVisualizerType,
) {
    const O = circularVisualizerOptions;

    let renderer: ICircularRenderer | undefined;
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

        default: break;
    }

    return renderer === undefined ? () => {} : renderer.render.bind(renderer);
}
