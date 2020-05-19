import { MutableRefObject, RefObject } from 'react';

import { WallpaperContextType } from '../../app/WallpaperContext';
import { VerticalVisualizerType } from '../../app/VisualizerType';
import { VerticalVisualizerProperties, VisualizerProperties } from '../../app/properties/VisualizerProperties';

import { IVerticalRenderer } from './vertical/VerticalRenderer';
import VerticalBarsRenderer from './vertical/VerticalBarsRenderer';
import VerticalBlocksRenderer from './vertical/VerticalBlocksRenderer';
import VerticalWaveRenderer from './vertical/VerticalWaveRenderer';

import VisualizerRenderArgs from './VisualizerRenderArgs';
import VisualizerRenderReturnArgs from './VisualizerRenderReturnArgs';

export default function getVerticalBarsVisualizerRenderer(
    context: WallpaperContextType,
    canvas: RefObject<HTMLCanvasElement>,
    visualizerOptions: MutableRefObject<DeepReadonly<VisualizerProperties>>,
    verticalVisualizerOptions: MutableRefObject<DeepReadonly<VerticalVisualizerProperties>>,
    type: VerticalVisualizerType,
): ((timestamp: number, args: VisualizerRenderArgs) => VisualizerRenderReturnArgs | null) {
    const O = verticalVisualizerOptions;

    let renderer: IVerticalRenderer | undefined;
    switch (type) {
        case VerticalVisualizerType.Bars:
            renderer = new VerticalBarsRenderer(context, canvas, {
                visualizerOptions,
                get commonOptions() { return O.current; },
                get options() { return O.current.bars; },
            });
            break;

        case VerticalVisualizerType.Blocks:
            renderer = new VerticalBlocksRenderer(context, canvas, {
                visualizerOptions,
                get commonOptions() { return O.current; },
                get options() { return O.current.blocks; },
            });
            break;

        case VerticalVisualizerType.Wave:
            renderer = new VerticalWaveRenderer(context, canvas, {
                visualizerOptions,
                get commonOptions() { return O.current; },
                get options() { return O.current.wave; },
            });
            break;

        default: break;
    }

    return renderer === undefined ? () => null : renderer.render.bind(renderer);
}
