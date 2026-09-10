// next/image throws while rendering when the src host is missing from
// remotePatterns in next.config.ts, which would take the whole page down for
// one bad row. portfolio_image is a plain varchar, so a row can hold anything —
// only our own uploads are safe to hand over, the rest get the placeholder.
// One label, matching next.config.ts's '*.supabase.co': a bare supabase.co or
// a deeper a.b.supabase.co would pass a looser check and then throw anyway.
const STORAGE_HOST = /^[^.]+\.supabase\.co$/;

export function portfolioImageSrc(url: string): string {
    try {
        return STORAGE_HOST.test(new URL(url).hostname)
            ? url
            : '/portfolio-placeholder.svg';
    } catch {
        // Not a URL at all.
        return '/portfolio-placeholder.svg';
    }
}
