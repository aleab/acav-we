import { MutableRefObject, useEffect, useRef, useState } from 'react';

import IPlugin from '../plugins/IPlugin';
import PluginManager, { PluginArgs, PluginName } from '../plugins/PluginManager';

export function usePlugin<T extends PluginName>(pluginManager: PluginManager, pluginName: T, enabled: boolean, args: PluginArgs<T>): IPlugin | null {
    const [ plugin, setPlugin ] = useState<IPlugin | null>(null);

    useEffect(() => {
        if (enabled) {
            setPlugin(pluginManager.enable(pluginName, args));
        }
        return () => {
            pluginManager.disable(pluginName);
            setPlugin(null);
        };
    }, [ args, enabled, pluginManager, pluginName ]);

    return plugin;
}
