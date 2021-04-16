/* eslint-disable max-classes-per-file */

import EventHandler from './EventHandler';

const CANCEL = Symbol('CANCEL');

export class CancellationToken {
    readonly onCancelled: IEventHandler<{}>;
    readonly isCancelled: () => boolean;
    readonly [CANCEL]: () => void;

    constructor() {
        let cancelled = false;
        this.onCancelled = new EventHandler<{}>();
        this.isCancelled = () => cancelled === true;
        this[CANCEL] = () => {
            cancelled = true;
            (this.onCancelled as EventHandler<{}>).invoke({});
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
