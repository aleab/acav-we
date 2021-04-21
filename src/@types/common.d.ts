type RGBA = [number, number, number, number];

interface IEventHandler<T extends {}> {
    subscribe(callback: (args: T) => void): void;
    unsubscribe(callback: (args: T) => void): void;
}

type WindowEvents = {
    onresize: IEventHandler<{}>;
};

interface Math {
    /** PI / 2 */
    readonly PI_2: number;
    readonly RAD2DEG: number;
    readonly DEG2RAD: number;

    clamp(x: number, min: number, max: number): number;
    lerp(from: number, to: number, k: number): number;
    median(array: readonly number[], isSorted?: boolean): number;
    formatBytes(bytes: number, decimals?: number): string;
    lgamma(z: number): number;
}

interface CanvasRenderingContext2D {
    setFillColorRgb(rgb: [number, number, number]): void;
    setStrokeColorRgb(rgb: [number, number, number]): void;
}

// HotModuleReplacementPlugin
interface NodeModule { hot?: any; }
declare namespace NodeJS {
    interface ProcessEnv {
        NODE_ENV: string;
        APP_VERSION: string;
        BACKEND_API_BASEURL: string;
    }
}

interface SVGAnimationElement {
    beginElement(): void;
}

declare module Intl {
    interface DateTimeFormatOptions {
        hourCycle?: 'h11' | 'h12' | 'h23' | 'h24';
    }
}
