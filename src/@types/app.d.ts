interface ACAV {
    reload?(): void;
    getProperties?(): import('../app/properties/Properties').default;

    getSamples?(): number[];
    togglePauseAudioListener?(): void;
    resetAudioListener?(): void;
    startPreview?(ms: number, mergeToDefault?: boolean): void;

    refreshSpotifyToken?(): void;
}

interface Window {
    acav: ACAV;
}


// K-means

type Centroid<T extends ArrayLike<number>> = {
    count: number;
    value: T;
};
type KmeansWorkerMessageData<T extends 'run' | 'cancel' | 'worker-result'> = {
    action: T;
} & (
    T extends 'run' ? {
        dataBuffer: ArrayBufferLike;
        dataWidth: number;
        dataHeight: number;
        k: number;
        iterations: number;
    } : T extends 'worker-result' ? {
        dataBuffer: ArrayBufferLike;
        result: Centroid<RGBA>[];
        executionTime: number;
    } : {}
);


// SVG

declare module '*.svg' {
    const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
    export default content;
}
