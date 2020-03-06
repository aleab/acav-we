import Log from '../common/Log';

const Logc = Log.getLogger('Renderer', '#703431');

interface Renderer {
    readonly setFps: (fps: number) => void;
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
        subscribe(callback) { eventSubscribers.add(callback); },
        unsubscribe(callback) { eventSubscribers.delete(callback); },
    };
}
