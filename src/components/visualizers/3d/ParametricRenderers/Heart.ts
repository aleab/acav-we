import { DoubleSide, Material, Mesh, MeshLambertMaterial, ParametricGeometry, Vector3 } from 'three';

import ParametricGeometryRenderer from './ParametricGeometryRenderer';
import ParametricGeometries from '../../../../app/ParametricGeometries';

export type HeartParameters = {
    size: number;
};

export default class Heart extends ParametricGeometryRenderer<HeartParameters> {
    protected initInternal(
        nSamples: number,
        position: Vector3,
        segments: number,
        leftMeshes: Array<Mesh>,
        rightMeshes: Array<Mesh>,
        params: HeartParameters,
        initMaterial?: (material: Material, i: number, isLeft: boolean) => void,
    ) {
        const dθ = (2 * Math.PI) / (3 * nSamples);
        for (let i = 0; i < nSamples; ++i) {
            // LEFT
            {
                const geometry = new ParametricGeometry(ParametricGeometries.heart(params.size, 2 * Math.PI - (i + 1) * dθ, dθ), segments, segments);
                const material = new MeshLambertMaterial({ color: 0x000000, reflectivity: 0.69, side: DoubleSide });
                initMaterial?.(material, i, true);

                const mesh = new Mesh(geometry, material);
                mesh.position.set(position.x, position.y, position.z);
                leftMeshes.push(mesh);
            }
            // RIGHT
            {
                const geometry = new ParametricGeometry(ParametricGeometries.heart(params.size, i * dθ, dθ), segments, segments);
                const material = new MeshLambertMaterial({ color: 0x000000, reflectivity: 0.69, side: DoubleSide });
                initMaterial?.(material, i, false);

                const mesh = new Mesh(geometry, material);
                mesh.position.set(position.x, position.y, position.z);
                rightMeshes.push(mesh);
            }
        }
    }
}
