export function parseLocalStorageStringValue(key: string): any | null {
    const lsValue = localStorage.getItem(key);
    if (lsValue && !lsValue.startsWith('"')) {
        // Old versions stored some values as a non JSON-stringified strings.
        localStorage.setItem(key, JSON.stringify(lsValue));
    }
    return JSON.parse(localStorage.getItem(key) as any);
}
