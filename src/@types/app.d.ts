interface ACAV {
    reload?: () => void;
    getProperties?: () => import('../app/properties/Properties').default;

    getSamples?: () => number[];
    togglePauseAudioListener?: () => void;
    resetAudioListener?: () => void;
    startPreview?: (ms: number) => void;

    refreshSpotifyToken?: () => void;
}

interface Window {
    acav: ACAV;
}

declare module '*.svg' {
    const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
    export default content;
}
