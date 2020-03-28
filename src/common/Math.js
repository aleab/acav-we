/// <reference path="../@types/common.d.ts" />

Math.PI_2 = Math.PI / 2;

Math.clamp = (x, min, max) => (x > max ? max : x < min ? min : x);
Math.lerp = (from, to, k) => (1 - k) * from + k * to;

Math.median = (array, isSorted = false) => {
    if (array.length === 0) return 0;
    const values = isSorted ? array : array.slice().sort((a, b) => a - b);
    const half = Math.floor(values.length / 2);
    return values.length % 2 ? values[half] : (values[half - 1] + values[half]) / 2;
};

Math.formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = [ 'B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB' ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / (k ** i)).toFixed(decimals < 0 ? 0 : decimals)) + ' ' + sizes[i];
};
