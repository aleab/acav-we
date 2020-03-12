export function checkInternetConnection(onsuccess: () => void, onfail: (reason: any) => void) {
    fetch('https://dns.google', {
        method: 'HEAD',
    }).then(onsuccess).catch(onfail);
}
