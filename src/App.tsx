import React from 'react';
import { NavLink, Route, BrowserRouter as Router, Switch } from 'react-router-dom';

// Components
import Home from './pages/Home';
import Token from './pages/Token';
import PageNotFound from './pages/404';

// CSS
import 'normalize.css';
import 'milligram';
import './app.css';

export default function App() {
    return (
      <Router>
        <header className="navbar">
          <div className="container">
            <div className="navbar-item">
              <nav className="navbar-nav">
                <NavLink exact to="/" className="nav-item nav-link" activeClassName="active">Home</NavLink>
                <NavLink to="/token" className="nav-item nav-link" activeClassName="active">Token</NavLink>
              </nav>
            </div>
          </div>
        </header>
        <main className="container">
          <Switch>
            <Route exact path="/" component={Home} />
            <Route path="/token" component={Token} />
            <Route path="*" component={PageNotFound} />
          </Switch>
        </main>
      </Router>
    );
}
