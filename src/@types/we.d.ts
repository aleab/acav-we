type ProjectJsonProperties = typeof import('../../project.json/project.properties.json');
type RawWallpaperProperties = Partial<ProjectJsonProperties & WEUserProperties>;
type MappedProperties = DeepPartial<import('../app/properties/Properties').default>;

// PROPERTIES

type WEPropertyType = 'color' | 'slider' | 'bool' | 'combo' | 'text' | 'textinput' | 'file' | 'directory';
type WEProperty<T extends WEPropertyType | string = string> = Readonly<{
    type: T;
    text: string;
} & (
    T extends 'text' ? {} :
    T extends 'file' | 'directory' ? {
        value?: string;
    } : {
        value: T extends 'slider' ? number : T extends 'bool' ? boolean : string;
    }
) & (
    T extends 'slider' ? {
        min: number;
        max: number;
        fraction?: boolean;
        step?: number;
    } : {}
) & (
    T extends 'file' ? {
        fileType?: 'video' | string;
    } : {}
) & (
    T extends 'directory' ? {
        mode: 'ondemand' | 'fetchall';
    } : {}
)>;

type WEUserProperties = Readonly<{
    schemecolor?: Readonly<{ value: string }>;
    audioprocessing?: Readonly<{ value: boolean }>;
}>;
type WEGeneralProperties = Readonly<{
    bloom: boolean;
    fps: number;
    graphicsapi: 'dxgi' | 'directx' | 'opengl';
    msaa: 'none' | 'x2' | 'x4' | 'x8';
    reflection: boolean;
    resolution: 'full' | 'half';
}>;

// EVENTS

type WEPropertyListener = {
    applyUserProperties?: (props: RawWallpaperProperties) => void;
    applyGeneralProperties?: (props: Partial<WEGeneralProperties>) => void;
    setPaused?: (isPaused: boolean) => void;
    userDirectoryFilesAddedOrChanged?: (propertyName: string, changedFiles: string[]) => void;
    userDirectoryFilesRemoved?: (propertyName: string, removedFiles: string[]) => void;
};
type WEAudioListener = (audioArray: number[]) => void;

type UserPropertiesChangedEventArgs = {
    oldProps: DeepReadonly<import('../app/properties/Properties').default>;
    newProps: DeepReadonly<MappedProperties>;
};
type GeneralPropertiesChangedEventArgs = { newProps: Partial<DeepReadonly<WEGeneralProperties>>; };
type AudioSamplesEventArgs = {
    rawSamples: import('../common/AudioSamplesArray').default;
    samples: import('../common/AudioSamplesArray').default;
    samplesBuffer: import('../common/CircularBuffer').default<import('../common/AudioSamplesArray').default>;
    peak: number;
    mean: number;
};
type WallpaperEvents = {
    onUserPropertiesChanged: ComponentEvent<UserPropertiesChangedEventArgs>;
    onGeneralPropertiesChanged: ComponentEvent<GeneralPropertiesChangedEventArgs>;
    onAudioSamples: ComponentEvent<AudioSamplesEventArgs>;
};

interface Window {
    wallpaperPropertyListener?: WEPropertyListener;
    wallpaperRegisterAudioListener: (callback: WEAudioListener | null) => void;

    /** Request a random file from the directory a named property points to. */
    wallpaperRequestRandomFileForProperty: (propertyName: string, callback: (propertyName: string, filePath: string) => void) => void;
}
