import Log from '../common/Log';
import AudioSamplesScaleProperties from './properties/AudioSamplesScaleProperties';

export enum ScaleFunction { Linear, Power, Exponential, Logarithm, Logarithm$Power, Gaussian, Gaussian$Power }

function log(b: number, x: number): number {
    return Math.abs(Math.log(x) / Math.log(b));
}
function gaussian(deviation: number, mean: number): (x: number) => number {
    return (x: number) => (1 / (deviation * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * (((x - mean) / deviation) ** 2));
}

export const ScaleFunctionFactory = {
    buildScaleFunction(props: AudioSamplesScaleProperties): (x: number) => number {
        switch (props.function) {
            case ScaleFunction.Linear: return x => Math.abs(x);
            case ScaleFunction.Power: return x => Math.abs(x) ** props.powExponent;
            case ScaleFunction.Exponential: return x => props.expBase ** x - 1;
            case ScaleFunction.Logarithm: return x => log(props.logBase, x + 1);
            case ScaleFunction.Logarithm$Power: return x => props.log$powA * log(props.log$powBase, x + 1) + (1 - props.log$powA) * (Math.abs(x) ** props.log$powExponent);
            case ScaleFunction.Gaussian: return x => {
                const g = gaussian(props.gaussianDeviation, props.gaussianMean);
                return g(x) - g(0);
            };

            default:
                Log.warn('Unhandled scale function type:', ScaleFunction[props.function]);
                return this.buildScaleFunction(props);
        }
    },
};
