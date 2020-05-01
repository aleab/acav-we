type CorsairProtocolDetails = {
    sdkVersion: string;
    serverVersion: string;
    sdkProtocolVersion: number;
    serverProtocolVersion: number;
    breakingChanges: boolean;
};

type CorsairDeviceInfo = {
    type: keyof typeof import('./enums').CorsairDeviceType;
    model: string;
    physicalLayout: keyof typeof import('./enums').CorsairPhysicalLayout;
    logicalLayout: keyof typeof import('./enums').CorsairLogicalLayout;
    ledCount: number;
    capsMask: {
        [K in keyof typeof import('./enums').CorsairDeviceCaps]?: boolean;
    };
};

type CorsairLedPosition = {
    ledId: number;
    ledIdName: string;
    top: number;
    left: number;
    width: number;
    height: number;
};

type CorsairLedColor = {
    ledId: number;
    r: number;
    g: number;
    b: number;
};

type WEiCueApi = {
    getProtocolDetails: (callback: (protocolDetails: CorsairProtocolDetails) => void) => void;
    getDeviceCount: (callback: (deviceCount: number) => void) => void;
    getDeviceInfo: (deviceIndex: number, callback: (deviceInfo: CorsairDeviceInfo) => void) => void;
    getLedPositionsByDeviceIndex: (callback: (arrayOfLEDs: CorsairLedPosition[]) => void) => void;
    setLedsColorsAsync: (arrayOfLEDColors: CorsairLedColor[]) => void;
    setAllLedsColorsAsync: (deviceIndexOrArray: number | number[], ledColor: CorsairLedColor) => void;
    setLedColorsByImageData: (deviceIndexOrArray: number | number[], encodedImageData: string, width: number, height: number) => void;
};

interface Window {
    cue?: WEiCueApi;
}
