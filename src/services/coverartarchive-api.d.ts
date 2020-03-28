// https://musicbrainz.org/doc/Cover_Art/Types
type CoverArtType =
      'Front' // The album cover, this is the front of the packaging of an audio recording (or in the case of a digital release the image associated with it in a digital media store)
    | 'Back' // The back of the package of an audio recording
    | 'Booklet' // A small book or group of pages inserted into the compact disc or DVD jewel case
    | 'Medium' // The medium contains the audio recording
    | 'Tray' // The image behind or on the tray containing the medium
    | 'Obi' // An obi is a strip of paper around the spine (or occasionally one of the other edges of the packaging)
    | 'Spine' // A spine is the edge of the package of an audio recording
    | 'Track' // Digital releases sometimes have cover art associated with each individual track of a release
    | 'Liner' // A liner is a protective sleeve surrounding a medium
    | 'Sticker' // A sticker is an adhesive piece of paper, that is attached to the plastic film or enclosed inside the packaging
    | 'Poster' // A poster included with a release
    | 'Watermark' // A watermark is a piece of text or an image which is not part of the cover art but is added by the person who scanned the cover art
    | 'RawUnedited'
    | 'Other';

interface CoverArtImage {
    types: CoverArtType[];
    front: boolean;
    back: boolean;
    edit: number;
    image: string;
    comment: string;
    approved: boolean;
    id: string;
    thumbnails: {
        '250'?: string;
        '500'?: string;
        '1200'?: string;
        small?: string;
        large?: string;
    };
}

interface CoverArtList {
    images?: CoverArtImage[];
    release: string;
}
