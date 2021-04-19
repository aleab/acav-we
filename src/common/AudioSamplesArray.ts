import _ from 'lodash';

export default class AudioSamplesArray implements Iterable<number[]> {
    private readonly _raw: number[];
    get raw(): number[] { return this._raw.slice(); }

    private readonly convolutionBuffer: number[];

    readonly length: number;
    readonly channels: number;

    private static readonly identityFilter = [ 0, 0, 1, 0, 0 ];
    private static readonly gaussianFilter = [ 1.265625, 24, 64, 24, 1.265625 ];

    constructor(rawArray: number[], channels: number) {
        this.length = rawArray.length / channels;
        if (!Number.isFinite(this.length) || this.length * channels !== rawArray.length) throw new Error('Wrong number of samples.');

        this._raw = rawArray.slice();
        this.convolutionBuffer = new Array<number>(rawArray.length);
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

    clear(): void {
        this._raw.fill(0);
    }

    max(): number {
        return _.max(this._raw) ?? 0;
    }

    /**
     * Spatial smoothing using a 1D convolution
     * @param factor ∈ [0,1] where 0 applies an identity filter and 1 applies a gaussian blur
     * @link https://www.desmos.com/calculator/ozwbtoednm
     * @link https://en.wikipedia.org/wiki/Gaussian_blur
     */
    smooth(factor: number): void {
        /* 1D convolution
         *               ₘ
         * (f ∗ g)(i) =  ∑ g(j)∙f(i+j)
         *              ʲ⁼⁻ᵐ
         */

        if (factor === 0) return;

        const k = (69 ** Math.clamp(factor, 0, 1) - 1) / 68;
        const g = AudioSamplesArray.gaussianFilter.map((v, i) => Math.lerp(AudioSamplesArray.identityFilter[i], v, k));
        const m = Math.floor(g.length / 2);
        const m1 = g.length % 2 === 1 ? m : m - 1;

        for (let _i = 0; _i < this.length; ++_i) {
            for (let c = 0; c < this.channels; ++c) {
                const i = c * this.length + _i;

                let sum = 0;
                let sumw = 0;
                for (let j = -m; j <= m1; ++j) {
                    // eslint-disable-next-line no-continue
                    if (_i + j < 0 || _i + j >= this.length) continue;
                    const w = g[j + m];
                    sum += w * this._raw[i + j];
                    sumw += w;
                }

                this.convolutionBuffer[i] = sumw > 0 ? sum / sumw : 0;
            }
        }

        for (let i = 0; i < this._raw.length; ++i) {
            this._raw[i] = this.convolutionBuffer[i];
        }
    }

    forEach(callback: (sample: number[], index: number, samples: AudioSamplesArray) => void) {
        for (let i = 0; i < this.length; ++i) {
            callback(this.getSample(i), i, this);
        }
    }

    slice(start: number, end: number): AudioSamplesArray {
        const slicedRaw: number[] = [];
        for (let i = 0; i < this.channels; ++i) {
            slicedRaw.push(...this.getChannel(i).slice(start, end));
        }
        return new AudioSamplesArray(slicedRaw, this.channels);
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
