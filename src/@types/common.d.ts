type Vector = Readonly<{ x: number; y: number; }>;
type RgbaColor = Readonly<{ r: number; g: number; b: number; a: number; }>;

type ComponentEventArgs = {};
type ComponentEvent<T extends ComponentEventArgs> = {
    subscribe(callback: (args: T) => void): void;
    unsubscribe(callback: (args: T) => void): void;
};

type WindowEvents = {
    onresize: ComponentEvent<{}>;
};

interface Math {
    clamp(x: number, min: number, max: number): number;
    lerp(from: number, to: number, k: number): number;
}

interface CanvasRenderingContext2D {
    setFillColorRgb(rgb: [number, number, number]): void;
}

// HotModuleReplacementPlugin
interface NodeModule { hot?: any; }
