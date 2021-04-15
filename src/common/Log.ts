export type Logger = {
    debug: (...args: any[]) => void;
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
};

export default class Log {
    static readonly debug = console.debug;
    static readonly info = console.info;
    static readonly warn = console.warn;
    static readonly error = console.error;

    static readonly GenericVerboseStyle = { color: '#FAFFE2', extraStyles: 'background-color: #756B89' };

    static getLogger(caller: string | null, color: string, extraStyles?: string): Logger {
        const style = `color:${color}` + (extraStyles ? `;${extraStyles}` : '');
        const args: any[] = caller ? [
            `%c[%s] %c[${caller}] %c%s`,
            'font-weight:bold',
            `${style};font-weight:bold`,
            style,
        ] : [
            '%c[%s] %c%s',
            'font-weight:bold',
            style,
        ];
        return {
            debug: Log.debug.bind(null, args[0], args[1], 'V', ...args.slice(2)),
            info: Log.info.bind(null, args[0], args[1], 'I', ...args.slice(2)),
            warn: Log.warn.bind(null, args[0], args[1], 'W', ...args.slice(2)),
            error: Log.error.bind(null, args[0], args[1], 'E', ...args.slice(2)),
        };
    }
}
