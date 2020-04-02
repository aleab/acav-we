import React, { useReducer, useRef } from 'react';
import { Link, NavLink, Route, BrowserRouter as Router, Switch } from 'react-router-dom';

import OcticonMarkGithub from '@primer/octicons/build/svg/mark-github.svg';
import OcticonThreeBars from '@primer/octicons/build/svg/three-bars.svg';

// Components
import Home from './pages/Home';
import Token from './pages/Token';
import PageNotFound from './pages/404';

// CSS
import 'normalize.css';
import 'milligram';
import './app.css';

export default function App() {
    const toggleRef = useRef<HTMLButtonElement>(null);
    const [ isNavActive, toggleIsNavActive ] = useReducer((prev: boolean) => !prev, false);

    const navbarNavClass = !isNavActive || (toggleRef.current?.offsetWidth ?? 0) <= 0 ? 'navbar-nav' : 'navbar-nav active';

    return (
      <Router>
        <header className="navbar">
          <div className="container">
            <button ref={toggleRef} type="button" className="button-link navbar-toggle" onClick={toggleIsNavActive} aria-label="Toggle Menu">
              <OcticonThreeBars className="octicon" style={{ fontSize: '1.5rem' }} />
            </button>
            <Link to="/" className="navbar-title">aCAV-WE</Link>
            <a href="//github.com/aleab/acav-we" rel="external" className="navbar-link order-1" style={{ display: 'flex' }} aria-label="View on Github">
              <OcticonMarkGithub className="octicon" style={{ fontSize: '1.375rem' }} />
            </a>
            <nav className={`${navbarNavClass} ml-80-auto order-2 order-80-none`}>
              <NavLink to="/token" className="nav-item nav-link" activeClassName="active">Token</NavLink>
            </nav>
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
