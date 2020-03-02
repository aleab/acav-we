interface Window {
    acav: {
        reload?: () => void;
        getProperties?: () => import('../app/properties/Properties').default;
        getSamples?: () => number[];
        togglePauseAudioListener?: () => void;
    };
}
