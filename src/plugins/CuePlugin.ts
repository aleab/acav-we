import _ from 'lodash';
import { RGB } from 'color-convert/conversions';

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

type CueDevice = { i: number; info: CorsairDeviceInfo };

// https://wallpaper-engine.fandom.com/wiki/Web_Wallpaper_iCUE_Reference
export default class CuePlugin implements IPlugin {
    private readonly keyboardCanvas: HTMLCanvasElement;
    private readonly mouseCanvas: HTMLCanvasElement;
    private readonly nodeCanvas: HTMLCanvasElement;

    private readonly getOptions: () => CueOptions;

    constructor(args: CueCtorArgs) {
        this.getOptions = args.getOptions;

        this.keyboardCanvas = document.createElement('canvas');
        this.keyboardCanvas.width = 100;
        this.keyboardCanvas.height = 20;

        this.mouseCanvas = document.createElement('canvas');
        this.mouseCanvas.width = 20;
        this.mouseCanvas.height = 20;

        this.nodeCanvas = document.createElement('canvas');
        this.nodeCanvas.width = 50;
        this.nodeCanvas.height = 5;

        if (window.cue === undefined) {
            Logc.warn('window.cue is undefined');
        } else {
            window.cue.getProtocolDetails(protocolDetails => {
                Logc.info(`Loaded! SDK: ${protocolDetails.sdkVersion}, server: ${protocolDetails.serverVersion}`);
            });
        }
    }

    private getEncodedImageData(canvasContext: CanvasRenderingContext2D): string {
        const imageData = canvasContext.getImageData(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
        const colorArray: number[] = [];
        for (let i = 0; i < imageData.data.length; i += 4) {
            const ipx = (i / 4) * 3;
            colorArray[ipx] = imageData.data[i];
            colorArray[ipx + 1] = imageData.data[i + 1];
            colorArray[ipx + 2] = imageData.data[i + 2];
        }
        return String.fromCharCode(...colorArray);
    }

    private getDevices(): Promise<CueDevice[]> {
        return new Promise(resolve => {
            if (window.cue === undefined) {
                resolve([]);
            } else {
                window.cue.getDeviceCount(deviceCount => {
                    if (window.cue === undefined) {
                        resolve([]);
                    } else {
                        const promises: Promise<CueDevice | undefined>[] = [];
                        for (let i = 0; i < deviceCount; ++i) {
                            const index = i;
                            promises.push(new Promise(r => {
                                if (window.cue === undefined) { r(undefined); return; }
                                window.cue.getDeviceInfo(index, deviceInfo => r(deviceInfo.capsMask.CDC_Lighting ? { i: index, info: deviceInfo } : undefined));
                            }));
                        }
                        Promise.all(promises).then(devices => resolve(devices.filter(device => device !== undefined) as CueDevice[]));
                    }
                });
            }
        });
    }

    processAudioData(_args: VisualizerRenderArgs): Promise<void> { return Promise.resolve(); }

    async processVisualizerSamplesData(visualizerReturnArgs: VisualizerRenderReturnArgs): Promise<void> {
        if (window.cue === undefined) return;
        if (visualizerReturnArgs.samples === undefined) return;

        const devices = await this.getDevices();
        if (devices.length === 0) return;

        const O = this.getOptions();

        const colorReactionValueProvider = AudioResponsiveValueProviderFactory.buildAudioResponsiveValueProvider(
            AudioResponsiveValueProvider.ValueNormalized,
            visualizerReturnArgs.colorResponseValueGain,
        );

        const startIndex = Math.round((visualizerReturnArgs.samples.length - 1) * (O.spectrumStart / 100));
        const endIndex = Math.clamp(startIndex + Math.round((visualizerReturnArgs.samples.length - startIndex) * (O.spectrumWidth / 100)), 0, visualizerReturnArgs.samples.length - 1);
        const samples = startIndex === 0 && endIndex === visualizerReturnArgs.samples.length - 1 ? visualizerReturnArgs.samples : visualizerReturnArgs.samples.slice(startIndex, endIndex + 1);

        const promises: Promise<void>[] = [];

        const keyboards = devices.filter(device => device.info.type === 'CDT_Keyboard');
        promises.push(new Promise<void>((resolve, reject) => {
            if (window.cue === undefined) { resolve(); return; }

            const keyboardCanvasContext = this.keyboardCanvas.getContext('2d');
            if (keyboardCanvasContext === null) { resolve(); return; }

            try {
                if (keyboards.length > 0) {
                    const N_BARS = 15;
                    const nSamplesPerBucket = samples.length / N_BARS;
                    const barWidth = keyboardCanvasContext.canvas.width / N_BARS;

                    let ibar = 0;
                    const bars: Array<{ value: number; n: number } | undefined> = [];

                    // Put the original N samples per channel into N_BARS buckets
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

                    keyboardCanvasContext.clearRect(0, 0, keyboardCanvasContext.canvas.width, keyboardCanvasContext.canvas.height);
                    if (visualizerReturnArgs.colorReactionType !== ColorReactionType.None) {
                        keyboardCanvasContext.setFillColorRgb(visualizerReturnArgs.color as RGB);
                        keyboardCanvasContext.fillRect(0, 0, keyboardCanvasContext.canvas.width, keyboardCanvasContext.canvas.height);
                    }

                    const values = bars.map(v => (v !== undefined ? Math.clamp(v.value / v.n, 0, 1) : 0));
                    const peak = _.max(values);

                    // Draw each bar
                    values.forEach((value, i) => {
                        const _value = value >= 0 ? value : 0;

                        const colorValue = colorReactionValueProvider([ _value, 0 ], i, { samplesBuffer: undefined, peak });
                        let color = visualizerReturnArgs.color;
                        if (visualizerReturnArgs.colorReaction !== undefined) {
                            color = visualizerReturnArgs.colorReaction(colorValue[0]);
                        }

                        const barHeight = Math.clamp(keyboardCanvasContext.canvas.height * _value * O.boost, 0, keyboardCanvasContext.canvas.height);
                        keyboardCanvasContext.setFillColorRgb(color as RGB);
                        keyboardCanvasContext.fillRect(barWidth * i, keyboardCanvasContext.canvas.height - barHeight, barWidth, barHeight);
                    });

                    window.cue.setLedColorsByImageData(keyboards.map(device => device.i), this.getEncodedImageData(keyboardCanvasContext), keyboardCanvasContext.canvas.width, keyboardCanvasContext.canvas.height);
                }
            } catch (err) {
                reject(err);
            }

            resolve();
        }));

        const mice = devices.filter(device => device.info.type === 'CDT_MouseMat');
        promises.push(new Promise<void>((resolve, reject) => {
            if (window.cue === undefined) { resolve(); return; }

            const mouseCanvasContext = this.mouseCanvas.getContext('2d');
            if (mouseCanvasContext === null) { resolve(); return; }

            try {
                if (mice.length > 0) {
                    const left = _.max(samples.getChannel(0)) ?? 0;
                    const right = _.max(samples.getChannel(1)) ?? 0;
                    const peak = Math.max(left, right);

                    mouseCanvasContext.clearRect(0, 0, mouseCanvasContext.canvas.width, mouseCanvasContext.canvas.height);
                    if (visualizerReturnArgs.colorReactionType !== ColorReactionType.None) {
                        mouseCanvasContext.setFillColorRgb(visualizerReturnArgs.color as RGB);
                        mouseCanvasContext.fillRect(0, 0, mouseCanvasContext.canvas.width, mouseCanvasContext.canvas.height);
                    }

                    const colorValue = colorReactionValueProvider([ left, right ], 0, { samplesBuffer: undefined, peak });
                    let color = [ visualizerReturnArgs.color, visualizerReturnArgs.color ];
                    if (visualizerReturnArgs.colorReaction !== undefined) {
                        color = [ visualizerReturnArgs.colorReaction(colorValue[0]), visualizerReturnArgs.colorReaction(colorValue[1]) ];
                    }

                    const barHeightLeft = Math.clamp(mouseCanvasContext.canvas.height * left * O.boost, 0, mouseCanvasContext.canvas.height);
                    mouseCanvasContext.setFillColorRgb(color[0] as RGB);
                    mouseCanvasContext.fillRect(0, mouseCanvasContext.canvas.height - barHeightLeft, mouseCanvasContext.canvas.width, barHeightLeft);

                    const barHeightRight = Math.clamp(mouseCanvasContext.canvas.height * right * O.boost, 0, mouseCanvasContext.canvas.height);
                    mouseCanvasContext.setFillColorRgb(color[1] as RGB);
                    mouseCanvasContext.fillRect(mouseCanvasContext.canvas.width / 2, mouseCanvasContext.canvas.height - barHeightRight, mouseCanvasContext.canvas.width / 2, barHeightRight);

                    window.cue.setLedColorsByImageData(mice.map(device => device.i), this.getEncodedImageData(mouseCanvasContext), mouseCanvasContext.canvas.width, mouseCanvasContext.canvas.height);
                }
            } catch (err) {
                reject(err);
            }

            resolve();
        }));

        const nodes = devices.filter(device => device.info.type === 'CDT_LightingNodePro' || device.info.type === 'CDT_CommanderPro');
        promises.push(new Promise<void>((resolve, reject) => {
            if (window.cue === undefined) { resolve(); return; }

            const nodeCanvasContext = this.nodeCanvas.getContext('2d');
            if (nodeCanvasContext === null) { resolve(); return; }

            try {
                if (mice.length > 0) {
                    const peak = _.max(samples.raw) ?? 0;

                    nodeCanvasContext.clearRect(0, 0, nodeCanvasContext.canvas.width, nodeCanvasContext.canvas.height);
                    if (visualizerReturnArgs.colorReactionType !== ColorReactionType.None) {
                        nodeCanvasContext.setFillColorRgb(visualizerReturnArgs.color as RGB);
                        nodeCanvasContext.fillRect(0, 0, nodeCanvasContext.canvas.width, nodeCanvasContext.canvas.height);
                    }

                    const colorValue = colorReactionValueProvider([ peak, 0 ], 0, { samplesBuffer: undefined, peak: 1 });
                    let color = visualizerReturnArgs.color;
                    if (visualizerReturnArgs.colorReaction !== undefined) {
                        color = visualizerReturnArgs.colorReaction(colorValue[0]);
                    }

                    const value = Math.clamp(nodeCanvasContext.canvas.width * peak * O.boost, 0, nodeCanvasContext.canvas.width);
                    nodeCanvasContext.setFillColorRgb(color as RGB);
                    nodeCanvasContext.fillRect(0, 0, value, nodeCanvasContext.canvas.height);

                    window.cue.setLedColorsByImageData(nodes.map(device => device.i), this.getEncodedImageData(nodeCanvasContext), nodeCanvasContext.canvas.width, nodeCanvasContext.canvas.height);
                }
            } catch (err) {
                reject(err);
            }

            resolve();
        }));

        const notOther = [ 'CDT_Keyboard', 'CDT_MouseMat', 'CDT_LightingNodePro', 'CDT_CommanderPro' ];
        const other = devices.filter(device => !notOther.includes(device.info.type));
        promises.push(new Promise<void>((resolve, reject) => {
            if (window.cue === undefined) { resolve(); return; }

            try {
                if (other.length > 0) {
                    const peak = _.max(samples.raw) ?? 0;

                    const colorValue = colorReactionValueProvider([ peak, 0 ], 0, { samplesBuffer: undefined, peak: 1 });
                    let color = visualizerReturnArgs.color;
                    if (visualizerReturnArgs.colorReaction !== undefined) {
                        color = visualizerReturnArgs.colorReaction(colorValue[0]);
                    }

                    window.cue.setAllLedsColorsAsync(other.map(device => device.i), { r: color[0], g: color[1], b: color[2], ledId: 0 });
                }
            } catch (err) {
                reject(err);
            }

            resolve();
        }));

        await Promise.all(promises);
    }
}
