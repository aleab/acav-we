export enum FrequencyRange { All, Bass, Midrange, UpperMidrange, Vocals, Treble }

export function getFrequencyRange(range: FrequencyRange): [number, number] {
    switch (range) {
        case FrequencyRange.All: return [ 0, 20000 ];
        case FrequencyRange.Bass: return [ 0, 500 ];
        case FrequencyRange.Midrange: return [ 500, 2000 ];
        case FrequencyRange.UpperMidrange: return [ 2000, 4000 ];
        case FrequencyRange.Vocals: return [ 500, 4000 ];
        case FrequencyRange.Treble: return [ 2048, 16384 ];
        default: return [ 0, 0 ];
    }
}
