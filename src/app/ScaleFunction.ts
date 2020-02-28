export enum ScaleFunction { Linear, Square, Sqrt, Log, Log$Square, Gaussian }
type ScaleFunctionsType = {
    [k in ScaleFunction]: (x: number) => number;
};
export const ScaleFunctions: ScaleFunctionsType = {
    [ScaleFunction.Linear]: (x: number) => Math.abs(x),
    [ScaleFunction.Square]: (x: number) => x ** 2,
    [ScaleFunction.Sqrt]: (x: number) => Math.sqrt(Math.abs(x)),
    [ScaleFunction.Log]: (x: number) => Math.abs(Math.log(x + 1)),
    [ScaleFunction.Log$Square]: (x: number) => 0.38 * Math.abs(Math.log(x + 1)) + 0.62 * (x ** 2),
    [ScaleFunction.Gaussian]: (x: number) => {
        const dev = 0.47;
        const mean = 0.92;
        const g = (n: number) => (1 / (dev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * (((n - mean) / dev) ** 2));
        return g(x) - g(0);
    },
};
