import ColorConvert from 'color-convert';
import { RGB } from 'color-convert/conversions';

import { CancellationToken } from '../common/CancellationToken';
import { calcAverageColor } from '../common/Colors';
import Log from '../common/Log';

const kmeansLog = Log.getLogger('kmeans', Log.GenericVerboseStyle.color, Log.GenericVerboseStyle.extraStyles);

export enum SpotifyProgressBarColorMatchType { Dominant, Average }

type SpotifyProgressBarColorMatcherOptions = {
    kmeansIterations: number;
    kmeansClusters: number;
};
class _SpotifyProgressBarColorMatcher {
    private kmeansIterations: number = 600;
    private kmeansClusters: number = 3;

    withOptions(options: SpotifyProgressBarColorMatcherOptions) {
        const x = new _SpotifyProgressBarColorMatcher();
        x.kmeansIterations = options.kmeansIterations;
        x.kmeansClusters = options.kmeansClusters;
        return {
            getColor: x.getColor.bind(x),
        };
    }

    async getColor(
        type: SpotifyProgressBarColorMatchType,
        imageCanvas: OffscreenCanvas,
        ct: CancellationToken,
        onLongRunning?: () => void,
        onLongRunningEnded?: () => void,
    ): Promise<RGB | null> {
        const canvasContext = imageCanvas.getContext('2d');
        if (canvasContext === null) return null;

        const imageData = canvasContext.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
        switch (type) {
            case SpotifyProgressBarColorMatchType.Dominant: {
                const worker = new Worker('./web-workers/kmeans.js', { name: `kmeans-${(Math.random() * 100000).toFixed(0)}` });
                return new Promise<RGB | null>(resolve => {
                    worker.addEventListener('message', (msg: MessageEvent<KmeansWorkerMessageData<'worker-result'>>) => {
                        if (msg.data.action === 'worker-result') {
                            let result: RGB | null = null;
                            if (msg.data.result !== null && !ct.isCancelled()) {
                                result = msg.data.result[0].value.slice(0, 3) as RGB;

                                if (Log.debug !== Log.NullLogFunction) {
                                    const arg = {
                                        executionTime: Number(msg.data.executionTime.toFixed(4)),
                                        result: msg.data.result.map(c => ({
                                            count: c.count,
                                            value: `#${ColorConvert.rgb.hex(c.value as unknown as RGB)}`,
                                        })),
                                    };
                                    kmeansLog.debug('Finished work:', arg);
                                    Log.debug(
                                        `             Colors:${arg.result.map((_, i) => `%c\u3000${i}%c  `).join('')}`,
                                        ...arg.result.map(a => [ 'background-color: unset', `background-color: ${a.value}; border: 1px solid black; border-radius: 8px; margin-left: 2px` ]).reduce((acc, curr) => acc.concat(...curr), []),
                                    );
                                }
                            }
                            onLongRunningEnded?.();
                            resolve(result);
                        }
                    });

                    ct.onCancelled.subscribe(() => worker.postMessage({ action: 'cancel' } as KmeansWorkerMessageData<'cancel'>));

                    onLongRunning?.();
                    worker.postMessage({
                        action: 'run',
                        dataBuffer: imageData.data.buffer,
                        dataWidth: imageData.width,
                        dataHeight: imageData.height,
                        k: this.kmeansClusters,
                        iterations: this.kmeansIterations,
                    } as KmeansWorkerMessageData<'run'>, [imageData.data.buffer]);
                }).finally(() => {
                    worker.terminate();
                });
            }

            case SpotifyProgressBarColorMatchType.Average:
            default:
                return calcAverageColor(imageData);
        }
    }
}

export const SpotifyProgressBarColorMatcher = new _SpotifyProgressBarColorMatcher();
