import { MutableRefObject, useEffect, useRef } from 'react';

import IPlugin from '../plugins/IPlugin';
import PluginManager, { PluginArgs, PluginName } from '../plugins/PluginManager';

export function usePlugin<T extends PluginName>(pluginManager: PluginManager, pluginName: T, enabled: boolean, args: PluginArgs<T>): MutableRefObject<IPlugin | null> {
    const plugin = useRef<IPlugin | null>(null);

    useEffect(() => {
        if (enabled) {
            plugin.current = pluginManager.enable(pluginName, args);
        }
        return () => {
            pluginManager.disable(pluginName);
        };
    }, [ args, enabled, pluginManager, pluginName ]);

    return plugin;
}
