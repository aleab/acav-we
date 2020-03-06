import React from 'react';
import ReactDOM from 'react-dom';

import './common/index';
import './app/index';

import App from './components/App';
import Properties, { mapProperties } from './app/properties/Properties';

import './main.css';
import projectProperties from '../project.json/project.properties.json';

function run(Component: typeof App) {
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
        console.info(
            '%c' +
            '=========================================\n' +
            ' LOADING WALLPAPER\n' +
            `   NODE_ENV: "${process.env['NODE_ENV']}"\n` +
            '=========================================\n',
            'color: #350E23; font-weight:bold',
        );

        if (rootElement !== null) {
            ReactDOM.unmountComponentAtNode(rootElement);
            ReactDOM.render(<Component options={defaultProperties} windowEvents={windowEvents} />, rootElement);
        }
    };

    window.acav.reload();
}

run(App);
module.hot?.accept('./components/App', () => run(App));
