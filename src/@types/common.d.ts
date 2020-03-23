type RGBA = [number, number, number, number];

type ComponentEventArgs = {};
type ComponentEvent<T extends ComponentEventArgs> = {
    subscribe(callback: (args: T) => void): void;
    unsubscribe(callback: (args: T) => void): void;
};

type WindowEvents = {
    onresize: ComponentEvent<{}>;
};

interface Math {
    /** PI / 2 */
    readonly PI_2: number;
    clamp(x: number, min: number, max: number): number;
    lerp(from: number, to: number, k: number): number;
    median(array: readonly number[], isSorted?: boolean): number;
}

interface CanvasRenderingContext2D {
    setFillColorRgb(rgb: [number, number, number]): void;
}

// HotModuleReplacementPlugin
interface NodeModule { hot?: any; }
