import Log from '../common/Log';
import AudioSamplesBuffer from '../common/AudioSamplesBuffer';

export enum AudioResponsiveValueProvider { Value, ValueNormalized, Change, ChangeAbsolute }

type AudioResponsiveValueProviderFunctionArgs = { samplesBuffer?: AudioSamplesBuffer, peak?: number };
type AudioResponsiveValueProviderFunction = (sample: [ number, number ], i: number, gain: number, args: AudioResponsiveValueProviderFunctionArgs) => [ number, number ];

const AudioResponsiveValueProviders: {
    [k in AudioResponsiveValueProvider]: AudioResponsiveValueProviderFunction;
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
        const s = samplesBuffer?.get(0).getSample(i) ?? sample;
        return [
            Math.clamp(gain * (sample[0] - s[0]), -1, 1),
            Math.clamp(gain * (sample[1] - s[1]), -1, 1),
        ];
    },
    [AudioResponsiveValueProvider.ChangeAbsolute]: (sample, i, gain, { samplesBuffer }) => {
        const s = samplesBuffer?.get(0).getSample(i) ?? sample;
        return [
            Math.clamp(gain * Math.abs(sample[0] - s[0]), 0, 1),
            Math.clamp(gain * Math.abs(sample[1] - s[1]), 0, 1),
        ];
    },
};

export const AudioResponsiveValueProviderFactory = {
    buildAudioResponsiveValueProvider(type: AudioResponsiveValueProvider, gain: number) {
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
