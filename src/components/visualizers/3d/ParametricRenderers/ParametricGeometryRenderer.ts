import { Material, Mesh, Vector3 } from 'three';

export default abstract class ParametricGeometryRenderer<TParams = any> {
    private _params: TParams | undefined;
    get params(): TParams | undefined { return this._params; }

    init(
        nSamples: number,
        position: Vector3,
        segments: number,
        leftMeshes: Array<Mesh>,
        rightMeshes: Array<Mesh>,
        params: TParams,
        initMaterial?: (material: Material, i: number, isLeft: boolean) => void,
    ) {
        this._params = params;
        this.initInternal(nSamples, position, segments, leftMeshes, rightMeshes, params, initMaterial);
    }

    protected abstract initInternal(
        nSamples: number,
        position: Vector3,
        segments: number,
        leftMeshes: Array<Mesh>,
        rightMeshes: Array<Mesh>,
        params: TParams,
        initMaterial?: (material: Material, i: number, isLeft: boolean) => void,
    ): void;
}
