import _ from 'lodash';
import React, { CSSProperties, useMemo, useRef } from 'react';

interface SpotifyAlbumArtProps {
    style?: CSSProperties;
    className?: string;
    width: number;
    album: SpotifyAlbum;
}

// TODO: (OPTIONAL) Fetch album arts for local files from some external provider.

export default function SpotifyAlbumArt(props: SpotifyAlbumArtProps) {
    const ref = useRef<HTMLImageElement>(null);

    const src = useMemo(() => {
        const img: SpotifyImage | undefined = _.findLast(props.album.images, x => x.width !== null && x.width >= props.width) ?? props.album.images[0];
        return img?.url ?? '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ props.album.id, props.width ]);

    const style: CSSProperties = {
        width: props.width,
        height: props.width,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        ...props.style,
    };

    return (
      <img ref={ref} className={props.className} style={style} src={src} alt="" />
    );
}
