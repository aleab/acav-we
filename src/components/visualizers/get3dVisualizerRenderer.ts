import { MutableRefObject, RefObject } from 'react';

import { WallpaperContextType } from '../../app/WallpaperContext';
import { ThreeDimensionalVisualizerType } from '../../app/VisualizerType';
import { ThreeDVisualizerProperties, VisualizerProperties } from '../../app/properties/VisualizerProperties';

import { IVisualizerRenderer, NullRenderer } from './VisualizerBaseRenderer';
import BarsRenderer3D from './3d/BarsRenderer3D';

export default function getVerticalBarsVisualizerRenderer(
    context: WallpaperContextType,
    canvas: RefObject<HTMLCanvasElement>,
    visualizerOptions: MutableRefObject<DeepReadonly<VisualizerProperties>>,
    threeDVisualizerOptions: MutableRefObject<DeepReadonly<ThreeDVisualizerProperties>>,
    type: ThreeDimensionalVisualizerType,
): IVisualizerRenderer {
    const O = threeDVisualizerOptions;

    let renderer: IVisualizerRenderer | undefined;
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

    return renderer ?? NullRenderer;
}
