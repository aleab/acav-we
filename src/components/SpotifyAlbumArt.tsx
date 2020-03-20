import _ from 'lodash';
import React, { CSSProperties, useMemo } from 'react';

interface SpotifyAlbumArtProps {
    style?: CSSProperties;
    className?: string;
    width: string;
    album: SpotifyAlbum;
}

export default function SpotifyAlbumArt(props: SpotifyAlbumArtProps) {
    const srcset = useMemo(() => {
        return  _.reduceRight<SpotifyImage, string[]>(props.album.images, (acc, curr) => {
            if (curr.url && curr.width) {
                acc.push(`${curr.url} ${curr.width}w`);
            }
            return acc;
        }, []).join(', ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.album.id]);

    const style: CSSProperties = {
        width: props.width,
        height: props.width,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        ...props.style,
    };

    return (
      <img className={props.className} style={style} srcSet={srcset} sizes={props.width} alt="" />
    );
}
