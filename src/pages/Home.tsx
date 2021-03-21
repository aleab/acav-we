/* eslint-disable react/jsx-one-expression-per-line */

import React, { useCallback, useReducer, useRef } from 'react';

import Details from '../components/Details';

export default function Home() {
    const VideoAlt = ({ href }: { href: string }) => (
      <p>Your browser doesn&apos;t support HTML5 video. Here is a <a href={href}>link to the video</a> instead.</p>
    );

    const openDetail = useRef<HTMLElement>();
    const [ _currentlyOpenDetail, setCurrentlyOpenDetail ] = useReducer((_current: HTMLElement | undefined, value: HTMLElement | undefined) => {
        openDetail.current = value;
        return value;
    }, undefined);

    const onDetailsToggle = useCallback((t: HTMLElement, open: boolean) => {
        if (open) {
            if (Object.is(openDetail.current, t)) return;
            openDetail.current?.removeAttribute('open');
            setCurrentlyOpenDetail(t);
        } else if (Object.is(openDetail.current, t)) {
            setCurrentlyOpenDetail(undefined);
        }
    }, []);

    return (
      <>
        <h2 className="lead fw-4">aCAV-WE</h2>
        <blockquote>
          <p> A highly customizable audio visualizer for <a href="https://www.wallpaperengine.io/">Wallpaper Engine</a>.</p>
        </blockquote>

        <section id="features">
          <h3 className="lead">Features</h3>
          <Details toggleCallback={onDetailsToggle}>
            <summary>Extensive customization options</summary>
            <div>
              <video width="864" controls autoPlay={false}>
                <source src="./media/showcase.mp4" type="video/mp4" />
                <VideoAlt href="./media/showcase.mp4" />
              </video>
            </div>
          </Details>
          <Details toggleCallback={onDetailsToggle}>
            <summary>Spotify integration</summary>
            <div>
              <video width="864" controls autoPlay={false}>
                <source src="./media/spotify.mp4" type="video/mp4" />
                <VideoAlt href="./media/spotify.mp4" />
              </video>
            </div>
          </Details>
          <Details toggleCallback={onDetailsToggle}>
            <summary>iCUE support for RGB hardware</summary>
            <div>
              <video width="864" controls autoPlay={false}>
                <source src="./media/icue.mp4" type="video/mp4" />
                <VideoAlt href="./media/icue.mp4" />
              </video>
              <p><a href="https://www.jamendo.com/track/1719234/skyline">Skiline (2020)</a> by <a href="https://www.jamendo.com/artist/484695/samie-bower">Samie Bower</a> is licensed under <a href="https://creativecommons.org/licenses/by-nc-nd/2.0/">CC BY-NC-ND</a>.</p>
            </div>
          </Details>
        </section>

        <section id="donations">
          <h3 className="lead">Donations</h3>
          <p className="pb-0">Although absolutely not necessary, if you&apos;d like to financially support me and this project, you can do so by clicking the button below.</p>

          <form className="d-inline-block" action="https://www.paypal.com/donate" method="post" target="_blank">
            <input type="hidden" name="hosted_button_id" value="4BY2XFJXQ982S" />

            <div className="d-inline-flex flex-row-nowrap flex-align-center gap-x-2">
              <input className="button" type="submit" name="submit" value="Donate" title="PayPal - The safer, easier way to pay online!" aria-label="Donate with PayPal button" />
              <img className="unselectable" src="./media/PayPal.svg" alt="PayPal logo" height={24} />
            </div>
            <img src="https://www.paypal.com/en_US/i/scr/pixel.gif" alt="" width="1" height="1" style={{ border: 0 }} />
          </form>
        </section>
      </>
    );
}
