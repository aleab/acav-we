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
          <section className="container">
            <nav>
              <ul className="navbar-list">
                <li className="navbar-item">
                  <NavLink exact to="/" className="navbar-link" activeClassName="active">Home</NavLink>
                </li>
                <li className="navbar-item">
                  <NavLink to="/token" className="navbar-link" activeClassName="active">Token</NavLink>
                </li>
              </ul>
            </nav>
          </section>
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
