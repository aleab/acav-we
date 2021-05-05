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

export default {
    mobius,
};
