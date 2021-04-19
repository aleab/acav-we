import Log from '../common/Log';
import AudioSamplesArray from '../common/AudioSamplesArray';

export enum AudioResponsiveValueProvider { Value, ValueNormalized, Change, ChangeAbsolute }

export type AudioResponsiveValueProviderFunctionArgs = { samplesBuffer?: AudioSamplesArray[], peak?: number };

const AudioResponsiveValueProviders: {
    [k in AudioResponsiveValueProvider]: (sample: [ number, number ], i: number, gain: number, args: AudioResponsiveValueProviderFunctionArgs) => [ number, number ];
} = {
    [AudioResponsiveValueProvider.Value]: (sample, _i, gain) => {
        return [
            Math.clamp(gain * sample[0], 0, 1),
            Math.clamp(gain * sample[1], 0, 1),
        ];
    },
    [AudioResponsiveValueProvider.ValueNormalized]: (sample, _i, gain, { peak }) => {
        if (peak === undefined) throw new Error('peak is undefined');
        return [
            Math.clamp(gain * (sample[0] / peak), 0, 1),
            Math.clamp(gain * (sample[1] / peak), 0, 1),
        ];
    },
    [AudioResponsiveValueProvider.Change]: (sample, i, gain, { samplesBuffer }) => {
        const s = samplesBuffer?.[0]?.getSample(i) ?? sample;
        return [
            Math.clamp(gain * (sample[0] - s[0]), -1, 1),
            Math.clamp(gain * (sample[1] - s[1]), -1, 1),
        ];
    },
    [AudioResponsiveValueProvider.ChangeAbsolute]: (sample, i, gain, { samplesBuffer }) => {
        const s = samplesBuffer?.[0]?.getSample(i) ?? sample;
        return [
            Math.clamp(gain * Math.abs(sample[0] - s[0]), 0, 1),
            Math.clamp(gain * Math.abs(sample[1] - s[1]), 0, 1),
        ];
    },
};

export type AudioResponsiveValueProviderFunction = (sample: [number, number], i: number, args: AudioResponsiveValueProviderFunctionArgs) => [number, number];
export const AudioResponsiveValueProviderFactory = {
    buildAudioResponsiveValueProvider(type: AudioResponsiveValueProvider, gain: number): AudioResponsiveValueProviderFunction {
        let valueProvider = AudioResponsiveValueProviders[type];
        if (!valueProvider) {
            Log.warn('Unhandled AudioResponsiveValueProvider type:', AudioResponsiveValueProvider[type]);
            valueProvider = AudioResponsiveValueProviders[AudioResponsiveValueProvider.Value];
        }

        return (
            sample: [ number, number ],
            i: number,
            args: AudioResponsiveValueProviderFunctionArgs,
        ) => valueProvider(sample, i, gain, args);
    },
};
