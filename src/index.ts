import React from 'react';
import ReactDOM from 'react-dom';

import App from './App';

const render = (Component: () => JSX.Element) => {
    ReactDOM.render(React.createElement(Component, null), document.getElementById('root'));
};

render(App);
