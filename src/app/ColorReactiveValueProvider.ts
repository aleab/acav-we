import AudioSamplesBuffer from '../common/AudioSamplesBuffer';

export enum ColorReactiveValueProvider { Value, NormalizedValue, Change }
type ColorReactiveValueProvidersType = {
    [k in ColorReactiveValueProvider]: (
        sample: [ number, number ],
        i: number,
        gain: number,
        args: {
            samplesBuffer?: AudioSamplesBuffer,
            peak?: number,
        }
    ) => [ number, number ];
};
export const ColorReactiveValueProviders: ColorReactiveValueProvidersType = {
    [ColorReactiveValueProvider.Value]: (sample, _i, gain) => {
        return [
            Math.clamp(gain * sample[0], 0, 1),
            Math.clamp(gain * sample[1], 0, 1),
        ];
    },
    [ColorReactiveValueProvider.NormalizedValue]: (sample, _i, gain, { peak }) => {
        if (peak === undefined) throw new Error('peak is undefined');
        return [
            Math.clamp(gain * (sample[0] / peak), 0, 1),
            Math.clamp(gain * (sample[1] / peak), 0, 1),
        ];
    },
    [ColorReactiveValueProvider.Change]: (sample, i, gain, { samplesBuffer }) => {
        const s = samplesBuffer?.get(0).getSample(i) ?? sample;
        return [
            Math.clamp(gain * Math.abs(sample[0] - s[0]), 0, 1),
            Math.clamp(gain * Math.abs(sample[1] - s[1]), 0, 1),
        ];
    },
};
