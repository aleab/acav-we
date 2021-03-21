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
      </>
    );
}
