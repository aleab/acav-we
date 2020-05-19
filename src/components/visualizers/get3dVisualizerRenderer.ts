import { MutableRefObject, RefObject } from 'react';

import { WallpaperContextType } from '../../app/WallpaperContext';
import { ThreeDimensionalVisualizerType } from '../../app/VisualizerType';
import { ThreeDVisualizerProperties, VisualizerProperties } from '../../app/properties/VisualizerProperties';

import { I3DRenderer } from './3d/Renderer3D';
import BarsRenderer3D from './3d/BarsRenderer3D';

import VisualizerRenderArgs from './VisualizerRenderArgs';
import VisualizerRenderReturnArgs from './VisualizerRenderReturnArgs';

export default function getVerticalBarsVisualizerRenderer(
    context: WallpaperContextType,
    canvas: RefObject<HTMLCanvasElement>,
    visualizerOptions: MutableRefObject<DeepReadonly<VisualizerProperties>>,
    threeDVisualizerOptions: MutableRefObject<DeepReadonly<ThreeDVisualizerProperties>>,
    type: ThreeDimensionalVisualizerType,
): ((timestamp: number, args: VisualizerRenderArgs) => VisualizerRenderReturnArgs | null) {
    const O = threeDVisualizerOptions;

    let renderer: I3DRenderer | undefined;
    switch (type) {
        case ThreeDimensionalVisualizerType.Bars:
            renderer = new BarsRenderer3D(context, canvas, {
                visualizerOptions,
                get commonOptions() { return O.current; },
                get options() { return O.current.bars; },
            });
            break;

        default: break;
    }

    return renderer === undefined ? () => null : renderer.render.bind(renderer);
}
