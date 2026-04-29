
export function parseSourcesFromAssistantContent(content: string) {
    const startTag = "\n<SOURCES>\n";
    const endTag = "\n</SOURCES>\n";
    const start = content.indexOf(startTag);
    const end = content.indexOf(endTag);
    if (start === -1 || end === -1 || end <= start) {
        return [];
    }
    const raw = content.slice(start + startTag.length, end);
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}