import { useEffect } from 'react';
import PluginManager, { PluginArgs, PluginName } from '../plugins/PluginManager';

export function usePlugin<T extends PluginName>(pluginManager: PluginManager, pluginName: T, enabled: boolean, args: PluginArgs<T>) {
    useEffect(() => {
        if (enabled) {
            pluginManager.enable(pluginName, args);
        }
        return () => {
            pluginManager.disable(pluginName);
        };
    }, [ args, enabled, pluginManager, pluginName ]);
}
