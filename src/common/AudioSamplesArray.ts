import _ from 'lodash';

export default class AudioSamplesArray implements Iterable<number[]> {
    private readonly _raw: number[];
    get raw(): number[] { return this._raw.slice(); }

    readonly length: number;
    readonly channels: number;

    constructor(rawArray: number[], channels: number) {
        this.length = rawArray.length / channels;
        if (!Number.isFinite(this.length) || this.length * channels !== rawArray.length) throw new Error('Wrong number of samples.');

        this._raw = rawArray.slice();
        this.channels = channels;
    }

    getSample(n: number): number[] {
        const sample: number[] = [];
        for (let i = 0; i < this.channels; ++i) {
            sample.push(this._raw[i * this.length + n]);
        }
        return sample;
    }

    getChannel(c: number): number[] {
        return this._raw.slice(c * this.length, c * this.length + this.length);
    }

    clear() {
        this._raw.fill(0);
    }

    max() {
        return _.max(this._raw) ?? 0;
    }

    forEach(callback: (sample: number[], index: number, samples: AudioSamplesArray) => void) {
        for (let i = 0; i < this.length; ++i) {
            callback(this.getSample(i), i, this);
        }
    }

    [Symbol.iterator](): Iterator<number[]> {
        let i = 0;
        return {
            next: () => {
                return i < this.length
                    ? { value: this.getSample(i++), done: false }
                    : { value: null, done: true };
            },
        };
    }
}
