import AudioSamplesArray from '../common/AudioSamplesArray';
import LinkedList from '../common/LinkedList';

type AudioHistoryItem = {
    timestamp: number;
    data: AudioSamplesArray;
};

export interface IReadonlyAudioHistory {
    readonly delay: number;
    readonly artificialDelay: number;
    getAudioFrame(timestamp: number): [ DeepReadonly<AudioSamplesArray> | null, number ];
    getSince(timestamp: number): DeepReadonly<AudioHistoryItem>[];
    getAudioFramesSince(timestamp: number): DeepReadonly<AudioSamplesArray>[];
}

export default class AudioHistory implements IReadonlyAudioHistory {
    private readonly frames: LinkedList<AudioHistoryItem>;

    private _delay: number = 10;
    get delay() { return this._delay; }

    private _artificialDelay: number = 0;
    get artificialDelay() { return this._artificialDelay; }
    set artificialDelay(ms: number) { this._artificialDelay = ms; }

    constructor(artificialDelay: number = 0) {
        this.frames = new LinkedList<AudioHistoryItem>();
        this._artificialDelay = artificialDelay;
    }

    push(timestamp: number, data: AudioSamplesArray) {
        const item: AudioHistoryItem = { timestamp, data };
        if (this.frames.length === 0 || timestamp >= this.frames.last!.timestamp) {
            this.frames.append(item);
        } else if (timestamp <= this.frames.first!.timestamp) {
            this.frames.insertAt(0, item);
        } else {
            this.frames.insertSorted(item, AudioHistory.compareTimestamps);
        }

        if (this.frames.length >= 2) {
            const { prev: a, next: b } = this.frames.findAdjacent(() => true, true);
            const dt = Math.max(b!.timestamp - a!.timestamp, 1);
            this._delay = dt > this._delay ? dt : Math.round(Math.lerp(dt, this._delay, 0.69)); // nice!
        }

        this.deleteOlderThan(timestamp - 1000 - this._artificialDelay);
    }

    deleteOlderThan(time: number) {
        if (this.frames.length === 0) return;
        while (this.frames.length > 0 && this.frames.first!.timestamp <= time) {
            this.frames.shift();
        }
    }

    getAudioFrame(timestamp: number): [ AudioSamplesArray | null, number ] {
        if (this.frames.length === 0) return [ null, -1 ];
        if (this.frames.length === 1 || timestamp <= this.frames.first!.timestamp) return [ this.frames.first!.data, this.frames.first!.timestamp ];
        if (timestamp >= this.frames.last!.timestamp) return [ this.frames.last!.data, this.frames.last!.timestamp ];

        const { prev, next } = this.frames.findAdjacent(
            (a, b) => timestamp >= a.timestamp && timestamp < b.timestamp,
            Math.abs(timestamp - this.frames.first!.timestamp) >= Math.abs(timestamp - this.frames.last!.timestamp),
        );

        if (prev !== undefined && next !== undefined) {
            const raw = prev.data.raw; // .raw is already a `slice()`
            const raw1 = next.data.raw;

            const k = 0.5 * (1 - Math.cos(((timestamp - prev.timestamp) / (next.timestamp - prev.timestamp)) * Math.PI));
            for (let i = 0; i < raw.length; ++i) {
                raw[i] = Math.lerp(raw[i], raw1[i], k);
            }

            return [ new AudioSamplesArray(raw, prev.data.channels), timestamp ];
        }

        return [ null, -1 ];
    }

    getSince(timestamp: number): AudioHistoryItem[] {
        if (this.frames.length === 0) return [];
        const result: AudioHistoryItem[] = [];

        const it = this.frames.getIterator(true);
        let itr: IteratorResult<AudioHistoryItem>;
        while (!(itr = it.next()).done && itr.value.timestamp >= timestamp) {
            result.push(itr.value);
        }
        return result.reverse();
    }

    getAudioFramesSince(timestamp: number): AudioSamplesArray[] {
        return this.getSince(timestamp).map(item => item.data);
    }

    private static compareTimestamps(a: AudioHistoryItem, b: AudioHistoryItem): number {
        return a.timestamp - b.timestamp;
    }
}
