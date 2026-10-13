'use client';

import { NAV_THEME_SCRIPT } from '@/lib/navTheme';

// The <head> script that applies the saved navbar style before first paint.
// A Client Component only so `typeof window` can differ: the server sends a
// runnable script, and the browser's render marks it text/plain so React does
// not warn about rendering a <script>. suppressHydrationWarning lets that type
// difference through. Pattern from the Next.js "preventing flash" guide.
export default function NavThemeScript() {
    return (
        <script
            type={
                typeof window === 'undefined' ? 'text/javascript' : 'text/plain'
            }
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: NAV_THEME_SCRIPT }}
        />
    );
}
