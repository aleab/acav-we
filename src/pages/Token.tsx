import 'whatwg-fetch';
import Octicon, { Clippy } from '@primer/octicons-react';
import qs from 'qs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RouteProps } from 'react-router';

import Spinner from '../components/Spinner';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_REDIRECT_URI = encodeURIComponent((process.env.NODE_ENV === 'development' ? process.env.SPOTIFY_REDIRECT_URI_DEV : process.env.SPOTIFY_REDIRECT_URI) ?? '');
const SPOTIFY_AUTH_URL = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${SPOTIFY_REDIRECT_URI}`;
const TOKEN_SERVER_URL = process.env.NODE_ENV === 'development' ? process.env.TOKEN_SERVER_URL_DEV : process.env.TOKEN_SERVER_URL;

// eslint-disable-next-line camelcase
type SpotifyAuthError = { error: string; error_description: string; };

export default function Token(props: { location: RouteProps['location'] }) {
    const _search = props.location?.search;
    const queryParams: { code: string } | null = useMemo(() => (_search ? qs.parse(_search, { ignoreQueryPrefix: true }) : null), [_search]);

    const code = queryParams?.code;

    const [ token, setToken ] = useState<string | undefined>();
    const [ error, setError ] = useState<string | undefined>();
    const [ isWaitingToken, setIsWaitingToken ] = useState(!!code);

    const onAuthorizeCallbackDone = useCallback((_token: string | undefined, _error: string | undefined) => {
        window.history.replaceState(null, '', '/token');
        setToken(_token);
        setError(_error);
        setIsWaitingToken(false);
    }, []);

    useEffect(() => {
        if (code) {
            setIsWaitingToken(true);
            fetch(`${TOKEN_SERVER_URL}/authorize_callback?code=${code}&redirect=${SPOTIFY_REDIRECT_URI}`, {
                method: 'GET',
                cache: 'no-cache',
            }).then(async res => {
                let _token: string | undefined;
                let _error: string | undefined;

                const resText = await res.text();
                switch (res.status) {
                    case 200: {
                        if (resText) {
                            _token = resText;
                        } else {
                            console.error('Token | Unexpected no body returned! (200)');
                        }
                        break;
                    }

                    case 429: // Rate-limited
                        _error = resText && resText.length > 0 ? resText : 'You are rate-limited, please try again later.';
                        break;

                    default: {
                        if (resText && resText.length > 0) {
                            let e: SpotifyAuthError | undefined;
                            try {
                                e = JSON.parse(resText);
                            } catch { /**/ }

                            if (e !== undefined && e.error_description) {
                                _error = e.error_description;
                            } else {
                                _error = `Server returned ${res.status}! Open the console to see the whole response.`;
                                console.error(`Server returned ${res.status}:`, resText);
                            }
                        } else {
                            _error = `Server returned ${res.status}!`;
                        }
                        break;
                    }
                }

                onAuthorizeCallbackDone(_token, _error);
            }).catch(err => {
                onAuthorizeCallbackDone(undefined, 'ERROR: Unhandled exception!');
                console.error('ERROR:', err);
            });
        } else {
            setIsWaitingToken(false);
        }
    }, [ code, onAuthorizeCallbackDone ]);

    const inputRef = useRef<HTMLInputElement>(null);

    const onClipboardButtonClick = useCallback(() => {
        if (inputRef.current == null) return;
        inputRef.current.select();
        try {
            document.execCommand('copy');
        } catch {
            console.error("execCommand('copy') is not supported!");
        }
    }, []);
    const onRequestTokenBtnClick = useCallback(() => setIsWaitingToken(true), []);

    return (
      <>
        <h3 className="lead">Request a token</h3>
        <p className="lead">
          Request a token to use the Spotify overlay feature in aCAV-WE.
          <br />
          This token will only be valid for you to insert in Wallpaper Engine for a couple of minutes.
        </p>
        <div className="d-flex flex-column-nowrap gap-y-1">
          <div className="d-flex flex-row-nowrap gap-x-2">
            <div className="input-group">
              <input ref={inputRef} type="text" value={token ?? ''} disabled={!token} readOnly={!!token} />
              <button type="button" className="d-flex button-outline" title={token ? 'Copy' : undefined} disabled={!token} onClick={onClipboardButtonClick}>
                <Octicon icon={Clippy} width={22} height={22} />
              </button>
            </div>
            {
                isWaitingToken ? (
                  <button type="button" style={{ width: '8.5rem' }} disabled>
                    <Spinner color="var(--white-bright)" size=".5rem" gap=".35em" />
                  </button>
                ) : (
                  <a href={SPOTIFY_AUTH_URL} className="button" style={{ width: '8.5rem' }} onClick={onRequestTokenBtnClick}>Request token</a>
                )
            }
          </div>
          {error ? <p className="small text-error">{error}</p> : null}
        </div>
      </>
    );
}
