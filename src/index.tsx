import React from 'react';
import ReactDOM from 'react-dom';

import Wallpaper from './components/Wallpaper';
import Properties, { mapProperties } from './app/properties/Properties';

import projectProperties from '../project.json/project.properties.json';

import './common/index';
import './app/index';
import Log from './common/Log';

function run(Component: typeof Wallpaper) {
    const onresizeEventSubs = new Set<(args: {}) => void>();
    const windowEvents: WindowEvents = {
        onresize: {
            subscribe: callback => { onresizeEventSubs.add(callback); },
            unsubscribe: callback => { onresizeEventSubs.delete(callback); },
        },
    };

    window.onresize = () => {
        onresizeEventSubs.forEach(callback => callback({}));
    };

    const defaultProperties = mapProperties(projectProperties) as Properties;
    const rootElement = document.getElementById('root');

    window.acav.reload = () => {
        Log.info(
            '%c' +
            '========================================\n' +
            'LOADING WALLPAPER\n' +
            `  NODE_ENV: "${process.env['NODE_ENV']}"\n` +
            '========================================\n',
            'color: #350E23; font-weight:bold',
        );

        if (rootElement !== null) {
            ReactDOM.unmountComponentAtNode(rootElement);
            ReactDOM.render(<Component options={defaultProperties} windowEvents={windowEvents} />, rootElement);
        }
    };

    window.acav.reload();
}

run(Wallpaper);
module.hot?.accept('./components/Wallpaper', () => run(Wallpaper));
