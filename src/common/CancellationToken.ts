/* eslint-disable max-classes-per-file */
const CANCEL = Symbol('CANCEL');

export class CancellationToken {
    readonly isCancelled: () => boolean;
    readonly [CANCEL]: () => void;

    constructor() {
        let cancelled = false;
        this.isCancelled = () => cancelled === true;
        this[CANCEL] = () => {
            cancelled = true;
        };
    }
}

export class CancellationTokenSource {
    readonly token: CancellationToken;
    readonly cancel: () => void;

    constructor() {
        this.token = new CancellationToken();
        this.cancel = () => this.token[CANCEL]();
    }
}
