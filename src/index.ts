import React from 'react';
import ReactDOM from 'react-dom';

import App from './App';

// CSS
import 'normalize.css';
import 'milligram';
import './app.css';

ReactDOM.render(React.createElement(App, null), document.getElementById('root'));

const noscripts =  document.getElementsByTagName('noscript');
for (let i = 0; i < noscripts.length; ++i) {
    noscripts.item(i)?.remove();
}
