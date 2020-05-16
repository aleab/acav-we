import { DBSchema, IDBPDatabase, openDB } from 'idb';

import Log from '../common/Log';
import MusicTrack, { getAlbumHashCode } from '../app/MusicTrack';
import { IMusicbrainzClient, MusicbrainzReleaseCoverArt } from './musicbrainz-client';

const Logc = Log.getLogger('MusicbrainzClientCache', '#EC74C0', 'background-color: #1E1A23');

interface MusicbrainzDB extends DBSchema {
    'musicbrainz-covers': {
        key: number;
        value: {
            readonly updatedAt: string;
            timestamp: number;
            covers: MusicbrainzReleaseCoverArt[] | undefined | null;
            album: { name: MusicTrack['album']; artists: string[]; };
        };
        indexes: {
            'by-updatedDate': number;
        };
    };
    'musicbrainz-cover-urls': {
        key: string;
        value: {
            readonly updatedAt: string;
            timestamp: number;
            url: string;
        }
        indexes: {
            'by-updatedDate': number;
        };
    };
}

interface MusicbrainzClientCacheDecoratorOptions {
    cacheName: string;
    ttlMs?: number;
    cacheMaintenanceInterval?: number;
}

const TTL_MIN = 1000 * 30;
const TTL_DEFAULT = 1000 * 60 * 60 * 24;
const CACHE_MAINTENANCE_MIN_INTERVAL = 1000 * 60 * 5;
const CACHE_MAINTENANCE_DEFAULT_INTERVAL = 1000 * 60 * 30;

export interface IMusicbrainzClientCache {
    cacheRealUrl(key: string, url: string): Promise<void>;
    getCachedRealUrl(key: string): Promise<string | undefined>;
    clearCachedRealUrl(key: string): Promise<void>;
}

export default class MusicbrainzClientCacheDecorator implements IMusicbrainzClient, IMusicbrainzClientCache {
    private readonly mbClient: IMusicbrainzClient;
    private readonly cacheName: string;
    private _ttl: number = TTL_DEFAULT;
    private db: IDBPDatabase<MusicbrainzDB> | undefined;

    private readonly cacheMaintenanceInterval: number;
    private cacheMaintenanceTimeoutId = 0;

    get ttl() { return this._ttl; }
    set ttl(value: number) {
        this._ttl = value > TTL_MIN ? value : TTL_MIN;
    }

    constructor(mbClient: IMusicbrainzClient, options: MusicbrainzClientCacheDecoratorOptions) {
        if (options.cacheName === null || options.cacheName === undefined || !(/[a-z]/i).test(options.cacheName)) {
            throw new Error('Invalid cache name!');
        }

        this.mbClient = mbClient;
        this.cacheName = options.cacheName;
        this.ttl = options.ttlMs ?? TTL_DEFAULT;

        this.cacheMaintenanceInterval = options.cacheMaintenanceInterval !== undefined
            ? options.cacheMaintenanceInterval > CACHE_MAINTENANCE_MIN_INTERVAL ? options.cacheMaintenanceInterval : CACHE_MAINTENANCE_MIN_INTERVAL
            : CACHE_MAINTENANCE_DEFAULT_INTERVAL;
    }

    private _initLock = false;
    async init(): Promise<void> {
        if (this._initLock) return;
        if (this.db !== undefined) return;

        this._initLock = true;

        this.db = await openDB<MusicbrainzDB>(this.cacheName, 1, {
            upgrade(db) {
                const coversStore = db.createObjectStore('musicbrainz-covers');
                coversStore.createIndex('by-updatedDate', 'timestamp');

                const urlsStore = db.createObjectStore('musicbrainz-cover-urls');
                urlsStore.createIndex('by-updatedDate', 'timestamp');
            },
        });

        if (!this.db) return;
        Logc.info('Initialized!');

        this.cacheMaintenanceTimeoutId = setTimeout(this.doCacheMaintenanceLoop.bind(this) as TimerHandler, 1000 * 5);
    }

    async findCoverArtByReleaseGroup(track: MusicTrack): Promise<MusicbrainzReleaseCoverArt[] | undefined | null> {
        if (track.album && track.artists?.[0]) {
            if (this.db === undefined) await this.init();
            if (this.db) {
                const albumHashCode = getAlbumHashCode(track);
                const cachedValue = await this.db.get('musicbrainz-covers', albumHashCode);

                let covers: MusicbrainzDB['musicbrainz-covers']['value']['covers'];
                if (cachedValue !== undefined && !this.hasExpired(cachedValue.timestamp)) {
                    covers = cachedValue.covers;
                    Logc.debug('Pulled cover art from cache:', { key: albumHashCode });
                } else {
                    covers = await this.mbClient.findCoverArtByReleaseGroup(track);
                    await this.db.put('musicbrainz-covers', {
                        get updatedAt() { return new Date(this.timestamp).toISOString(); },
                        timestamp: Date.now(),
                        covers,
                        album: {
                            name: track.album,
                            artists: track.artists,
                        },
                    }, albumHashCode);
                }
                return covers;
            }
        }

        return this.mbClient.findCoverArtByReleaseGroup(track);
    }

    async cacheRealUrl(key: string, url: string) {
        if (key && url) {
            if (this.db === undefined) await this.init();
            if (this.db) {
                const cachedValue = await this.db.get('musicbrainz-cover-urls', key);
                if (cachedValue === undefined || url !== cachedValue.url) {
                    await this.db.put('musicbrainz-cover-urls', {
                        get updatedAt() { return new Date(this.timestamp).toISOString(); },
                        timestamp: Date.now(),
                        url,
                    }, key);
                }
            }
        }
    }

    async getCachedRealUrl(key: string): Promise<string | undefined> {
        if (key) {
            if (this.db === undefined) await this.init();
            if (this.db) {
                const cachedValue = await this.db.get('musicbrainz-cover-urls', key);
                if (cachedValue !== undefined && !this.hasExpired(cachedValue.timestamp)) {
                    Logc.debug('Pulled cover art url from cache:', { key });
                    return cachedValue.url;
                }
            }
        }
        return undefined;
    }

    async clearCachedRealUrl(key: string): Promise<void> {
        if (key) {
            if (this.db === undefined) await this.init();
            if (this.db) {
                await this.db.delete('musicbrainz-cover-urls', key);
            }
        }
    }

    private async doCacheMaintenanceLoop() {
        if (!this.db) {
            this.cacheMaintenanceTimeoutId = setTimeout(this.doCacheMaintenanceLoop.bind(this) as TimerHandler, this.cacheMaintenanceInterval);
            return;
        }

        const db = this.db;

        let entriesCount = (await db.count('musicbrainz-covers')) + (await db.count('musicbrainz-cover-urls'));
        let storageUsage = (await navigator.storage.estimate()).usage ?? 0;
        Logc.debug(`Cache maintenance started   — Entries: ${entriesCount.toString().padEnd(4, ' ')} | Total Storage Used: ${Math.formatBytes(storageUsage, 1)}`);

        const promises: Array<Promise<number | string | undefined>> = [];

        const coversKeysToDelete = await db.getAllKeysFromIndex('musicbrainz-covers', 'by-updatedDate', IDBKeyRange.upperBound(Date.now() - this.ttl));
        coversKeysToDelete.forEach(key => {
            promises.push(new Promise(resolve => {
                db.delete('musicbrainz-covers', key).then(() => resolve(key));
            }));
        });

        const urlsKeysToDelete = await db.getAllKeysFromIndex('musicbrainz-cover-urls', 'by-updatedDate', IDBKeyRange.upperBound(Date.now() - this.ttl));
        urlsKeysToDelete.forEach(key => {
            promises.push(new Promise(resolve => {
                db.delete('musicbrainz-cover-urls', key).then(() => resolve(key));
            }));
        });

        await Promise.all(promises);

        entriesCount = (await db.count('musicbrainz-covers')) + (await db.count('musicbrainz-cover-urls'));
        storageUsage = (await navigator.storage.estimate()).usage ?? 0;
        Logc.info(`Cache maintenance completed — Entries: ${entriesCount.toString().padEnd(4, ' ')} | Total Storage Used: ${Math.formatBytes(storageUsage, 1)}`);

        this.cacheMaintenanceTimeoutId = setTimeout(this.doCacheMaintenanceLoop.bind(this) as TimerHandler, this.cacheMaintenanceInterval);
    }

    private hasExpired(timestamp: number) { return Date.now() - this.ttl > timestamp; }

    dispose() {
        clearTimeout(this.cacheMaintenanceTimeoutId);
    }
}
