/* eslint-disable max-classes-per-file */

import IPlugin from './IPlugin';
import CuePlugin, { CueCtorArgs } from './CuePlugin';

import VisualizerRenderArgs from '../components/visualizers/VisualizerRenderArgs';
import VisualizerRenderReturnArgs from '../components/visualizers/VisualizerRenderReturnArgs';

class NoopPlugin implements IPlugin {
    processAudioData(_args: AudioSamplesEventArgs) { return Promise.resolve(); }
    processVisualizerSamplesData(_visualizerReturnArgs: VisualizerRenderReturnArgs) { return Promise.resolve(); }
}

export type PluginName = 'cue';
export type PluginArgs<T extends PluginName> = T extends 'cue' ? CueCtorArgs : never;

export default class PluginManager {
    private readonly plugins: Map<string, IPlugin>;
    private readonly noop: IPlugin = new NoopPlugin();

    constructor() {
        this.plugins = new Map<string, IPlugin>();
    }

    processAudioData(args: VisualizerRenderArgs): Array<Promise<void>> {
        const promises: Array<Promise<void>> = [];
        this.plugins.forEach(plugin => {
            promises.push(new Promise((resolve, reject) => {
                plugin.processAudioData(args).then(() => resolve()).catch(err => reject(err));
            }));
        });
        return promises;
    }

    processVisualizerSamplesData(visualizerReturnArgs: VisualizerRenderReturnArgs): Array<Promise<void>> {
        const promises: Array<Promise<void>> = [];
        this.plugins.forEach(plugin => {
            promises.push(new Promise((resolve, reject) => {
                plugin.processVisualizerSamplesData(visualizerReturnArgs).then(() => resolve()).catch(err => reject(err));
            }));
        });
        return promises;
    }

    enable<T extends PluginName>(name: T, args: PluginArgs<T>): IPlugin {
        let plugin = this.plugins.get(name);
        if (plugin === undefined) {
            switch (name) {
                case 'cue': plugin = new CuePlugin(args); break;
                default: return this.noop;
            }

            this.plugins.set(name, plugin);
        }

        return plugin;
    }

    disable(name: PluginName): boolean {
        return this.plugins.delete(name);
    }
}
