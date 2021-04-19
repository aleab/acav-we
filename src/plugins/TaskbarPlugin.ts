import _ from 'lodash';

import VisualizerRenderArgs from '../components/visualizers/VisualizerRenderArgs';
import VisualizerRenderReturnArgs from '../components/visualizers/VisualizerRenderReturnArgs';

import AudioSamplesArray from '../common/AudioSamplesArray';
import TaskbarProperties from '../app/properties/TaskbarProperties';
import { getClosestFrequencyIndex } from '../app/freq-utils';
import { AudioResponsiveValueProvider, AudioResponsiveValueProviderFactory } from '../app/AudioResponsiveValueProvider';
import { ColorReactionType } from '../app/ColorReactionType';
import { getFrequencyRange } from '../app/FrequencyRange';
import IPlugin from './IPlugin';

export type TaskbarPluginCtorArgs = {
    getOptions: () => TaskbarProperties;
};

type SamplesColor = [readonly [number, number, number], readonly [number, number, number]];

export default class TaskbarPlugin implements IPlugin {
    private readonly getOptions: () => TaskbarProperties;
    private readonly subscibers = new Set<(samples: AudioSamplesArray, colors: SamplesColor[]) => void>();

    public readonly id = Math.random();

    constructor(args: TaskbarPluginCtorArgs) {
        this.getOptions = args.getOptions;
    }

    subscribe(callback: (samples: AudioSamplesArray, colors: SamplesColor[]) => void) {
        this.subscibers.add(callback);
    }

    unsubscribe(callback: (samples: AudioSamplesArray, colors: SamplesColor[]) => void) {
        this.subscibers.delete(callback);
    }

    processAudioData(_args: VisualizerRenderArgs): Promise<void> { return Promise.resolve(); }

    async processVisualizerSamplesData(visualizerReturnArgs: VisualizerRenderReturnArgs, samplesBuffer: AudioSamplesArray[] | undefined): Promise<void> {
        const samples = visualizerReturnArgs.samples;
        if (samples === undefined) return;

        const O = this.getOptions();

        const colorReactionValueProvider = AudioResponsiveValueProviderFactory.buildAudioResponsiveValueProvider(
            AudioResponsiveValueProvider.ValueNormalized,
            visualizerReturnArgs.colorResponseValueGain,
        );

        const freqRange = getFrequencyRange(O.frequencyRange);
        const i0 = getClosestFrequencyIndex(freqRange[0]);
        const rangeSamples = samples.slice(i0, getClosestFrequencyIndex(freqRange[1]) + 1);

        const raw = rangeSamples.raw;
        const peak = Math.max(...raw);
        const iPeak = i0 + _.findIndex(raw, v => v === peak);

        const outSamples: number[] = [];
        const outColors: SamplesColor[] = [];

        if (O.resolution === 0) {
            const left = _.mean(samples.getChannel(0));
            const right = _.mean(samples.getChannel(1));

            const fillColor: SamplesColor = [ visualizerReturnArgs.color, visualizerReturnArgs.color ];
            if (visualizerReturnArgs.colorReactionType !== ColorReactionType.None && visualizerReturnArgs.colorReaction !== undefined)  {
                const value = colorReactionValueProvider([ left, right ], iPeak, { samplesBuffer, peak });
                if (!Number.isNaN(value[0]) && !Number.isNaN(value[1])) {
                    fillColor[0] = visualizerReturnArgs.colorReaction(value[0]);
                    fillColor[1] = visualizerReturnArgs.colorReaction(value[1]);
                }
            }

            outSamples.push(left, right);
            outColors.push(fillColor);
        } else {
            const res = O.resolution / 100;

            const N = Math.round(rangeSamples.length * res);
            const nSamplesPerBucket = rangeSamples.length / N;

            let iBucket = 0;
            const buckets: Array<{ sums: [number, number], n: number } | undefined> = [];

            // Put the original samples into N buckets
            rangeSamples.forEach((sample, i) => {
                if (i >= Math.floor((iBucket + 1) * nSamplesPerBucket)) {
                    iBucket++;
                }

                const bucket = buckets[iBucket];
                if (bucket === undefined) {
                    buckets[iBucket] = { sums: [ sample[0], sample[1] ], n: 1 };
                } else {
                    bucket.sums[0] += sample[0];
                    bucket.sums[1] += sample[1];
                    bucket.n++;
                }
            });

            const bucketSamples = buckets.map<[number, number]>(v => (v !== undefined ? v.sums.map(s => s / v.n) as [number, number] : [ 0, 0 ]));
            bucketSamples.forEach((sample, i) => {
                const fillColor: SamplesColor = [ visualizerReturnArgs.color, visualizerReturnArgs.color ];
                if (visualizerReturnArgs.colorReactionType !== ColorReactionType.None && visualizerReturnArgs.colorReaction !== undefined)  {
                    const value = colorReactionValueProvider([ sample[0], sample[1] ], i, { samplesBuffer, peak });
                    if (!Number.isNaN(value[0]) && !Number.isNaN(value[1])) {
                        fillColor[0] = visualizerReturnArgs.colorReaction(value[0]);
                        fillColor[1] = visualizerReturnArgs.colorReaction(value[1]);
                    }
                }

                outSamples.push(...sample);
                outColors.push(fillColor);
            });
        }

        const _samples = new AudioSamplesArray(outSamples, 2);

        const promises: Promise<void>[] = [];
        this.subscibers.forEach(callback => promises.push(new Promise(resolve => {
            callback(_samples, outColors);
            resolve();
        })));

        await Promise.all(promises);
    }
}
