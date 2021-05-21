import { useCallback, useEffect, useRef, useState } from 'react';

const FontMimeTypes = {
    get TTF() { return 'application/x-font-truetype'; },
    get OTF() { return 'application/x-font-opentype'; },
    get EOT() { return 'application/vnd.ms-fontobject'; },
    get WOFF() { return 'application/font-woff'; },
    get WOFF2() { return 'application/font-woff2'; },
};

function toHex(n: number) {
    return `0${n.toString(16)}`.slice(-2).toUpperCase();
}

function getMimeType(byteArray: ArrayBuffer) {
    let header = '';
    let headerArray = new Uint8Array(byteArray).subarray(0, 4);
    headerArray.forEach(v => { header += toHex(v); });

    let mimeType = null;
    switch (header) {
        case '00000000':
            // This may be EOT; we need the following 30 bytes to be sure.
            header = '';
            headerArray = (new Uint8Array(byteArray)).subarray(0, 34);
            headerArray.forEach(v => { header += toHex(v); });
            if (header.endsWith('4C50')) { mimeType = FontMimeTypes.EOT; }
            break;
        case '00010000': mimeType = FontMimeTypes.TTF; break;
        case '4F54544F': mimeType = FontMimeTypes.OTF; break;
        case '774F4646': mimeType = FontMimeTypes.WOFF; break;
        case '774F4632': mimeType = FontMimeTypes.WOFF2; break;
        default: break;
    }

    return mimeType;
}

function _setCachedLocalClockFont(key: string, dataUrl: string | null) {
    if (dataUrl === null) {
        window.localStorage.removeItem(key);
    } else {
        window.localStorage.setItem(key, dataUrl);
    }
}

async function _getCachedLocalClockFont(key: string) {
    const dataUrl = localStorage.getItem(key);
    return dataUrl !== null && dataUrl.startsWith('data:') ? fetch(dataUrl).then(res => res.blob()) : null;
}

export default function useLocalFontFile(
    shouldUseLocalFontFile: boolean,
    localStorageKey: string,
    onLoaded: () => void,
    onLocalFontSet: () => void,
    onLocalFontUnset: () => void,
): [
    boolean, // showBrowseFontButton
    React.Dispatch<React.SetStateAction<boolean>>, // setShowBrowseFontButton
    string | null, // localFontBlobUrl
    (event: React.ChangeEvent<HTMLInputElement>) => void, // onLocalFontChange
] {
    const [ showBrowseFontButton, setShowBrowseFontButton ] = useState(false);
    const [ localFontBlobUrl, setLocalFontBlobUrl ] = useState<string | null>(null);

    const setCachedLocalClockFont = useCallback((dataUrl: string | null) => _setCachedLocalClockFont(localStorageKey, dataUrl), [localStorageKey]);
    const getCachedLocalClockFont = useCallback(() => _getCachedLocalClockFont(localStorageKey), [localStorageKey]);

    const shouldUseLocalFontFileRef = useRef(shouldUseLocalFontFile);
    useEffect(() => {
        if (shouldUseLocalFontFileRef.current) {
            getCachedLocalClockFont().then(blob => {
                const blobUrl = blob !== null ? URL.createObjectURL(blob) : null;
                setLocalFontBlobUrl(blobUrl);

                if (blobUrl === null) {
                    setShowBrowseFontButton(true);
                    onLocalFontUnset();
                } else {
                    setShowBrowseFontButton(false);
                    onLocalFontSet();
                }
                onLoaded();
            });
        } else {
            onLoaded();
        }
    }, [ getCachedLocalClockFont, onLoaded, onLocalFontSet, onLocalFontUnset ]);

    const onLocalFontChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file !== undefined) {
            const fileReader = new FileReader();
            fileReader.onload = ev => {
                const result = ev.target?.result as ArrayBuffer | null | undefined;
                if (result !== null && result !== undefined) {
                    const mimeType = getMimeType(result) || file.type;
                    if (Object.getOwnPropertyNames(FontMimeTypes).some(v => (FontMimeTypes as any)[v] === mimeType)) {
                        const base64 = window.btoa(new Uint8Array(result).reduce((b64, byte) => b64 + String.fromCharCode(byte), ''));
                        const data = `data:${mimeType};base64,${base64}`;
                        setCachedLocalClockFont(`data:${mimeType};base64,${base64}`);

                        fetch(data).then(res => res.blob()).then(blob => {
                            setLocalFontBlobUrl(URL.createObjectURL(blob));
                            setShowBrowseFontButton(false);
                            onLocalFontSet();
                        });
                    } else {
                        // Invalid font file
                        setShowBrowseFontButton(false);
                        onLocalFontUnset();
                    }
                } else {
                    // ???
                    setShowBrowseFontButton(false);
                    onLocalFontUnset();
                }
            };
            fileReader.readAsArrayBuffer(file);
        } else {
            setCachedLocalClockFont(null);
            setLocalFontBlobUrl(null);
            setShowBrowseFontButton(false);
            onLocalFontUnset();
        }
    }, [ onLocalFontSet, onLocalFontUnset, setCachedLocalClockFont ]);

    return [ showBrowseFontButton, setShowBrowseFontButton, localFontBlobUrl, onLocalFontChange ];
}
