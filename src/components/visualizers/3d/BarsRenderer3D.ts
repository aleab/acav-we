import _ from 'lodash';
import { BoxGeometry, Mesh, MeshLambertMaterial, PointLight } from 'three';

import { VisualizerFlipType } from '../../../app/VisualizerFlipType';
import { ThreeDimensionalVisualizerType } from '../../../app/VisualizerType';
import VisualizerRenderArgs from '../VisualizerRenderArgs';
import Renderer3D, { VisualizerParams } from './Renderer3D';

const SET_MATERIAL_COLOR_EVENT_NAME = 'setMaterialColor';
function setMaterialColor(material: MeshLambertMaterial, color: readonly [number, number, number]) {
    material.color.setRGB(color[0] / 255, color[1] / 255, color[2] / 255);
}

export default class BarsRenderer3D extends Renderer3D<ThreeDimensionalVisualizerType.Bars> {
    getHeight(maxHeight: number): number {
        return maxHeight * (this.options.options.height / 100);
    }

    private light: PointLight | undefined;
    private leftBars: Array<Mesh> | undefined;
    private rightBars: Array<Mesh> | undefined;

    private initBars(side: 'left' | 'right', nSamples: number) {
        if (this.scene === undefined) return;

        let init = true;
        if (side === 'left' && (this.leftBars === undefined || this.leftBars.length !== nSamples)) {
            if (this.leftBars !== undefined) {
                this.scene?.remove(...this.leftBars);
            }
            this.leftBars = [];
        } else if (side === 'right' && (this.rightBars === undefined || this.rightBars.length !== nSamples)) {
            if (this.rightBars !== undefined) {
                this.scene.remove(...this.rightBars);
            }
            this.rightBars = [];
        } else {
            init = false;
        }

        if (init) {
            for (let i = 0; i < nSamples; ++i) {
                const geometry = new BoxGeometry(1, 1, 1);
                const material = new MeshLambertMaterial({ color: 0x000, emissive: 0x000, reflectivity: 0.5 });
                material.addEventListener(SET_MATERIAL_COLOR_EVENT_NAME, event => {
                    const _color = event['color'];
                    if (Array.isArray(_color) && _color.length === 3 && typeof _color[0] === 'number') {
                        setMaterialColor(event.target as MeshLambertMaterial, _color as [number, number, number]);
                    }
                });

                const mesh = new Mesh(geometry, material);
                mesh.position.set(0, 0, -1000);

                (side === 'left' ? this.leftBars : this.rightBars)!.push(mesh);
                this.scene.add(mesh);
            }
        }
    }

    protected initScene(vfov: number, aspect: number, zoom: number, nSamples: number) {
        super.initScene(vfov, aspect, zoom, nSamples);

        this.camera.position.z = 1;

        if (this.light === undefined) {
            this.light = new PointLight(0xFFFFFF, 1, 0, 2);
            this.light.castShadow = true;
            this.scene.add(this.light);
        }

        this.initBars('left', nSamples);
        this.initBars('right', nSamples);
    }

    private findBarsPositionLine(vfov: number, vHeight: number, vWidth: number, N: number) {
        const O = this.options.options;

        /* =====================================================================================
         *  https://i.vgy.me/92lppE.png
         * =====================================================================================
         * P0 – bottom-left end of the segment along which the right-side bars will be placed
         * P1 – top-right end ...
         *
         * D = distance(P0, P1)
         * N – number of bars
         * k – percentual width of each bar
         * λ – bar width = k∙(D/N)
         * s – distance between the closest sides of any two consecutive bars
         *
         * ϕx – local rotation of the bars' line around the X axis
         * ϕy – rotation of the bars' line around the Y axis
         *
         * y0 – distance of P0 from the bottom of the screen
         * δx – distance of P1 from the right side of the screen
         * δy – distance of P1 from the top of the screen
         * ===================================================================================== */
        /*   | Y
         *   |
         *   |
         *   o——————— X
         *  /
         * / Z
         */

        const ϕx = O.phiX * Math.DEG2RAD;
        const ϕy = -O.phiY * Math.DEG2RAD;

        const F = vfov;
        const R = vWidth / vHeight;
        const T = Math.tan(ϕy) * Math.tan(F / 2);

        const y0 = (O.y0 / 100) * vHeight;
        const δx = (O.deltaX / 100) * vWidth;
        const δy = (O.deltaY / 100) * vHeight;

        const ax = 1 / N + ((R * T) / (1 - R * T)) / N;
        const bx = 0.5 * vWidth - δx + ((0.5 * vWidth - δx) / (1 - R * T)) * (R * T);
        const ay = (T / (1 - R * T)) / N;
        const by = vHeight - δy - y0 + ((0.5 * vWidth - δx) / (1 - R * T)) * T;

        const A = (ax / Math.cos(ϕy)) ** 2 + ay ** 2 - 1;
        const B = -((2 * (ax / (Math.cos(ϕy) ** 2)) * bx) + (2 * ay * by));
        const C = (bx / Math.cos(ϕy)) ** 2 + by ** 2;

        const D1 = (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A);
        const D2 = (-B - Math.sqrt(B * B - 4 * A * C)) / (2 * A);
        const D = D1 > 0 && D2 > 0 ? Math.min(D1, D2) : (D1 < 0 ? D2 : D1);

        const Δx = -ax * D + bx;
        const Δy = -ay * D + by;
        const z1 = Δx * Math.tan(ϕy);
        const vHeightFar = 2 * z1 * Math.tan(F / 2);
        const vWidthFar = vHeightFar * R;

        const p0 = [ D / N, -0.5 * vHeight + y0, 0 ];
        const p1 = [
            0.5 * vWidth - δx + 0.5 * vWidthFar,
            0.5 * vHeight - δy + 0.5 * vHeightFar,
            z1,
        ];

        const ϕz = -Math.asin(Δy / D);

        return { p0, p1, z1, D, ϕx, ϕy, ϕz };
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
        if (this.leftBars === undefined) return;
        if (this.rightBars === undefined) return;

        const vfov = (FOV_DEG * zoom) * Math.DEG2RAD;

        // Visible part of the screen in scene units @ zoom=1
        const vHeight = 2 * this.camera.position.z * Math.tan(vfov / 2);
        const vWidth = vHeight * this.camera.aspect;

        const N = args.samples.length;
        const { p0, p1, z1, D, ϕx, ϕy, ϕz } = this.findBarsPositionLine(vfov, vHeight, vWidth, N);

        const k = O.width / 100;
        const λ = (D / N) * k;
        const s = (D - N * λ) / (N - 1);

        // Light
        {
            const angleX = -O.light.angleX * Math.DEG2RAD;
            this.light.position.set(0, -this.camera.position.z * Math.sin(angleX), this.camera.position.z * Math.cos(angleX));

            this.light.power = O.light.power;
            this.light.distance = 2 * (this.camera.position.z + Math.abs(z1));
            this.light.color.setRGB(O.light.color[0] / 255, O.light.color[1] / 255, O.light.color[2] / 255);
        }

        args.samples.forEach((sample, i) => {
            if (this.leftBars === undefined || this.rightBars === undefined) return;

            const index = [
                flip === VisualizerFlipType.LeftChannel || flip === VisualizerFlipType.Both ? args.samples!.length - 1 - i : i,
                flip === VisualizerFlipType.RightChannel || flip === VisualizerFlipType.Both ? args.samples!.length - 1 - i : i,
            ];
            const t = [
                (λ / 2 + (s + λ) * index[0]) / D,
                (λ / 2 + (s + λ) * index[1]) / D,
            ];

            const color = [ colorRgb, colorRgb ];
            if (colorReaction !== undefined) {
                const value = colorReactionValueProvider([ sample[0], sample[1] ], i, { samplesBuffer: args.samplesBuffer, peak: args.peak });
                if (!Number.isNaN(value[0]) && !Number.isNaN(value[1])) {
                    color[0] = colorReaction(value[0]);
                    color[1] = colorReaction(value[1]);
                }
            }

            // right
            const rPosition = [
                p0[0] + t[1] * (p1[0] - p0[0]),
                p0[1] + t[1] * (p1[1] - p0[1]),
                p0[2] + t[1] * (p1[2] - p0[2]),
            ];
            {
                const value = Math.max(sample[1], Number.EPSILON);
                const right = this.rightBars[i];

                if (value === 0) {
                    right.position.set(0, 0, -1000);
                    right.scale.set(0, 0, 0);
                } else {
                    right.position.set(rPosition[0], rPosition[1], rPosition[2]);
                    right.scale.set(λ, value * height, λ);

                    right.rotation.set(0, -ϕy, -ϕz);
                    right.rotateX(ϕx);
                    right.translateY((value * height) / 2);

                    if (!Array.isArray(right.material)) {
                        right.material.dispatchEvent({ type: SET_MATERIAL_COLOR_EVENT_NAME, color: color[1] });
                    }
                }
            }

            // left
            const lPosition = [
                -(p0[0] + t[0] * (p1[0] - p0[0])),
                p0[1] + t[0] * (p1[1] - p0[1]),
                p0[2] + t[0] * (p1[2] - p0[2]),
            ];
            {
                const value = Math.max(sample[0], Number.EPSILON);
                const left = this.leftBars[i];

                if (value === 0) {
                    left.position.set(0, 0, -1000);
                    left.scale.set(0, 0, 0);
                } else {
                    left.position.set(lPosition[0], lPosition[1], lPosition[2]);
                    left.scale.set(λ, value * height, λ);

                    left.rotation.set(0, ϕy, ϕz);
                    left.rotateX(ϕx);
                    left.translateY((value * height) / 2);

                    if (!Array.isArray(left.material)) {
                        left.material.dispatchEvent({ type: SET_MATERIAL_COLOR_EVENT_NAME, color: color[0] });
                    }
                }
            }
        });
    }
}
