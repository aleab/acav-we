import { RGB } from 'color-convert/conversions';

import AudioSamplesArray from '../../common/AudioSamplesArray';
import { ColorReactionType } from '../../app/ColorReactionType';

export default interface VisualizerRenderReturnArgs {
    samples: AudioSamplesArray | undefined;
    color: Readonly<RGB>;
    colorReactionType: ColorReactionType,
    colorReaction: ((value: number) => RGB) | undefined;
    colorResponseValueGain: number;
}
