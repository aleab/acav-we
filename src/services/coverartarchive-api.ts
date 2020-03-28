/// <reference path="./coverartarchive-api.d.ts" />

// https://musicbrainz.org/doc/Cover_Art_Archive/API

export default class CoverArtArchiveApi {
    private readonly baseUrl = 'https://coverartarchive.org';

    private _fetch(method: 'GET' | 'HEAD' | 'OPTIONS', endpoint: string, followRedirect: boolean = true) {
        return fetch(`${this.baseUrl}/${endpoint}`, {
            method,
            headers: {
                Accept: 'application/json',
            },
            redirect: followRedirect ? 'follow' : 'manual',
        });
    }

    private get(endpoint: string, followRedirect: boolean = true): Promise<Response> {
        return this._fetch('GET', endpoint, followRedirect);
    }

    /**
     * @returns A JSON object of available cover arts; `null` if there are no cover arts for the requested release of the release is invalid; `undefined` if rate limited.
     */
    async getAll(type: 'release' | 'release-group', mbid: string): Promise<CoverArtList | null | undefined> {
        if (!type || !mbid) return null;
        try {
            const res = await this.get(`${type}/${mbid}`);

            switch (res.status) {
                case 200:
                    return await res.json();
                case 503:
                    return undefined;
                default:
                    return null;
            }
        } catch (err) {
            return null;
        }
    }

    /**
     * @returns Whether the requested front cover exists; `undefined` if rate limited.
     */
    async getFrontExists(type: 'release' | 'release-group', mbid: string, size?: 250 | 500 | 1200): Promise<boolean | undefined> {
        if (!type || !mbid) return false;

        let endpoint = `${type}/${mbid}/front`;
        if (size !== undefined) {
            if (size !== 250 && size !== 500 && size !== 1200) return false;
            endpoint += `-${size}`;
        }

        try {
            const res = await this.get(endpoint, false);

            switch (res.status) {
                case 0:
                    return res.type === 'opaqueredirect'; // Browsers always follow redirects; when using { redirect: 'manual' } fetch returns an empty opaque redirect
                case 307:
                    return res.headers.get('Location') !== null;
                case 503:
                    return undefined;
                default:
                    return false;
            }
        } catch (err) {
            return false;
        }
    }

    getFrontUrl(type: 'release' | 'release-group', mbid: string, size: 250 | 500 | 1200): string | undefined {
        if (!type || !mbid || (size !== 250 && size !== 500 && size !== 1200)) return undefined;
        return `${this.baseUrl}/${type}/${mbid}/front-${size}`;
    }
}
