import { DoubleSide, Material, Mesh, MeshLambertMaterial, ParametricGeometry, Vector3 } from 'three';

import ParametricGeometryRenderer from './ParametricGeometryRenderer';
import ParametricGeometries from '../../../../app/ParametricGeometries';

export type MobiusParameters = {
    radius: number;
    width: number;
};

export default class Mobius extends ParametricGeometryRenderer<MobiusParameters> {
    protected initInternal(
        nSamples: number,
        position: Vector3,
        segments: number,
        leftMeshes: Array<Mesh>,
        rightMeshes: Array<Mesh>,
        params: MobiusParameters,
        initMaterial?: (material: Material, i: number, isLeft: boolean) => void,
    ) {
        const dθ = Math.PI / nSamples;
        for (let _i = 0; _i < nSamples; ++_i) {
            const i = nSamples - _i - 1;
            // LEFT
            {
                const geometry = new ParametricGeometry(ParametricGeometries.mobius(params.width, params.radius, Math.PI - (i + 1) * dθ, dθ), 8, segments);
                const material = new MeshLambertMaterial({ color: 0x000000, reflectivity: 0.69, side: DoubleSide, shadowSide: DoubleSide });
                initMaterial?.(material, i, true);

                const mesh = new Mesh(geometry, material);
                mesh.position.set(position.x, position.y, position.z);
                leftMeshes.push(mesh);
            }
            // RIGHT
            {
                const geometry = new ParametricGeometry(ParametricGeometries.mobius(params.width, params.radius, Math.PI + i * dθ, dθ), 8, segments);
                const material = new MeshLambertMaterial({ color: 0x000000, reflectivity: 0.69, side: DoubleSide, shadowSide: DoubleSide });
                initMaterial?.(material, i, false);

                const mesh = new Mesh(geometry, material);
                mesh.position.set(position.x, position.y, position.z);
                rightMeshes.push(mesh);
            }
        }
    }
}
