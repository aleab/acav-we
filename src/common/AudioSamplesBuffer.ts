import AudioSamplesArray from './AudioSamplesArray';

export default class AudioSamplesBuffer {
    private readonly _samples: AudioSamplesArray[] = [];
    get samples(): AudioSamplesArray[] { return this._samples.slice(); }

    private _size: number;
    get size(): number { return this._size; }

    constructor(size: number) {
        if (!Number.isFinite(size)) throw new Error('Size must be finite');
        if (size <= 0) throw new Error('Size must be a positive number');

        this._size = size;
    }

    get(i: number): AudioSamplesArray {
        if (i >= this.size) throw new Error('Index is out of range.');
        return this._samples[i];
    }

    resize(size: number) {
        if (size === this._size || size <= 0 || !Number.isFinite(size)) return;
        if (size < this._size) {
            for (let ds = this._size - size; ds > 0; --ds) {
                this.shift();
            }
        }
        this._size = size;
    }

    push(samples: AudioSamplesArray) {
        while (this._samples.length >= this._size) {
            this.shift();
        }
        this._samples.push(samples);
    }

    peak(n: number = 1): AudioSamplesArray[] {
        return this._samples.slice(this._size - n - 1);
    }

    private shift() {
        this._samples.shift();
    }
}
