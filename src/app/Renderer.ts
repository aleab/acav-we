import Log from '../common/Log';

const Logc = Log.getLogger('Renderer', '#703431');

interface Renderer {
    readonly setFps: (fps: number) => void;
    readonly start: () => void;
    readonly stop: () => void;
    readonly queue: (id: string, callback: (timestamp: number) => void) => void;
    readonly cancel: (id: string) => void;

    readonly renderingEvent: {
        readonly subscribe: (callback: (timestamp: number) => void) => void;
        readonly unsubscribe: (callback: (timestamp: number) => void) => void;
    };
    readonly renderedEvent: {
        readonly subscribe: (callback: (timestamp: number) => void) => void;
        readonly unsubscribe: (callback: (timestamp: number) => void) => void;
    };
}

export default function Renderer(fps: number = 0): Renderer {
    let _fps: number = fps;
    let _isRunning: boolean = false;

    const renderQueue: Map<string, (timestamp: number) => void> = new Map();
    let _animationFrameId = 0;

    const renderingEventSubscribers: Set<(timestamp: number) => void> = new Set();
    const renderedEventSubscribers: Set<(timestamp: number) => void> = new Set();

    /**
     * Execute all queued render jobs.
     * @param timestamp
     */
    function flushRenderQueue(timestamp: number) {
        if (!_isRunning) return;
        renderingEventSubscribers.forEach(callback => callback(timestamp));
        renderQueue.forEach((renderCallback, k, m) => {
            m.delete(k);
            renderCallback(timestamp);
        });

        if (renderedEventSubscribers.size > 0) {
            renderedEventSubscribers.forEach(callback => callback(timestamp));
        }
    }

    let prevRenderTimestamp = 0;
    function renderLoop() {
        _animationFrameId = window.requestAnimationFrame(renderLoop);

        const timestamp = performance.now();
        const elapsed = timestamp - prevRenderTimestamp;
        if (_fps === 0 || elapsed > 1000 / _fps) {
            prevRenderTimestamp = timestamp - (elapsed % (1000 / _fps));
            flushRenderQueue(timestamp);
        }
    }

    Logc.info('Created!');
    return {
        setFps(newFps) { _fps = newFps; },
        start() {
            if (_isRunning) return;
            _isRunning = true;
            renderLoop();
            Logc.info('Started!');
        },
        stop() {
            if (!_isRunning) return;
            _isRunning = false;
            window.cancelAnimationFrame(_animationFrameId);
            Logc.info('Stopped!');
        },
        queue(id, callback) {
            if (!_isRunning) return;
            if (renderQueue.has(id)) {
                renderQueue.delete(id);
            }
            renderQueue.set(id, callback);
        },
        cancel(id) {
            if (renderQueue.has(id)) {
                renderQueue.delete(id);
            }
        },
        renderingEvent: {
            subscribe(callback) { renderingEventSubscribers.add(callback); },
            unsubscribe(callback) { renderingEventSubscribers.delete(callback); },
        },
        renderedEvent: {
            subscribe(callback) { renderedEventSubscribers.add(callback); },
            unsubscribe(callback) { renderedEventSubscribers.delete(callback); },
        },
    };
}
