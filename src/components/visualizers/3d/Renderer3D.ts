import { RGB } from 'color-convert/conversions';
import { MutableRefObject, RefObject } from 'react';
import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';

import { ThreeDVisualizerProperties, VisualizerProperties } from '../../../app/properties/VisualizerProperties';
import { AudioResponsiveValueProviderFactory, AudioResponsiveValueProviderFunction } from '../../../app/AudioResponsiveValueProvider';
import { ColorReactionFactory, ColorReactionType } from '../../../app/ColorReactionType';
import { ThreeDimensionalVisualizerType } from '../../../app/VisualizerType';
import { WallpaperContextType } from '../../../app/WallpaperContext';

import VisualizerRenderArgs from '../VisualizerRenderArgs';
import VisualizerRenderReturnArgs from '../VisualizerRenderReturnArgs';

import Log from '../../../common/Log';

export interface Renderer3DOptions<T extends ThreeDimensionalVisualizerType> {
    visualizerOptions: MutableRefObject<DeepReadonly<VisualizerProperties>>;
    readonly commonOptions: DeepReadonly<Omit<ThreeDVisualizerProperties, 'bars'>>;
    readonly options: DeepReadonly<T extends ThreeDimensionalVisualizerType.Bars ? ThreeDVisualizerProperties['bars']
        : never>;
}

export interface VisualizerParams {
    N: number;
    flipFrequencies: boolean;
    zoom: number;
    height: number;
    colorRgb: Readonly<RGB>;
    colorReaction: ((value: number) => RGB) | undefined;
    colorReactionValueProvider: AudioResponsiveValueProviderFunction;
}

export interface I3DRenderer {
    render(timestamp: number, args: VisualizerRenderArgs): VisualizerRenderReturnArgs | null;
}

// ThreeDRenderer class

export default abstract class Renderer3D<T extends ThreeDimensionalVisualizerType> implements I3DRenderer {
    protected readonly context: WallpaperContextType;
    protected readonly canvas: RefObject<HTMLCanvasElement>;
    protected readonly options: Renderer3DOptions<T>;

    private _renderer: WebGLRenderer | undefined;
    protected get renderer(): WebGLRenderer | undefined {
        if (this._renderer === undefined && this.canvas.current !== null) {
            this._renderer = new WebGLRenderer({
                canvas: this.canvas.current || undefined,
                antialias: true,
                alpha: true,
                precision: 'highp',
            });
            this._renderer.physicallyCorrectLights = true;
            this._renderer.setSize(this.canvas.current.width, this.canvas.current.height);
            this._renderer.setClearColor(0, 0);
        }
        return this._renderer;
    }

    protected readonly scene: Scene;
    protected readonly camera: PerspectiveCamera;

    constructor(
        context: WallpaperContextType,
        canvas: RefObject<HTMLCanvasElement>,
        options: Renderer3DOptions<T>,
    ) {
        this.context = context;
        this.canvas = canvas;
        this.options = options;

        this.scene = new Scene();
        this.camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    }

    abstract getHeight(maxHeight: number): number;
    abstract renderSamples(timestamp: number, args: VisualizerRenderArgs, visualizerParams: VisualizerParams): void;

    protected initScene(vfov: number, aspect: number, zoom: number, nSamples: number) {
        this.camera.fov = vfov * zoom;
        this.camera.aspect = aspect;
        this.camera.position.z = 1;
    }

    render(timestamp: number, args: VisualizerRenderArgs): VisualizerRenderReturnArgs | null {
        if (this.canvas.current === null) return null;
        if (this.renderer === undefined) return null;

        let renderReturnArgs: VisualizerRenderReturnArgs | null = null;

        this.renderer.clear();
        if (!this.context.wallpaperProperties.audioprocessing) {
            args.samples?.clear();
        } else if (args.samples) {
            const N = args.samples.length;

            const Ov = this.options.visualizerOptions;
            const O = this.options.commonOptions;

            const flipFrequencies = Ov.current.flipFrequencies;
            const zoom = Math.clamp(O.zoom / 100, 0.001, 1);

            const colorRgb: Readonly<RGB> = [ O.color[0], O.color[1], O.color[2] ];
            const colorReaction = Ov.current.responseType !== ColorReactionType.None
                ? ColorReactionFactory.buildColorReaction(Ov.current.responseType, {
                    fromRgb: colorRgb,
                    toRgb: [ Ov.current.responseToHue[0], Ov.current.responseToHue[1], Ov.current.responseToHue[2] ],
                    degree: Ov.current.responseDegree,
                    range: Ov.current.responseRange,
                }) : undefined;
            const colorReactionValueProvider = AudioResponsiveValueProviderFactory.buildAudioResponsiveValueProvider(Ov.current.responseProvider, Ov.current.responseValueGain);

            const height = this.getHeight(1);

            this.renderSamples(timestamp, args, {
                N,
                flipFrequencies,
                zoom,
                height,
                colorRgb,
                colorReaction,
                colorReactionValueProvider,
            });

            this.renderer.render(this.scene, this.camera);

            renderReturnArgs = {
                samples: args.samples,
                color: colorRgb,
                colorReactionType: Ov.current.responseType,
                colorReaction,
                colorResponseValueGain: Ov.current.responseValueGain,
            };
        }

        return renderReturnArgs;
    }
}
