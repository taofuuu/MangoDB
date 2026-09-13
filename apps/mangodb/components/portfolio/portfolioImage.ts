// next/image throws while rendering when the src host is missing from
// remotePatterns in next.config.ts, which would take the whole page down for
// one bad row. portfolioImage is a plain varchar, so a row can hold anything —
// only our own uploads are safe to hand over, the rest get the placeholder.
// One label, matching next.config.ts's '*.supabase.co': a bare supabase.co or
// a deeper a.b.supabase.co would pass a looser check and then throw anyway.
const STORAGE_HOST = /^[^.]+\.supabase\.co$/;

const PLACEHOLDER = '/portfolio-placeholder.svg';

export function portfolioImageSrc(url: string): string {
    try {
        const parsed = new URL(url);

        // remotePatterns pins the protocol too, so http on the right host
        // still throws.
        return parsed.protocol === 'https:' &&
            STORAGE_HOST.test(parsed.hostname)
            ? url
            : PLACEHOLDER;
    } catch {
        // Not a URL at all.
        return PLACEHOLDER;
    }
}

// Whether the row points at an image worth expanding. The placeholder has
// nothing behind it, so a card showing one leaves the frame unclickable rather
// than opening a dialog on a bigger placeholder.
export function hasPortfolioImage(url: string): boolean {
    return portfolioImageSrc(url) !== PLACEHOLDER;
}
