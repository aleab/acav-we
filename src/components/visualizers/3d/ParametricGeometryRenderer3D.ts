import _ from 'lodash';
import { Color, Material, Mesh, MeshLambertMaterial, PointLight, SphereGeometry, Vector3 } from 'three';

import { Visualizer3DParametricGeometries } from '../../../app/Visualizer3DParametricGeometries';
import { VisualizerFlipType } from '../../../app/VisualizerFlipType';
import { ThreeDimensionalVisualizerType } from '../../../app/VisualizerType';
import VisualizerRenderArgs from '../VisualizerRenderArgs';
import Renderer3D, { VisualizerParams } from './Renderer3D';

import SphereRenderer from './ParametricRenderers/Sphere';
import MobiusRenderer from './ParametricRenderers/Mobius';

const SET_MATERIAL_COLOR_EVENT_NAME = 'setMaterialColor';
function setMaterialColor(material: Material & { color: Color }, color: readonly [number, number, number]) {
    material.color.setRGB(color[0] / 255, color[1] / 255, color[2] / 255).convertSRGBToLinear();
}

function isColorMaterial(material: Material): material is Material & { color: Color } {
    const m = material as { color?: any };
    if (m.color !== undefined && m.color !== null) {
        if (typeof m.color.r === 'number' && typeof m.color.g === 'number' && typeof m.color.b === 'number') {
            return true;
        }
    }
    return false;
}
function addColorListener(material: Material & { color: Color }, eventName: string) {
    material.addEventListener(eventName, event => {
        const _color = event['color'];
        if (Array.isArray(_color) && _color.length === 3 && typeof _color[0] === 'number') {
            setMaterialColor(event.target as Material & { color: Color }, _color as [number, number, number]);
        }
    });
}

function addSampleColorListener(material: Material, i: number, isLeft: boolean) {
    if (isColorMaterial(material)) {
        addColorListener(material, SET_MATERIAL_COLOR_EVENT_NAME);
    }
}

export default class ParametricGeometryRenderer3D extends Renderer3D<ThreeDimensionalVisualizerType.ParametricGeometry> {
    private parametricRenderers = {
        sphere: new SphereRenderer(),
        mobius: new MobiusRenderer(),
    };

    getHeight(maxHeight: number): number {
        return maxHeight;
    }

    private position: Vector3 = new Vector3(0, 0, -5);
    private radius: number = 1.5;

    private light: PointLight | undefined;
    private left: Array<Mesh> | undefined;
    private right: Array<Mesh> | undefined;

    private geometry: Visualizer3DParametricGeometries | undefined;

    private purge(...meshes: Array<Array<Mesh> | undefined>) {
        for (let i = 0; i < meshes.length; ++i) {
            const _meshes = meshes[i];
            if (_meshes !== undefined) {
                this.scene.remove(..._meshes);
            }
        }
    }

    protected initScene(vfov: number, aspect: number, zoom: number, nSamples: number) {
        super.initScene(vfov, aspect, zoom, nSamples);
        const O = this.options.options;

        this.camera.position.z = 1;

        if (this.light === undefined) {
            this.light = new PointLight(0xFFFFFF, 1, 12, 2);
            this.light.castShadow = true;
            this.scene.add(this.light);
        }

        if (this.geometry !== O.geometry) {
            this.purge(this.left, this.right);
            this.left = [];
            this.right = [];

            this.geometry = O.geometry;
            switch (this.geometry) {
                case Visualizer3DParametricGeometries.Sphere: {
                    this.parametricRenderers.sphere.init(nSamples, this.position, 64, this.left, this.right, { radius: this.radius }, addSampleColorListener);
                    break;
                }

                case Visualizer3DParametricGeometries.Mobius: {
                    this.parametricRenderers.mobius.init(nSamples, this.position, 64, this.left, this.right, { radius: this.radius, width: 1 }, addSampleColorListener);
                    break;
                }

                default: break;
            }

            this.scene.add(...this.left, ...this.right);
        }
    }

    private t0: number = -1;
    private cameraRevolutionTime: number = 10 * 1000;

    protected renderTimed(timestamp: number) {
        super.renderTimed(timestamp);

        if (this.t0 < 0) this.t0 = timestamp;

        const dϑ = (2 * Math.PI) / this.cameraRevolutionTime;
        const t = timestamp - this.t0;
        const ϑ = dϑ * t;

        this.camera.position.set(
            2 * this.radius * Math.cos(ϑ),
            2 * this.radius * Math.cos(ϑ) * Math.sin(ϑ),
            2 * this.radius * (Math.sin(ϑ) ** 2) - (2 * this.radius - 1),
        );

        this.camera.lookAt(this.position);
    }

    renderSamples(_timestamp: number, args: VisualizerRenderArgs, visualizerParams: VisualizerParams): void {
        const renderer = this.renderer;

        if (renderer === undefined) return;
        if (this.canvas.current === null) return;
        if (args.samples === undefined) return;

        const O = this.options.options;

        const {
            flip,
            zoom,
            height,
            colorRgb,
            colorReaction,
            colorReactionValueProvider,
        } = visualizerParams;

        const FOV_DEG = 45;
        this.initScene(FOV_DEG, this.canvas.current.width / this.canvas.current.height, zoom, args.samples.length);

        if (this.light === undefined) return;

        const N = args.samples.length;

        // Light
        {
            const angleX = O.light.angleX * Math.DEG2RAD;
            const z = (this.position.z + this.radius) + 2 * this.radius;
            this.light.position.set(0, -z * Math.sin(angleX), z * Math.cos(angleX));

            this.light.power = O.light.power;
            this.light.color.setRGB(O.light.color[0] / 255, O.light.color[1] / 255, O.light.color[2] / 255).convertSRGBToLinear();
        }

        args.samples.forEach((sample, i) => {
            if (this.left === undefined || this.right === undefined) return;

            const index = [
                flip === VisualizerFlipType.LeftChannel || flip === VisualizerFlipType.Both ? N - 1 - i : i,
                flip === VisualizerFlipType.RightChannel || flip === VisualizerFlipType.Both ? N - 1 - i : i,
            ];

            const color = [ colorRgb, colorRgb ];
            if (colorReaction !== undefined) {
                const value = colorReactionValueProvider([ sample[0], sample[1] ], i, { samplesBuffer: args.samplesBuffer, peak: args.peak });
                if (!Number.isNaN(value[0]) && !Number.isNaN(value[1])) {
                    color[0] = colorReaction(value[0]);
                    color[1] = colorReaction(value[1]);
                }
            }

            // const left = this.leftCircles[index[0]];
            const left = this.left[index[0]];
            if (!Array.isArray(left.material)) {
                left.material.dispatchEvent({ type: SET_MATERIAL_COLOR_EVENT_NAME, color: color[0] });
            }

            // const right = this.rightCircles[index[1]];
            const right = this.right[index[1]];
            if (!Array.isArray(right.material)) {
                right.material.dispatchEvent({ type: SET_MATERIAL_COLOR_EVENT_NAME, color: color[1] });
            }
        });
    }
}
