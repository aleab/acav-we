import React, { useReducer, useRef } from 'react';
import { Link, NavLink, Route, BrowserRouter as Router, Switch } from 'react-router-dom';

import { MarkGithubIcon as OcticonMarkGithub, ThreeBarsIcon as OcticonThreeBars } from '@primer/octicons-react';

import Footer from './components/Footer';
import Home from './pages/Home';
import Token from './pages/Token';
import PageNotFound from './pages/404';

export default function App() {
    const toggleRef = useRef<HTMLButtonElement>(null);
    const [ isNavActive, toggleIsNavActive ] = useReducer((prev: boolean) => !prev, false);

    const navbarNavClass = !isNavActive || (toggleRef.current?.offsetWidth ?? 0) <= 0 ? 'navbar-nav' : 'navbar-nav active';

    return (
      <Router basename={process.env.PUBLIC_URL}>
        <header className="navbar">
          <div className="container">
            <button ref={toggleRef} type="button" className="button-link navbar-toggle" onClick={toggleIsNavActive} aria-label="Toggle Menu">
              <OcticonThreeBars size={24} />
            </button>
            <Link to="/" className="navbar-title">aCAV-WE</Link>
            <a href="//github.com/aleab/acav-we" rel="external" className="navbar-link order-1" style={{ display: 'flex' }} aria-label="View on Github">
              <OcticonMarkGithub size={22} />
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

        <Footer />
      </Router>
    );
}
