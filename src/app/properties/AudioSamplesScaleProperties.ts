import { ScaleFunction } from '../ScaleFunction';

export default interface AudioSamplesScaleProperties {
    function: ScaleFunction;
    powExponent: number;
    expBase: number;
    logBase: number;
    log$powA: number;
    log$powBase: number;
    log$powExponent: number;
    gaussianDeviation: number;
    gaussianMean: number;
}
