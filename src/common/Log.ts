export default class Log {
    static readonly debug = console.debug;
    static readonly info = console.info;
    static readonly warn = console.warn;
    static readonly error = console.error;

    static getLogger(caller: string | null, color: string, extraStyles?: string) {
        const style = `color:${color}` + (extraStyles ? `;${extraStyles}` : '');
        const args: any[] = caller ? [
            `%c[${caller}] %c%s`,
            `${style};font-weight:bold`,
            style,
        ] : [
            '%c%s',
            style,
        ];
        return {
            debug: Log.debug.bind(null, ...args),
            info: Log.info.bind(null, ...args),
            warn: Log.warn.bind(null, ...args),
            error: Log.error.bind(null, ...args),
        };
    }
}
