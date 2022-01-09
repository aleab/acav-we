import _ from 'lodash';
import Fuse from 'fuse.js';
import { IArtistList, IArtistMatch, IRecording, IRecordingList, IRecordingMatch, IReleaseGroup, IReleaseGroupList, IReleaseGroupMatch, MusicBrainzApi } from 'musicbrainz-api';

import Log from '../common/Log';
import MusicTrack from '../app/MusicTrack';
import CoverArtArchiveApi from './coverartarchive-api';

const Logc = Log.getLogger('MusicBrainzClient', '#BA478F');

export type MusicbrainzCoverArt = { size: number; url: string; };
export type MusicbrainzReleaseCoverArt = { release: string; cover: MusicbrainzCoverArt[]; };

function isNullUndefinedOrEmpty(s: string | undefined | null): s is null | undefined | '' {
    return s === null || s === undefined || _.isEmpty(s);
}

function regexEscape(s: string | undefined | null) { return s?.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&'); }

function luceneEscape(s: string | undefined | null) { return s?.replace(/[+\-&|!(){}[\]^"~*?:\\]/g, '\\$&'); }
function luceneProximitySearchBasedOnNumberOfWords(search: string, k: number = 0.75): [ string | undefined, string[] ] {
    let proximitySearch: string | undefined;
    const words = search.split(' ').filter(s => s.length > 0);
    if (words.length > 2) {
        proximitySearch = `"${search}"~${Math.round(words.length * k)}`;
    }
    return [ proximitySearch, words ];
}
function luceneOR(terms: [string, number][], boost?: (b: number) => number): string | undefined {
    if (terms.length === 0) return undefined;
    const query = terms.map(([ _q, _b ]) => `${_q}^${boost ? boost(_b) : _b}`).join(' OR ');
    return terms.length > 1 ? `(${query})` : query;
}

const LUCENE_WORDS_PROXIMITY = 0.75; // [0..1]
const MUSICBRAINZ_SEARCH_LIMIT = 20;
const MIN_COMBINED_SEARCH_SCORE = 75; // [0..100]

export interface IMusicbrainzClient {
    findCoverArtByReleaseGroup(track: MusicTrack): Promise<MusicbrainzReleaseCoverArt[] | undefined | null>;
}

export default class MusicbrainzClient implements IMusicbrainzClient {
    private api: MusicBrainzApi;
    private recordingsFuseOptions: Fuse.IFuseOptions<IRecordingMatch>;
    private releaseGroupsFuseOptions: Fuse.IFuseOptions<IReleaseGroupMatch>;
    private coverArtArchiveApi: CoverArtArchiveApi;

    private readonly verbose: boolean;

    constructor(verboseLogging: boolean = false) {
        this.api = new MusicBrainzApi({
            setUserAgent: false,
            appName: process.env.APP_NAME,
            appVersion: process.env.APP_VERSION,
            appContactInfo: process.env.APP_URL,
        });

        // TODO: Fine tune these options
        const fuseOptions: Fuse.IFuseOptions<any> = {
            isCaseSensitive: false,
            includeScore: true,
            shouldSort: true,
            location: 0,
            threshold: 0.4,
            distance: 100,
        };
        this.recordingsFuseOptions = {
            ...fuseOptions,
            keys: [
                'artist-credit.artist.name',
                'artist-credit.artist.aliases.name',
                'artist-credit.artist.sort-name',
                'artist-credit.artist.aliases.sort-name',
            ],
        };
        this.releaseGroupsFuseOptions = {
            ...fuseOptions,
            keys: [
                'artist-credit.artist.name',
                'artist-credit.artist.aliases.name',
                'artist-credit.artist.sort-name',
                'artist-credit.artist.aliases.sort-name',
            ],
        };

        this.coverArtArchiveApi = new CoverArtArchiveApi();

        this.verbose = verboseLogging;
        this.logVerbose = verboseLogging ? Logc.debug : (() => {});

        Logc.info('Initialized!');
    }

    private logVerbose(...args: any[]) {}

    private getLuceneQueryForAlbum(album: string): [ [string, number][], [string, number][] ] {
        const releasegroupQuery: [string, number][] = [];
        const releaseQuery: [string, number][] = [];

        releasegroupQuery.push([ `releasegroup:"${album}"`, 100 ]);
        releaseQuery.push([ `release:"${album}"`, 90 ]);

        const [ albumProximitySearch, albumWords ] = luceneProximitySearchBasedOnNumberOfWords(album, LUCENE_WORDS_PROXIMITY);
        if (albumProximitySearch !== undefined) {
            releasegroupQuery.push([ `releasegroup:${albumProximitySearch}`, 70 ]);
            releaseQuery.push([ `release:${albumProximitySearch}`, 60 ]);
        }

        if (albumWords.length > 5) {
            // Also perform partial search on each half of the string if there are more than 5 words
            const [t2] = luceneProximitySearchBasedOnNumberOfWords(albumWords.slice(0, Math.ceil(albumWords.length / 2)).join(' '), LUCENE_WORDS_PROXIMITY);
            if (t2 !== undefined) {
                releasegroupQuery.push([ `releasegroup:${t2}`, 65 ]);
                releaseQuery.push([ `release:${t2}`, 55 ]);
            }

            const [t3] = luceneProximitySearchBasedOnNumberOfWords(albumWords.slice(Math.ceil(albumWords.length / 2)).join(' '), LUCENE_WORDS_PROXIMITY);
            if (t3 !== undefined) {
                releasegroupQuery.push([ `releasegroup:${t3}`, 64 ]);
                releaseQuery.push([ `release:${t3}`, 54 ]);
            }
        }

        return [ releasegroupQuery, releaseQuery ];
    }

    private async getLuceneQueryForArtists(artists: string[] | undefined, album: string): Promise<[ [string, number][], boolean ]> {
        const artistQuery: [string, number][] = [];
        let withArtistId = false;

        if (artists !== undefined && !isNullUndefinedOrEmpty(artists[0])) {
            if (album.split(' ').filter(s => s.length > 0).length <= 2) {
                // The album name has 2 words or less, so it's probably pretty common.
                // If the given artist name is an alias rather than their real name, we could potentially have to
                //   page through the results to find the album we are actually looking for (since its name is assumed to be a common one);
                //   in this case it's preferable to search for the artist id first.
                let mbSearchResult: IArtistList;
                try {
                    const query = `artist:"${artists[0]}"^100 OR primary_alias:"${artists[0]}"^10 OR alias:"${artists[0]}"`;
                    this.logVerbose('--> searchArtist()', { query });
                    mbSearchResult = await this.api.searchArtist(query, 0, MUSICBRAINZ_SEARCH_LIMIT);
                    this.logVerbose('    mbSearchResult:', mbSearchResult);

                    const artist: IArtistMatch | null = mbSearchResult.artists?.[0] ?? null;
                    if (artist) {
                        artistQuery.push([ `arid:${artist.id}`, 80 ]);
                        withArtistId = true;
                    }
                } catch (err) {
                    Logc.error('ERROR', err);
                }
            }
            if (artistQuery.length === 0) {
                artistQuery.push([ `artist:"${artists[0]}"`, 80 ]);
            }
        }

        return [ artistQuery, withArtistId ];
    }

    // NOTE: Resources:
    // Musicbrainz search: https://musicbrainz.org/doc/Development/XML_Web_Service/Version_2/Search
    // Lucene search: https://lucene.apache.org/core/7_7_2/queryparser/org/apache/lucene/queryparser/classic/package-summary.html#package.description

    /**
     * @param track
     * @returns An array of cover art objects,
     *          undefined if the specified track doesn't have enough information,
     *          null if the service couldn't find a cover art.
     */
    async findCoverArtByReleaseGroup(track: MusicTrack): Promise<MusicbrainzReleaseCoverArt[] | undefined | null> {
        if (isNullUndefinedOrEmpty(track.album)) return undefined;

        const _album = luceneEscape(track.album)!;
        const _artists = track.artists?.map(artist => luceneEscape(artist)!);

        Logc.debug('findCoverArt', track);

        //  Build Lucene query string
        // ===========================
        const [ rgQueryTerms, rQueryTerms ] = this.getLuceneQueryForAlbum(_album);
        const [ aQueryTerms, withArtistId ] = await this.getLuceneQueryForArtists(_artists, _album);

        const queryTerms: string[] = [];
        if (aQueryTerms.length > 0 && !withArtistId) {
            // ((releasegroup OR release) AND (artist))
            const albumQuery1 = `(${luceneOR(rgQueryTerms, b => b * 2)} OR ${luceneOR(rQueryTerms, b => b * 2)})`;
            const query1 = `(${albumQuery1} AND ${luceneOR(aQueryTerms)})`;

            // (releasegroup OR release)
            // NOTE: `query2` is the same query as above except without artist.
            //   The query is refined later using fuse.js to handle the cases where the provided artist name
            //   is an alias or the romanization of e.g. a japanese name
            // A perfect match for the artist in `query1` is given a higher priority anyway.
            const query2 = `(${luceneOR(rgQueryTerms)} OR ${luceneOR(rQueryTerms)})`;

            queryTerms.push(query1, query2);
        } else if (aQueryTerms.length > 0 && withArtistId) {
            queryTerms.push(`((${luceneOR(rgQueryTerms)} OR ${luceneOR(rQueryTerms)}) AND ${luceneOR(aQueryTerms)})`);
        } else {
            queryTerms.push(`(${luceneOR(rgQueryTerms)} OR ${luceneOR(rQueryTerms)})`);
        }

        const query = queryTerms.join(' OR ');
        this.logVerbose('--> searchReleaseGroup()');
        this.logVerbose('    queryTerms:', queryTerms);

        //  Search for MB release group
        // =============================
        let mbReleaseGroup: IReleaseGroup | null = null;
        let mbSearchResult: IReleaseGroupList;
        try {
            mbSearchResult = await this.api.searchReleaseGroup(query, 0, MUSICBRAINZ_SEARCH_LIMIT);
            this.logVerbose('    mbSearchResult:', mbSearchResult);
        } catch (err) {
            Logc.error('ERROR', err);
            return null;
        }

        //  Refine the search with fuse.js using artist information
        // =========================================================
        if (mbSearchResult['release-groups'].length > 0) {
            if (_artists !== undefined && _artists.length > 0 && !withArtistId) {
                const fuse = new Fuse(mbSearchResult['release-groups'], this.releaseGroupsFuseOptions);
                const fuseResult = fuse.search(_artists[0]);
                this.logVerbose('--> fuseResult:', fuseResult);

                if (fuseResult.length > 0) {
                    // Sort by combined score: mbScore * (1 - fuseScore)
                    //   mbScore [0..100] -- 100 = closest match
                    //   fuseScore [0..1] -- 0 = perfect match
                    const _fuseResult = fuseResult.map(r => ({ ...r, _score: r.item.score * (1 - (r.score ?? 1)) }));
                    const sortedResult = _.sortBy(_fuseResult, [
                        x => -x._score,
                        x => x.refIndex,
                    ]);
                    if (sortedResult[0]._score >= MIN_COMBINED_SEARCH_SCORE) {
                        mbReleaseGroup = sortedResult[0].item;
                    }
                }
            } else if (mbSearchResult['release-groups'][0].score >= MIN_COMBINED_SEARCH_SCORE) {
                mbReleaseGroup = mbSearchResult['release-groups'][0];
            }
        }

        const mbReleases = mbReleaseGroup?.releases;
        Logc.debug('--> mbReleases:', mbReleases);

        //  Search for cover arts
        // =======================
        if (mbReleases !== undefined && mbReleases.length > 0) {
            const releasesCoverArts: Array<MusicbrainzReleaseCoverArt> = [];

            const promises: Array<Promise<{ release: string; exists: boolean; }>> = [];
            mbReleases.forEach(release => {
                // Check if any front cover exists for this release. If it does, assume all sizes.
                promises.push(new Promise(resolve => {
                    this.coverArtArchiveApi.getFrontExists('release', release.id).then(x => {
                        // TODO: retry if rate limited (x === undefined)
                        resolve({ release: release.id, exists: x === undefined ? false : x });
                    }).catch(() => resolve({ release: release.id, exists: false }));
                }));
            });

            const results = await Promise.all(promises);
            results.forEach(x => {
                if (x.exists) {
                    const mbca: MusicbrainzReleaseCoverArt = { release: x.release, cover: [] };
                    ([ 250, 500, 1200 ] as (250|500|1200)[]).forEach(s => {
                        const url = this.coverArtArchiveApi.getFrontUrl('release', x.release, s);
                        if (url !== undefined && url !== null) {
                            mbca.cover.push({ size: s, url });
                        }
                    });
                    if (mbca.cover.length > 0) releasesCoverArts.push(mbca);
                }
            });

            Logc.debug('--> releasesCoverArts:', releasesCoverArts);
            return releasesCoverArts.length > 0 ? releasesCoverArts : null;
        }

        return null;
    }

    // NOTE: Unused
    async findCoverArtByRecording(track: MusicTrack): Promise<MusicbrainzReleaseCoverArt[] | undefined | null> {
        if (isNullUndefinedOrEmpty(track.title)) return undefined;

        const _title = luceneEscape(track.title);
        const _album = luceneEscape(track.album);
        const _artists = track.artists?.map(artist => luceneEscape(artist)!);

        //  Build Lucene query string
        // ===========================
        const queryTerms: string[] = [];
        const TITLE_PRIORITY = 10;
        const ALBUM_PRIORITY = 11;

        // title query terms
        if (!isNullUndefinedOrEmpty(_title)) {
            const orQ = [
                `recording:/${regexEscape(_title)}/^${TITLE_PRIORITY}`,
                `recording:"${_title}"^${TITLE_PRIORITY - 1}`,
            ].join(' OR ');
            queryTerms.push(`(${orQ})`);
        }

        // album query terms
        if (!isNullUndefinedOrEmpty(_album)) {
            const releaseQueryTerms: Array<{term: string, boost: number}> = [];

            const t0 = `"${_album}"`;
            const [ t1, words ] = luceneProximitySearchBasedOnNumberOfWords(_album, LUCENE_WORDS_PROXIMITY);
            releaseQueryTerms.push({ term: t0, boost: ALBUM_PRIORITY });
            if (t1 !== undefined) releaseQueryTerms.push({ term: t1, boost: ALBUM_PRIORITY - 1 });

            if (words.length > 5) {
                // Also perform partial search on each half of the string if there are more than 5 words
                const [t2] = luceneProximitySearchBasedOnNumberOfWords(words.slice(0, Math.ceil(words.length / 2)).join(' '), LUCENE_WORDS_PROXIMITY);
                const [t3] = luceneProximitySearchBasedOnNumberOfWords(words.slice(Math.ceil(words.length / 2)).join(' '), LUCENE_WORDS_PROXIMITY);
                if (t2 !== undefined) releaseQueryTerms.push({ term: t2, boost: ALBUM_PRIORITY - 2 }); // Same boost value
                if (t3 !== undefined) releaseQueryTerms.push({ term: t3, boost: ALBUM_PRIORITY - 2 }); // Same boost value
            }

            const orQ = releaseQueryTerms.map(q => (q.boost > 1 ? `release:${q.term}^${q.boost}` : `release:${q.term}`)).join(' OR ');
            queryTerms.push(`(${orQ})`);
        }

        if (queryTerms.length === 0) return null;
        Logc.debug('findCoverArt', track);
        this.logVerbose('--> queryTerms', queryTerms);

        //  Search for MB recording
        // =========================
        // TODO: Improve search and match priority
        //       perfect, case-sensitive  >  case-sensitive, starts-with  >  perfect, not case-sensitive  >  not case-sensitive, starts-with
        let mbRecording: IRecording | null = null;
        let mbSearchResult: IRecordingList;
        try {
            mbSearchResult = await this.api.searchRecording(queryTerms.join(' AND '), 0, MUSICBRAINZ_SEARCH_LIMIT);
            this.logVerbose('--> mbSearchResult', mbSearchResult);
        } catch (err) {
            Logc.error('ERROR', err);
            return null;
        }

        // Refine the search using artist information with fuse.js
        if (mbSearchResult.recordings.length > 0) {
            if (_artists !== undefined && _artists.length > 0) {
                const fuse = new Fuse(mbSearchResult.recordings, this.recordingsFuseOptions);
                const fuseResult = fuse.search(_artists[0]);
                this.logVerbose('--> fuseResult', fuseResult);

                if (fuseResult.length > 0) {
                    // Sort by combined score: mbScore * (1 - fuseScore)
                    //   mbScore [0..100] -- 100 = closest match
                    //   fuseScore [0..1] -- 0 = perfect match
                    const _fuseResult = fuseResult.map(r => ({ ...r, _score: r.item.score * (1 - (r.score ?? 1)) }));
                    const sortedResult = _.sortBy(_fuseResult, [
                        x => -x._score,
                        x => x.refIndex,
                    ]);
                    if (sortedResult[0]._score >= MIN_COMBINED_SEARCH_SCORE) {
                        mbRecording = sortedResult[0].item;
                    }
                }
            } else if (mbSearchResult.recordings[0].score >= MIN_COMBINED_SEARCH_SCORE) {
                mbRecording = mbSearchResult.recordings[0];
            }
        }

        const mbReleases = mbRecording?.releases;
        Logc.debug('--> mbReleases', mbReleases);

        //  Search for cover arts
        // =======================
        if (mbReleases !== undefined && mbReleases.length > 0) {
            const releasesCoverArts: Array<MusicbrainzReleaseCoverArt> = [];

            const promises: Array<Promise<{ release: string; exists: boolean; }>> = [];
            mbReleases.forEach(release => {
                // Check if any front cover exists for this release. If it does, assume all sizes.
                promises.push(new Promise(resolve => {
                    this.coverArtArchiveApi.getFrontExists('release', release.id).then(x => {
                        // TODO: retry if rate limited (x === undefined)
                        resolve({ release: release.id, exists: x === undefined ? false : x });
                    }).catch(() => resolve({ release: release.id, exists: false }));
                }));
            });

            const results = await Promise.all(promises);
            results.forEach(x => {
                if (x.exists) {
                    const mbca: MusicbrainzReleaseCoverArt = { release: x.release, cover: [] };
                    ([ 250, 500, 1200 ] as (250|500|1200)[]).forEach(s => {
                        const url = this.coverArtArchiveApi.getFrontUrl('release', x.release, s);
                        if (url !== undefined && url !== null) {
                            mbca.cover.push({ size: s, url });
                        }
                    });
                    if (mbca.cover.length > 0) releasesCoverArts.push(mbca);
                }
            });

            Logc.debug('--> releasesCoverArts', releasesCoverArts);
            return releasesCoverArts.length > 0 ? releasesCoverArts : null;
        }

        return null;
    }
}
