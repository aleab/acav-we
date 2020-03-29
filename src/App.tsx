import React from 'react';
import { hot } from 'react-hot-loader/root';
import { Route, BrowserRouter as Router, Switch } from 'react-router-dom';

function App() {
    return (
      <div className="content">
        <Router>
          <Switch>
            <Route />
          </Switch>
        </Router>
      </div>
    );
}

export default hot(App);
