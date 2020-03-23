export default class CurcularBuffer<T extends any> {
    private readonly _raw: T[] = [];
    /** Returns a copy of the wrapped array.  */
    get raw(): T[] { return this._raw.slice(); }

    private _size: number;
    get size(): number { return this._size; }

    get length(): number { return this._raw.length; }

    constructor(size: number) {
        if (!Number.isFinite(size)) throw new Error('Size must be finite');
        if (size <= 0) throw new Error('Size must be a positive number');

        this._size = size;
    }

    get(i: number): T {
        if (i >= this.size) throw new Error('Index is out of range.');
        return this._raw[i];
    }

    push(samples: T) {
        while (this._raw.length >= this._size) {
            this.shift();
        }
        this._raw.push(samples);
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

    peak(n: number = 1): T[] {
        return this._raw.slice(this._size - n - 1);
    }

    private shift() {
        this._raw.shift();
    }
}
