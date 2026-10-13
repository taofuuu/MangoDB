// The navbar preferences the profile menu can switch: its style (colours) and
// its height. The values live in globals.css under [data-nav-theme=…] and
// [data-nav-size=…]; this file only names the choices and moves the
// attributes on <html>.
//
// No React here on purpose: the root layout (a Server Component) imports the
// inline script from this file, and a module that imports hooks cannot be
// loaded there.

export const NAV_THEMES = [
    // The page's own cream (#fffdf9) with a grey line.
    { id: 'figma', label: 'Figma', swatch: '#fffdf9' },
    { id: 'oat', label: 'Oat cream', swatch: '#f7f2e8' },
    { id: 'shadow', label: 'Soft shadow', swatch: '#fffdf9' },
    { id: 'teal-grey', label: 'Teal grey', swatch: '#eef2f3' },
] as const;

export const NAV_SIZES = [
    // 108px is the navbar frame's height in the Figma design.
    { id: 'figma', label: 'Figma (108px)' },
    { id: 'compact', label: 'Compact (64px)' },
] as const;

const NAV_PREFS = {
    theme: {
        storageKey: 'nav-theme',
        attribute: 'data-nav-theme',
        options: NAV_THEMES,
        fallback: 'shadow',
    },
    size: {
        storageKey: 'nav-size',
        attribute: 'data-nav-size',
        options: NAV_SIZES,
        fallback: 'figma',
    },
} as const;

export type NavPref = keyof typeof NAV_PREFS;
export type NavPrefValue<P extends NavPref> =
    (typeof NAV_PREFS)[P]['options'][number]['id'];

export const DEFAULT_NAV_THEME: NavPrefValue<'theme'> =
    NAV_PREFS.theme.fallback;
export const DEFAULT_NAV_SIZE: NavPrefValue<'size'> = NAV_PREFS.size.fallback;

function isValue<P extends NavPref>(
    pref: P,
    value: string | null,
): value is NavPrefValue<P> {
    return NAV_PREFS[pref].options.some((option) => option.id === value);
}

// Runs in <head> before the first paint, so a saved choice never flashes the
// default first. Plain ES5 and a try/catch: localStorage can throw in private
// windows, and then the defaults are the right answer.
export const NAV_THEME_SCRIPT = `(function(){try{${JSON.stringify(
    Object.values(NAV_PREFS).map((pref) => [
        pref.storageKey,
        pref.attribute,
        pref.options.map((option) => option.id),
    ]),
)}.forEach(function(p){var v=localStorage.getItem(p[0]);if(p[2].indexOf(v)>-1)document.documentElement.setAttribute(p[1],v)})}catch(e){}})()`;

export function readNavPref<P extends NavPref>(pref: P): NavPrefValue<P> {
    const { storageKey, fallback } = NAV_PREFS[pref];
    try {
        const saved = localStorage.getItem(storageKey);
        return isValue(pref, saved) ? saved : fallback;
    } catch {
        return fallback;
    }
}

function applyNavPref<P extends NavPref>(
    pref: P,
    value: NavPrefValue<P>,
): void {
    document.documentElement.setAttribute(NAV_PREFS[pref].attribute, value);
}

export function saveNavPref<P extends NavPref>(
    pref: P,
    value: NavPrefValue<P>,
): void {
    applyNavPref(pref, value);
    try {
        localStorage.setItem(NAV_PREFS[pref].storageKey, value);
    } catch {
        // Storage blocked: the choice still applies until the next reload.
    }
}

// Puts every saved preference back on <html>. See Navbar for why.
export function applySavedNavPrefs(): void {
    applyNavPref('theme', readNavPref('theme'));
    applyNavPref('size', readNavPref('size'));
}
