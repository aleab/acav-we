import Log from '../common/Log';

const Logc = Log.getLogger('Renderer', '#703431');

interface Renderer {
    fps: number;
    readonly start: () => void;
    readonly stop: () => void;
    readonly queue: (id: string, callback: (timestamp: number) => void) => void;
    readonly cancel: (id: string) => void;

    readonly subscribe: (callback: (timestamp: number) => void) => void;
    readonly unsubscribe: (callback: (timestamp: number) => void) => void;
}

export default function Renderer(fps: number = 0): Renderer {
    let _fps: number = fps;
    let _isRunning: boolean = false;

    const renderQueue: Map<string, (timestamp: number) => void> = new Map();
    let _renderTimeoutId = 0;
    let _animationFrameId = 0;

    const eventSubscribers: Set<(timestamp: number) => void> = new Set();

    function flushRenderQueue(timestamp: number) {
        if (!_isRunning) return;
        renderQueue.forEach((renderCallback, k, m) => {
            m.delete(k);
            renderCallback(timestamp);
        });

        if (eventSubscribers.size > 0) {
            setTimeout(((ts: number) => {
                eventSubscribers.forEach(callback => callback(ts));
            }) as TimerHandler, 0, timestamp);
        }
    }

    function renderLoop(ts?: number) {
        const timestamp = ts ?? performance.now();
        flushRenderQueue(timestamp);
        const renderDelay = performance.now() - timestamp;

        if (_fps > 0) {
            _renderTimeoutId = setTimeout(renderLoop as TimerHandler, Math.max(0, 1000 / _fps - renderDelay));
            _animationFrameId = 0;
        } else {
            _animationFrameId = window.requestAnimationFrame(renderLoop);
            _renderTimeoutId = 0;
        }
    }

    Logc.info('Created!');
    return {
        get fps() { return _fps; },
        set fps(newFps) { _fps = newFps; },
        start() {
            if (_isRunning) return;
            _isRunning = true;
            renderLoop();
            Logc.info('Started!');
        },
        stop() {
            if (!_isRunning) return;
            _isRunning = false;
            clearTimeout(_renderTimeoutId);
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
        subscribe(callback) { eventSubscribers.add(callback); },
        unsubscribe(callback) { eventSubscribers.delete(callback); },
    };
}
