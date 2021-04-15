import { RGB } from 'color-convert/conversions';

import { CancellationToken } from '../common/CancellationToken';
import { calcAverageColor } from '../common/Colors';
import Log from '../common/Log';

const kmeansLog = Log.getLogger('kmeans', Log.GenericVerboseStyle.color, Log.GenericVerboseStyle.extraStyles);

export enum SpotifyProgressBarColorMatchType { Dominant, Average }

type Centroid = {
    count: number;
    color: RGBA;
};

// https://en.wikipedia.org/wiki/K-means_clustering
// https://nextjournal.com/lazarus/extracting-dominant-colours-from-pictures
// https://github.com/NathanEpstein/clusters/blob/19aeb890f05216be2728f522631dc60ef3fdcfa7/clusters.js
function kmeans(data: ImageData, k: number, iterations: number, ct: CancellationToken): Centroid[] | null {
    if (ct.isCancelled()) return null;

    const t0 = performance.now();

    const npx = data.width * data.height;

    const centroids = new Array<Centroid>(k);
    for (let i = 0; i < k; ++i) {
        const a = Math.round(Math.random() * (npx - 1));
        const ipx = a * 4;
        centroids[i] = {
            count: 0,
            color: [
                data.data[ipx + 0],
                data.data[ipx + 1],
                data.data[ipx + 2],
                data.data[ipx + 3],
            ],
        };
    }

    const labels = new Array<number>(npx);

    for (let it = 0; it < iterations; ++it) {
        if (ct.isCancelled()) return null;

        // update each pixel's label
        for (let i = 0; i < npx; ++i) {
            if (ct.isCancelled()) return null;

            const ipx = i * 4;
            const arrayOfSquaredEuclideanDistances = centroids.map(c => {
                const d0 = (c.color[0] - data.data[ipx + 0]) ** 2;
                const d1 = (c.color[1] - data.data[ipx + 1]) ** 2;
                const d2 = (c.color[2] - data.data[ipx + 2]) ** 2;
                const d3 = (c.color[3] - data.data[ipx + 3]) ** 2;
                return d0 + d1 + d2 + d3;
            });
            let [ indexOfMin, min ] = [ 0, arrayOfSquaredEuclideanDistances[0] ];
            for (let j = 1; j < arrayOfSquaredEuclideanDistances.length; ++j) {
                if (arrayOfSquaredEuclideanDistances[j] < min) {
                    indexOfMin = j;
                    min = arrayOfSquaredEuclideanDistances[j];
                }
            }
            labels[i] = indexOfMin;
        }

        // update centroids
        for (let i = 0; i < centroids.length; ++i) {
            // calculate the new average location of the points of this cluster
            const total = [ 0, 0, 0, 0 ];
            let n = 0;

            for (let j = 0; j < npx; ++j) {
                if (labels[j] === i) {
                    const ipx = j * 4;
                    total[0] += data.data[ipx + 0];
                    total[1] += data.data[ipx + 1];
                    total[2] += data.data[ipx + 2];
                    total[3] += data.data[ipx + 3];
                    n++;
                }
            }

            centroids[i].count = n;
            centroids[i].color[0] = Math.round(total[0] / n);
            centroids[i].color[1] = Math.round(total[1] / n);
            centroids[i].color[2] = Math.round(total[2] / n);
            centroids[i].color[3] = Math.round(total[3] / n);
        }
    }

    const t1 = performance.now();
    kmeansLog.debug(`Execution Time: ${(t1 - t0).toFixed(4)}ms`);

    return centroids.sort((c1, c2) => c2.count - c1.count);
}

type SpotifyProgressBarColorMatcherOptions = {
    kmeansIterations: number;
};
class _SpotifyProgressBarColorMatcher {
    private kmeansIterations: number = 600;

    withOptions(options: SpotifyProgressBarColorMatcherOptions) {
        const x = new _SpotifyProgressBarColorMatcher();
        x.kmeansIterations = options.kmeansIterations;
        return {
            getColor: x.getColor.bind(x),
        };
    }

    async getColor(
        type: SpotifyProgressBarColorMatchType,
        imageData: ImageData,
        ct: CancellationToken,
        onLongRunning?: () => void,
        onLongRunningEnded?: () => void,
    ): Promise<RGB | null> {
        switch (type) {
            case SpotifyProgressBarColorMatchType.Dominant:
                return Promise.resolve().then(() => {
                    onLongRunning?.();
                    const clusters = kmeans(imageData, 3, this.kmeansIterations, ct);
                    onLongRunningEnded?.();
                    return clusters === null || ct.isCancelled() ? null : clusters[0].color.slice(0, 3) as RGB;
                });

            case SpotifyProgressBarColorMatchType.Average:
            default:
                return calcAverageColor(imageData);
        }
    }
}

export const SpotifyProgressBarColorMatcher = new _SpotifyProgressBarColorMatcher();
