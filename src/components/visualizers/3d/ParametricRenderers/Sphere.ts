import { Material, Mesh, MeshLambertMaterial, SphereGeometry, Vector3 } from 'three';
import ParametricGeometryRenderer from './ParametricGeometryRenderer';

export type SphereParameters = {
    radius: number;
};

export default class Sphere extends ParametricGeometryRenderer<SphereParameters> {
    protected initInternal(
        nSamples: number,
        position: Vector3,
        segments: number,
        leftMeshes: Array<Mesh>,
        rightMeshes: Array<Mesh>,
        params: SphereParameters,
        initMaterial?: (material: Material, i: number, isLeft: boolean) => void,
    ) {
        const dθ = Math.PI / nSamples;
        for (let i = 0; i < nSamples; ++i) {
            // LEFT
            {
                const geometry = new SphereGeometry(params.radius, segments, segments, 0, 2 * Math.PI, Math.PI - (i + 1) * dθ, dθ);
                const material = new MeshLambertMaterial({ color: 0x000000, emissive: 0x000000, reflectivity: 0.25, dithering: true });
                initMaterial?.(material, i, true);

                const mesh = new Mesh(geometry, material);
                mesh.position.set(position.x, position.y, position.z);
                mesh.rotateZ(Math.PI_2);
                leftMeshes.push(mesh);
            }
            // RIGHT
            {
                const geometry = new SphereGeometry(params.radius, segments, segments, 0, 2 * Math.PI, Math.PI + i * dθ, dθ);
                const material = new MeshLambertMaterial({ color: 0x000000, emissive: 0x000000, reflectivity: 0.25, dithering: true });
                initMaterial?.(material, i, false);

                const mesh = new Mesh(geometry, material);
                mesh.position.set(position.x, position.y, position.z);
                mesh.rotateZ(Math.PI_2);
                rightMeshes.push(mesh);
            }
        }
    }
}
