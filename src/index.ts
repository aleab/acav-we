import React from 'react';
import ReactDOM from 'react-dom';

import App from './App';

const _render = module.hot ? ReactDOM.render : ReactDOM.hydrate || ReactDOM.render;
const render = (Component: () => JSX.Element) => {
    _render(React.createElement(Component, null), document.getElementById('root'));
};

render(App);
