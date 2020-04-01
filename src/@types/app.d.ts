// HotModuleReplacementPlugin
interface NodeModule { hot?: any; }

declare module 'whatwg-fetch';

declare module '*.svg' {
    const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
    export default content;
}
