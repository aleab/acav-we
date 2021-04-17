import { RGB } from 'color-convert/conversions';
import { RefObject } from 'react';
import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';

import { ThreeDVisualizerProperties } from '../../../app/properties/VisualizerProperties';
import { AudioResponsiveValueProviderFactory, AudioResponsiveValueProviderFunction } from '../../../app/AudioResponsiveValueProvider';
import { ColorReactionFactory, ColorReactionType } from '../../../app/ColorReactionType';
import { VisualizerFlipType } from '../../../app/VisualizerFlipType';
import { ThreeDimensionalVisualizerType } from '../../../app/VisualizerType';
import { WallpaperContextType } from '../../../app/WallpaperContext';

import VisualizerBaseRenderer, { VisualizerRendererOptions } from '../VisualizerBaseRenderer';
import VisualizerRenderArgs from '../VisualizerRenderArgs';
import VisualizerRenderReturnArgs from '../VisualizerRenderReturnArgs';

export type Renderer3DOptions<T extends ThreeDimensionalVisualizerType> = VisualizerRendererOptions<
    Omit<ThreeDVisualizerProperties, 'bars' | 'concircles'>,
    T extends ThreeDimensionalVisualizerType.Bars ? ThreeDVisualizerProperties['bars']
        : never
>;

export interface VisualizerParams {
    N: number;
    flip: VisualizerFlipType;
    zoom: number;
    height: number;
    colorRgb: Readonly<RGB>;
    colorReaction: ((value: number) => RGB) | undefined;
    colorReactionValueProvider: AudioResponsiveValueProviderFunction;
}

// ThreeDRenderer class

export default abstract class Renderer3D<T extends ThreeDimensionalVisualizerType> extends VisualizerBaseRenderer<Renderer3DOptions<T>> {
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
        super(context, canvas, options);
        this.scene = new Scene();
        this.camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    }

    abstract renderSamples(timestamp: number, args: VisualizerRenderArgs, visualizerParams: VisualizerParams): void;

    protected getColor(args: VisualizerRenderArgs): Readonly<RGBA> {
        const O = this.options.commonOptions;
        return (args.isSilent && O.useSilentColor ? O.silentColor : O.color) as Readonly<RGBA>;
    }

    protected initScene(vfov: number, aspect: number, zoom: number, nSamples: number) {
        this.camera.fov = vfov;
        this.camera.zoom = zoom;
        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
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

            if (args.isSilent && this.options.commonOptions.hideWhenSilent) {
                return renderReturnArgs;
            }

            const flipFrequencies = Ov.current.flip;
            const zoom = Math.clamp(O.zoom / 100, 0.001, 1);

            const colorRgba = this.getColor(args);
            const colorRgb: Readonly<RGB> = [ colorRgba[0], colorRgba[1], colorRgba[2] ];
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
                flip: flipFrequencies,
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

    clear() {
        if (this.canvas.current === null) return;
        if (this.renderer === undefined) return;
        this.renderer.clear();
    }
}
