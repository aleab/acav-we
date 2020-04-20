import { DBSchema, IDBPDatabase, openDB } from 'idb';

export interface PreferredLocalArtDB extends DBSchema {
    'preferences': {
        key: number;
        value: string | undefined;
    };
}

export default class PreferredLocalArtStore {
    private readonly store: Promise<IDBPDatabase<PreferredLocalArtDB>>;

    constructor(storeName: string, storeVersion: number) {
        this.store = openDB<PreferredLocalArtDB>(storeName, storeVersion, {
            upgrade(db) {
                db.createObjectStore('preferences');
            },
        });
    }

    async get(key: number): Promise<string | undefined> {
        return (await this.store).get('preferences', key);
    }

    async set(key: number, value: string | undefined): Promise<void> {
        (await this.store).put('preferences', value, key);
    }
}
