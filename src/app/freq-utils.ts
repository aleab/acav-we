const frequencies = [
    26, 48, 73, 93, 115, 138, 162, 185,
    207, 231, 254, 276, 298, 323, 346, 370,
    392, 414, 436, 459, 483, 507, 529, 552,
    575, 598, 621, 644, 669, 714, 828, 920,
    1057, 1173, 1334, 1472, 1655, 1840, 2046, 2253,
    2483, 2735, 3012, 3287, 3609, 3930, 4275, 4665,
    5056, 5493, 5929, 6412, 6917, 7446, 7998, 8618,
    9261, 9928, 10617, 11352, 11996, 12937, 13718, 14408,
];

export function getFrequency(i: number) {
    return frequencies[i];
}

export function getClosestFrequencyIndex(freq: number) {
    if (freq <= frequencies[0]) return 0;
    if (freq >= frequencies[frequencies.length - 1]) return frequencies.length - 1;

    for (let i = 0; i < frequencies.length; ++i) {
        const f1 = frequencies[i];
        if (freq === f1) return i;

        const f0 = i > 0 ? frequencies[i - 1] : 0;
        if (freq > f0 && freq < f1) {
            const d1 = f1 - freq;
            const d0 = freq - f0;
            return d1 < d0 ? i : i - 1;
        }
    }
    return frequencies.length - 1;
}
