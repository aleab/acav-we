import _ from 'lodash';
import { RGB } from 'color-convert/conversions';

import { createNullActor } from 'xstate/lib/Actor';
import Log from '../common/Log';
import VisualizerRenderArgs from '../components/visualizers/VisualizerRenderArgs';
import VisualizerRenderReturnArgs from '../components/visualizers/VisualizerRenderReturnArgs';

import IPlugin from './IPlugin';
import { ColorReactionType } from '../app/ColorReactionType';
import { AudioResponsiveValueProvider, AudioResponsiveValueProviderFactory } from '../app/AudioResponsiveValueProvider';

const Logc = Log.getLogger('iCUE Plugin', 'black');

type CueOptions = {
    boost: number;
    spectrumStart: number;
    spectrumWidth: number;
};
export type CueCtorArgs = {
    getOptions: () => CueOptions;
};

// https://wallpaper-engine.fandom.com/wiki/Web_Wallpaper_iCUE_Reference
export default class CuePlugin implements IPlugin {
    private readonly cueCanvas: HTMLCanvasElement;
    private readonly getOptions: () => CueOptions;

    constructor(args: CueCtorArgs) {
        this.getOptions = args.getOptions;

        this.cueCanvas = document.createElement('canvas');
        this.cueCanvas.width = 100;
        this.cueCanvas.height = 20;

        if (window.cue === undefined) {
            Logc.warn('window.cue is undefined');
        } else {
            window.cue.getProtocolDetails(protocolDetails => {
                Logc.info(`Loaded! SDK: ${protocolDetails.sdkVersion}, server: ${protocolDetails.serverVersion}`);
            });
        }
    }

    private getEncodedImageData(): string {
        const cueCanvasContext = this.cueCanvas.getContext('2d');
        if (cueCanvasContext === null) return '';

        const imageData = cueCanvasContext.getImageData(0, 0, cueCanvasContext.canvas.width, cueCanvasContext.canvas.height);
        const colorArray: number[] = [];
        for (let i = 0; i < imageData.data.length; i += 4) {
            const ipx = (i / 4) * 3;
            colorArray[ipx] = imageData.data[i];
            colorArray[ipx + 1] = imageData.data[i + 1];
            colorArray[ipx + 2] = imageData.data[i + 2];
        }
        return String.fromCharCode(...colorArray);
    }

    private getDeviceIndexes(): Promise<number[]> {
        return new Promise(resolve => {
            if (window.cue === undefined) {
                resolve([]);
            } else {
                window.cue.getDeviceCount(deviceCount => {
                    if (window.cue === undefined) {
                        resolve([]);
                    } else {
                        const promises: Promise<number | undefined>[] = [];
                        for (let i = 0; i < deviceCount; ++i) {
                            const index = i;
                            promises.push(new Promise(r => {
                                if (window.cue === undefined) { r(undefined); return; }
                                window.cue.getDeviceInfo(index, deviceInfo => r(deviceInfo.capsMask.CDC_Lighting ? index : undefined));
                            }));
                        }
                        Promise.all(promises).then(ids => resolve(ids.filter(id => id !== undefined) as number[]));
                    }
                });
            }
        });
    }

    processAudioData(_args: VisualizerRenderArgs): Promise<void> { return Promise.resolve(); }

    async processVisualizerSamplesData(visualizerReturnArgs: VisualizerRenderReturnArgs): Promise<void> {
        if (window.cue === undefined) return;
        if (visualizerReturnArgs.samples === undefined) return;

        const cueCanvasContext = this.cueCanvas.getContext('2d');
        if (cueCanvasContext === null) return;

        const ids = await this.getDeviceIndexes();
        if (ids.length === 0) return;

        const O = this.getOptions();

        const startIndex = Math.round((visualizerReturnArgs.samples.length - 1) * (O.spectrumStart / 100));
        const endIndex = Math.clamp(startIndex + Math.round((visualizerReturnArgs.samples.length - startIndex) * (O.spectrumWidth / 100)), 0, visualizerReturnArgs.samples.length - 1);
        const samples = startIndex === 0 && endIndex === visualizerReturnArgs.samples.length - 1 ? visualizerReturnArgs.samples : visualizerReturnArgs.samples.slice(startIndex, endIndex + 1);

        const N_BARS = 15;
        const nSamplesPerBucket = samples.length / N_BARS;
        const barWidth = cueCanvasContext.canvas.width / N_BARS;

        let ibar = 0;
        const bars: Array<{ value: number; n: number } | undefined> = [];

        samples.forEach((sample, i) => {
            if (i >= Math.floor((ibar + 1) * nSamplesPerBucket)) {
                ibar++;
            }

            const s = _.mean(sample);
            const bar = bars[ibar];
            if (bar === undefined) {
                bars[ibar] = { value: s, n: 1 };
            } else {
                bar.value += s;
                bar.n++;
            }
        });

        cueCanvasContext.clearRect(0, 0, cueCanvasContext.canvas.width, cueCanvasContext.canvas.height);
        if (visualizerReturnArgs.colorReactionType !== ColorReactionType.None) {
            cueCanvasContext.setFillColorRgb(visualizerReturnArgs.color as RGB);
            cueCanvasContext.fillRect(0, 0, cueCanvasContext.canvas.width, cueCanvasContext.canvas.height);
        }

        const values = bars.map(v => (v !== undefined ? Math.clamp(v.value / v.n, 0, 1) : 0));
        const peak = _.max(values);

        values.forEach((value, i) => {
            const _value = value >= 0 ? value : 0;

            const colorReactionValueProvider = AudioResponsiveValueProviderFactory.buildAudioResponsiveValueProvider(
                AudioResponsiveValueProvider.ValueNormalized,
                visualizerReturnArgs.colorResponseValueGain,
            );
            const colorValue = colorReactionValueProvider([ _value, 0 ], i, { samplesBuffer: undefined, peak });
            let color = visualizerReturnArgs.color;
            if (visualizerReturnArgs.colorReaction !== undefined) {
                color = visualizerReturnArgs.colorReaction(colorValue[0]);
            }

            const barHeight = Math.clamp(cueCanvasContext.canvas.height * _value * O.boost, 0, cueCanvasContext.canvas.height);

            cueCanvasContext.setFillColorRgb(color as RGB);
            cueCanvasContext.fillRect(barWidth * i, cueCanvasContext.canvas.height - barHeight, barWidth, barHeight);
        });

        window.cue.setLedColorsByImageData(ids, this.getEncodedImageData(), cueCanvasContext.canvas.width, cueCanvasContext.canvas.height);
    }
}
