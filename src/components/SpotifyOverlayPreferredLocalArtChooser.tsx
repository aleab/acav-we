import { DBSchema } from 'idb';
import React, { RefObject, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import SimpleBar from 'simplebar-react';

import { FaCheckCircle } from '../fa';
import MusicTrack, { getAlbumHashCode } from '../app/MusicTrack';
import PreferredLocalArtStore from '../app/PreferredLocalArtStore';
import { MusicbrainzReleaseCoverArt } from '../services/musicbrainz-client';

interface PreferredLocalArtDB extends DBSchema {
    'preferences': {
        key: number;
        value: string | undefined;
    };
}

export interface SpotifyOverlayPreferredLocalArtChooserProps {
    track: MusicTrack | undefined;
    mbReleaseCoverArts: MusicbrainzReleaseCoverArt[] | null;
    currentMbReleaseCoverArt: string | null;
    store: PreferredLocalArtStore;
    choosePreferredArtCallback: (mbReleaseCoverArt: MusicbrainzReleaseCoverArt) => void;

    width: number;
    maxHeight: number;
    hidden: boolean;

    portalElementRef: RefObject<HTMLElement>;
}

export default function SpotifyOverlayPreferredLocalArtChooser(props: SpotifyOverlayPreferredLocalArtChooserProps) {
    const { track, mbReleaseCoverArts, store, choosePreferredArtCallback } = props;

    const onSelected = useCallback((id: string) => {
        if (track === undefined) return;
        if (mbReleaseCoverArts === null || mbReleaseCoverArts.length === 0) return;

        const trackId = getAlbumHashCode(track);
        store.set(trackId, id);

        const coverArt = mbReleaseCoverArts.find(v => v.release === id);
        if (coverArt !== undefined) {
            choosePreferredArtCallback(coverArt);
        }
    }, [ choosePreferredArtCallback, mbReleaseCoverArts, store, track ]);

    const covers = useMemo(() => {
        return mbReleaseCoverArts !== null && mbReleaseCoverArts.length > 1 ? mbReleaseCoverArts.map(v => {
            const smallest = v.cover.reduce((s, current) => (current.size < s.size ? current : s), v.cover[0]);
            const isSelected = props.currentMbReleaseCoverArt === v.release;
            return (
              // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
              <div key={v.release} className={isSelected ? 'mb-cover selected' : 'mb-cover'} onClick={isSelected ? undefined : (() => onSelected(v.release))}>
                <img src={smallest.url} alt="" width={64} height={64} style={{ objectFit: 'contain' }} />
                {isSelected ? <span className="selected-mark"><FaCheckCircle color="#227F25" /></span> : null}
              </div>
            );
        }) : null;
    }, [ mbReleaseCoverArts, onSelected, props.currentMbReleaseCoverArt ]);

    return props.portalElementRef.current !== null ? ReactDOM.createPortal((
      <div id="mb-plac">
        <SimpleBar style={{ maxHeight: (props.hidden ? 0 : props.maxHeight), width: props.width }}>
          <div className="mb-plac-content">
            {covers}
          </div>
        </SimpleBar>
      </div>
    ), props.portalElementRef.current) : null;
}
