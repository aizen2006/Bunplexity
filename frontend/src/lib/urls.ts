export const getFaviconUrl = (url: string): string => {
    try {
        const { hostname } = new URL(url);
        return `https://www.google.com/s2/favicons?domain=${hostname}&size=16`;
    } catch {
        return '';
    }
}

export const getHostname = (url:string):string =>{
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return url;
    }
}
