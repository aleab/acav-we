/* eslint-disable max-classes-per-file */

import IPlugin from './IPlugin';
import CuePlugin, { CueCtorArgs } from './CuePlugin';
import TaskbarPlugin, { TaskbarPluginCtorArgs } from './TaskbarPlugin';

import VisualizerRenderArgs from '../components/visualizers/VisualizerRenderArgs';
import VisualizerRenderReturnArgs from '../components/visualizers/VisualizerRenderReturnArgs';
import AudioSamplesArray from '../common/AudioSamplesArray';

class NoopPlugin implements IPlugin {
    processAudioData(_args: VisualizerRenderArgs) { return Promise.resolve(); }
    processVisualizerSamplesData(_visualizerReturnArgs: VisualizerRenderReturnArgs) { return Promise.resolve(); }
}

export type PluginName = 'cue' | 'taskbar';
export type PluginArgs<T extends PluginName> = T extends 'cue' ? CueCtorArgs
    : T extends 'taskbar' ? TaskbarPluginCtorArgs
    : never;

export default class PluginManager {
    private readonly plugins: Map<string, { plugin: IPlugin; enabled: boolean }>;
    private readonly noop: IPlugin = new NoopPlugin();

    constructor() {
        this.plugins = new Map<string, { plugin: IPlugin; enabled: boolean }>();
    }

    processAudioData(args: VisualizerRenderArgs): Array<Promise<void>> {
        const promises: Array<Promise<void>> = [];
        this.plugins.forEach(p => {
            if (!p.enabled) return;
            promises.push(new Promise((resolve, reject) => {
                p.plugin.processAudioData(args).then(() => resolve()).catch(err => reject(err));
            }));
        });
        return promises;
    }

    processVisualizerSamplesData(visualizerReturnArgs: VisualizerRenderReturnArgs, samplesBuffer: AudioSamplesArray[] | undefined): Array<Promise<void>> {
        const promises: Array<Promise<void>> = [];
        this.plugins.forEach(p => {
            if (!p.enabled) return;
            promises.push(new Promise((resolve, reject) => {
                p.plugin.processVisualizerSamplesData(visualizerReturnArgs, samplesBuffer).then(() => resolve()).catch(err => reject(err));
            }));
        });
        return promises;
    }

    enable<T extends PluginName>(name: T, args: PluginArgs<T>): IPlugin {
        let p = this.plugins.get(name);
        if (p === undefined) {
            let plugin = this.noop;
            switch (name) {
                case 'cue': plugin = new CuePlugin(args as PluginArgs<'cue'>); break;
                case 'taskbar': plugin = new TaskbarPlugin(args as PluginArgs<'taskbar'>); break;
                default: break;
            }

            p = { enabled: true, plugin };
            this.plugins.set(name, p);
        } else {
            p.enabled = true;
        }

        return p.plugin;
    }

    disable(name: PluginName): boolean {
        const p = this.plugins.get(name);
        if (p !== undefined) {
            p.enabled = false;
        }
        return p !== undefined;
    }
}
