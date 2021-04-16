export type Logger = {
    debug: (...args: any[]) => void;
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
};

function mapArgs(args: any[], verbosity: string): any[] {
    return [ args[0], args[1], verbosity, ...args.slice(2) ];
}

export default class Log {
    static readonly debug = console.debug;
    static readonly info = console.info;
    static readonly warn = console.warn;
    static readonly error = console.error;

    static readonly NullLogFunction = () => {};

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
            debug: Log.debug.bind(null, ...mapArgs(args, 'V')),
            info: Log.info.bind(null, ...mapArgs(args, 'I')),
            warn: Log.warn.bind(null, ...mapArgs(args, 'W')),
            error: Log.error.bind(null, ...mapArgs(args, 'E')),
        };
    }
}
