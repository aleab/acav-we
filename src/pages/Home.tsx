/* eslint-disable react/jsx-one-expression-per-line */

import React from 'react';

import Details from '../components/Details';

export default function Home() {
    const VideoAlt = ({ href }: { href: string }) => (
      <p>Your browser doesn&apos;t support HTML5 video. Here is a <a href={href}>link to the video</a> instead.</p>
    );

    return (
      <>
        <h2 className="lead fw-4">aCAV-WE</h2>
        <blockquote>
          <p> A highly customizable audio visualizer for <a href="https://www.wallpaperengine.io/">Wallpaper Engine</a>.</p>
        </blockquote>

        <h3 className="lead">Features</h3>
        <Details>
          <summary>Extensive customization options</summary>
          <video width="864" controls autoPlay={false}>
            <source src="./media/showcase.mp4" type="video/mp4" />
            <VideoAlt href="./media/showcase.mp4" />
          </video>
        </Details>
        <Details>
          <summary>Spotify integration</summary>
          <video width="864" controls autoPlay={false}>
            <source src="./media/spotify.mp4" type="video/mp4" />
            <VideoAlt href="./media/spotify.mp4" />
          </video>
        </Details>
      </>
    );
}
