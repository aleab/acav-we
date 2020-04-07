import { DBSchema, IDBPDatabase, openDB } from 'idb';

import Log from '../common/Log';
import { IMusicbrainzClient, MusicbrainzClientSearchTrack, MusicbrainzReleaseCoverArt } from './musicbrainz-client';

const Logc = Log.getLogger('MusicbrainzClientCache', '#EC74C0', 'background-color: #1E1A23');

interface MusicbrainzDB extends DBSchema {
    'musicbrainz-covers': {
        key: number;
        value: {
            readonly updatedAt: string;
            timestamp: number;
            covers: MusicbrainzReleaseCoverArt[] | undefined | null;
            album: { name: MusicbrainzClientSearchTrack['album'], artists: string[] }
        };
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

export default class MusicbrainzClientCacheDecorator implements IMusicbrainzClient {
    private readonly mbClient: IMusicbrainzClient;
    private readonly cacheName: string;
    private readonly ttl: number;
    private db: IDBPDatabase<MusicbrainzDB> | undefined;

    private readonly cacheMaintenanceInterval: number;
    private cacheMaintenanceTimeoutId = 0;

    constructor(mbClient: IMusicbrainzClient, options: MusicbrainzClientCacheDecoratorOptions) {
        if (options.cacheName === null || options.cacheName === undefined || !(/[a-z]/i).test(options.cacheName)) {
            throw new Error('Invalid cache name!');
        }

        this.mbClient = mbClient;
        this.cacheName = options.cacheName;
        this.ttl = options.ttlMs !== undefined
            ? options.ttlMs > TTL_MIN ? options.ttlMs : TTL_MIN
            : TTL_DEFAULT;

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
                const store = db.createObjectStore('musicbrainz-covers');
                store.createIndex('by-updatedDate', 'timestamp');
            },
        });

        if (!this.db) return;
        Logc.info('Initialized!');

        this.cacheMaintenanceTimeoutId = setTimeout(this.cacheMaintenanceLoop.bind(this) as TimerHandler, 1000 * 5);
    }

    async findCoverArtByReleaseGroup(track: MusicbrainzClientSearchTrack): Promise<MusicbrainzReleaseCoverArt[] | undefined | null> {
        if (track.album && track.artists?.[0]) {
            if (this.db === undefined) await this.init();
            if (this.db) {
                const albumHashCode = this.getTrackHashCode(track);
                const cachedValue = await this.db.get('musicbrainz-covers', albumHashCode);

                let covers: MusicbrainzReleaseCoverArt[] | null | undefined;
                if (cachedValue !== undefined && !this.hasExpired(cachedValue.timestamp)) {
                    covers = cachedValue.covers;
                    Logc.debug('Pulled cover art from cache:', { key: albumHashCode });
                } else {
                    covers = await this.mbClient.findCoverArtByReleaseGroup(track);
                    this.db.put('musicbrainz-covers', {
                        get updatedAt() { return new Date(this.timestamp).toISOString(); },
                        timestamp: Date.now(),
                        album: {
                            name: track.album,
                            artists: track.artists,
                        },
                        covers,
                    }, albumHashCode);
                }
                return covers;
            }
        }

        return this.mbClient.findCoverArtByReleaseGroup(track);
    }

    private async cacheMaintenanceLoop() {
        if (!this.db) {
            this.cacheMaintenanceTimeoutId = setTimeout(this.cacheMaintenanceLoop.bind(this) as TimerHandler, this.cacheMaintenanceInterval);
            return;
        }

        const db = this.db;

        let entriesCount = await db.count('musicbrainz-covers');
        let storageUsage = (await navigator.storage.estimate()).usage ?? 0;
        Logc.debug(`Cache maintenance started   — Entries: ${entriesCount.toString().padEnd(4, ' ')} | Total Storage Used: ${Math.formatBytes(storageUsage, 1)}`);

        const promises: Array<Promise<number | undefined>> = [];
        const keysToDelete = await db.getAllKeysFromIndex('musicbrainz-covers', 'by-updatedDate', IDBKeyRange.upperBound(Date.now() - this.ttl));

        keysToDelete.forEach(key => {
            promises.push(new Promise(resolve => {
                db.delete('musicbrainz-covers', key).then(() => resolve(key));
            }));
        });

        await Promise.all(promises);

        entriesCount = await db.count('musicbrainz-covers');
        storageUsage = (await navigator.storage.estimate()).usage ?? 0;
        Logc.info(`Cache maintenance completed — Entries: ${entriesCount.toString().padEnd(4, ' ')} | Total Storage Used: ${Math.formatBytes(storageUsage, 1)}`);

        this.cacheMaintenanceTimeoutId = setTimeout(this.cacheMaintenanceLoop.bind(this) as TimerHandler, this.cacheMaintenanceInterval);
    }

    private hasExpired(timestamp: number) { return Date.now() - this.ttl > timestamp; }

    getTrackHashCode(track: MusicbrainzClientSearchTrack) {
        const _album = track.album ?? '';
        const _artist = track.artists !== undefined && track.artists.length > 0 ? track.artists[0] : '';
        const s = `${_album}.${_artist}`;

        let hash = 0;
        for (let i = 0; i < s.length; i++) {
            const character = s.charCodeAt(i);
            hash = ((hash << 5) - hash) + character;
            hash &= hash; // Convert to 32bit integer
        }
        return hash;
    }

    dispose() {
        clearTimeout(this.cacheMaintenanceTimeoutId);
    }
}