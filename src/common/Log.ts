export default class Log {
    static readonly debug = console.debug;
    static readonly info = console.info;
    static readonly warn = console.warn;
    static readonly error = console.error;

    static getLogger(caller: string | null, color: string) {
        const args: any[] = caller ? [
            `%c[${caller}] %c%s`,
            `color:${color}; font-weight:bold`,
            `color:${color}`,
        ] : [
            `%c[${caller}] %s`,
            `color:${color}`,
        ];
        return {
            debug: Log.debug.bind(null, ...args),
            info: Log.info.bind(null, ...args),
            warn: Log.warn.bind(null, ...args),
            error: Log.error.bind(null, ...args),
        };
    }
}
