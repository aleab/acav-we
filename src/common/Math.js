/// <reference path="../@types/common.d.ts" />

Math.PI_2 = Math.PI / 2;
Math.RAD2DEG = 180 / Math.PI;
Math.DEG2RAD = Math.PI / 180;

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

const gamma = {
    g: 7,
    p: [
        0.99999999999980993,
        676.5203681218851,
        -1259.1392167224028,
        771.32342877765313,
        -176.61502916214059,
        12.507343278686905,
        -0.13857109526572012,
        9.9843695780195716e-6,
        1.5056327351493116e-7,
    ],
    g_ln: 607 / 128,
    p_ln: [
        0.99999999999999709182,
        57.156235665862923517,
        -59.597960355475491248,
        14.136097974741747174,
        -0.49191381609762019978,
        0.33994649984811888699e-4,
        0.46523628927048575665e-4,
        -0.98374475304879564677e-4,
        0.15808870322491248884e-3,
        -0.21026444172410488319e-3,
        0.21743961811521264320e-3,
        -0.16431810653676389022e-3,
        0.84418223983852743293e-4,
        -0.26190838401581408670e-4,
        0.36899182659531622704e-5,
    ],
};

Math.lgamma = function lgamma(z) {
    if (z < 0) return Number('0/0');

    let x = gamma.p_ln[0];
    for (let i = gamma.p_ln.length - 1; i > 0; --i) {
        x += gamma.p_ln[i] / (z + i);
    }
    const t = z + gamma.g_ln + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x) - Math.log(z);
};
