import { Vector3 } from 'three';

function mobius(width: number, radius: number, thetaStart: number = 0, thetaLength: number = 2 * Math.PI) {
    return function func(u: number, v: number, vector: Vector3) {
        const s = (u - 0.5) * width;
        const t = thetaStart + v * thetaLength;
        vector.set(
            (radius + s * Math.cos(t / 2)) * Math.cos(t),
            (radius + s * Math.cos(t / 2)) * Math.sin(t),
            s * Math.sin(t / 2),
        );
    };
}

// https://www.math3d.org/BCHxXRQr
// https://www.desmos.com/calculator/tpebewn4xa
function heart(size: number, thetaStart: number = 0, thetaLength: number = 2 * Math.PI) {
    // const A = [ 0.990006, 0.00111423, -0.0098724, 0, -0.000239729, -0.0000825236, 0.00146581, 0.0000292286, -0.000228768, -0.00000316308 ];
    const A = [ 0.978, 0.249395, -0.916908, 1.51015, -1.12121, 0, 0.594761, -0.406411, 0.113277, -0.0117132 ];
    const h = (t: number, r: number) => {
        const E = 0.69;
        const H = A.reduce((sum, a, i) => sum + a * t ** i, 0);
        return (1 - H) * (r / Math.PI) ** E + H;
    };
    return function func(u: number, v: number, vector: Vector3) {
        const t = u * Math.PI;
        const r = thetaStart + v * thetaLength;
        const s = Math.abs(Math.PI - r);
        vector.set(
            Math.sin(r) * 16 * (Math.sin(t) ** 3),
            Math.sin(s) * (15 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
            Math.cos(r) * 6 * h(t, s),
        );
        vector.multiplyScalar(size / 16);
    };
}

export default {
    mobius,
    heart,
};
