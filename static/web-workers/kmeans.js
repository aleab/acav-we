/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-restricted-globals */

/** @typedef {import('../../src/@types/common')} */
/** @typedef {import('../../src/@types/app')} */
/** @typedef {{readonly cancel: boolean}} CancellationToken */

// https://en.wikipedia.org/wiki/K-means_clustering
// https://nextjournal.com/lazarus/extracting-dominant-colours-from-pictures
// https://github.com/NathanEpstein/clusters/blob/19aeb890f05216be2728f522631dc60ef3fdcfa7/clusters.js
/**
 * @param {{
 *  width: number;
 *  height: number;
 *  data: Uint8ClampedArray;
 * }} data
 * @param {number} k
 * @param {number} iterations
 * @param {CancellationToken} ct
 * @returns {Centroid<RGBA>[] | null}
 */
function kmeans(data, k, iterations, ct) {
    if (ct.cancel) return null;

    const npx = data.width * data.height;

    /** @type {Array<Centroid<RGBA>>} */
    const centroids = new Array(k);
    for (let i = 0; i < k; ++i) {
        const a = Math.round(Math.random() * (npx - 1));
        const ipx = a * 4;
        centroids[i] = {
            count: 0,
            value: [
                data.data[ipx + 0],
                data.data[ipx + 1],
                data.data[ipx + 2],
                data.data[ipx + 3],
            ],
        };
    }

    /** @type {Array<number>} */
    const labels = new Array(npx);

    for (let it = 0; it < iterations; ++it) {
        if (ct.cancel) return null;

        // update each pixel's label
        for (let i = 0; i < npx; ++i) {
            if (ct.cancel) return null;

            const ipx = i * 4;
            const arrayOfSquaredEuclideanDistances = centroids.map(c => {
                const d0 = (c.value[0] - data.data[ipx + 0]) ** 2;
                const d1 = (c.value[1] - data.data[ipx + 1]) ** 2;
                const d2 = (c.value[2] - data.data[ipx + 2]) ** 2;
                const d3 = (c.value[3] - data.data[ipx + 3]) ** 2;
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
            centroids[i].value[0] = Math.round(total[0] / n);
            centroids[i].value[1] = Math.round(total[1] / n);
            centroids[i].value[2] = Math.round(total[2] / n);
            centroids[i].value[3] = Math.round(total[3] / n);
        }
    }

    return centroids.sort((c1, c2) => c2.count - c1.count);
}

/** @type {boolean} */ let isRunning = false;
/** @type {CancellationToken} */ let ct = null;
/** @type {ArrayBufferLike} */ let dataBuffer = null;

/**
 * @param {MessageEvent<KmeansWorkerMessageData<'run' | 'cancel'>>} msg
 */
function onMessage(msg) {
    switch (msg.data.action) {
        case 'run': {
            if (isRunning) break;
            const _ct = { cancel: false };

            isRunning = true;
            ct = _ct;
            dataBuffer = msg.data.dataBuffer;

            /** @type {Promise<void>} */
            const promise = new Promise(resolve => {
                const imageData = {
                    width: msg.data.dataWidth,
                    height: msg.data.dataHeight,
                    data: new Uint8ClampedArray(msg.data.dataBuffer),
                };

                const t0 = performance.now();
                const clusters = kmeans(imageData, msg.data.k, msg.data.iterations, _ct);
                sendResult(clusters, _ct, performance.now() - t0);
                resolve();
            }).finally(() => {
                isRunning = false;
            });
            break;
        }

        case 'cancel':
            if (!isRunning) break;
            ct.cancel = true;
            sendResult(null, _ct, -1);
            break;

        default: break;
    }
}

/**
 * @param {Centroid<RGBA>[] | null} result
 * @param {CancellationToken} _ct
 * @param {number} executionTime
 */
function sendResult(result, _ct, executionTime) {
    /** @type {KmeansWorkerMessageData<'worker-result'>} */
    const message = {
        action: 'worker-result',
        result,
        executionTime,
        dataBuffer,
    };
    self.postMessage(message, [dataBuffer]);
}

self.onmessage = onMessage.bind(self);
