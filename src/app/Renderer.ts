import Log from '../common/Log';
import EventHandler from '../common/EventHandler';

const Logc = Log.getLogger('Renderer', '#703431');

export type RenderEventArgs = { timestamp: number; };

interface IRenderer {
    readonly setFps: (fps: number) => void;
    readonly start: () => void;
    readonly stop: () => void;
    readonly queue: (id: string, callback: (timestamp: number) => void) => void;
    readonly cancel: (id: string) => void;

    readonly onBeforeRender: IEventHandler<RenderEventArgs>;
    readonly onRender: IEventHandler<RenderEventArgs>;
    readonly onAfterRender: IEventHandler<RenderEventArgs>;
}

export default function Renderer(fps: number = 0): IRenderer {
    let _fps: number = fps;
    let _isRunning: boolean = false;

    const renderQueue: Map<string, (timestamp: number) => void> = new Map();
    let _animationFrameId = 0;

    const onBeforeRenderEventHandler = new EventHandler<RenderEventArgs>();
    const onRenderEventHandler = new EventHandler<RenderEventArgs>();
    const onAfterRenderEventHandler = new EventHandler<RenderEventArgs>();

    /**
     * Execute all queued render jobs.
     * @param timestamp
     */
    function flushRenderQueue(timestamp: number) {
        if (!_isRunning) return;

        onBeforeRenderEventHandler.invoke({ timestamp });

        onRenderEventHandler.invoke({ timestamp });
        renderQueue.forEach((renderCallback, id, m) => {
            m.delete(id);
            renderCallback(timestamp);
        });

        onAfterRenderEventHandler.invoke({ timestamp });
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
        onBeforeRender: onBeforeRenderEventHandler,
        onRender: onRenderEventHandler,
        onAfterRender: onAfterRenderEventHandler,
    };
}
