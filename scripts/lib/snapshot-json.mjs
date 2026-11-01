#!/usr/bin/env node
// Two small jobs for scripts/snapshot-api.sh, kept in one file so the shell
// script has one node helper to call instead of several. Node is already a
// dependency of this repo, so this adds no tooling.
//
//   node snapshot-json.mjs get <dot.path>       read one value out of a response
//   node snapshot-json.mjs normalize [options]  turn a response into a snapshot file
//
// Both read the raw response body on stdin.

import { readFileSync } from 'node:fs';

const [, , command, ...args] = process.argv;

function readStdin() {
    try {
        return readFileSync(0, 'utf8');
    } catch {
        return '';
    }
}

// Phase 2 of the refactor flips every response field to camelCase. Looking a
// key up in both spellings means this script keeps working on both sides of
// that flip instead of needing a rename commit of its own.
function keyVariants(key) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const snake = key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    return [key, camel, snake];
}

function valueAt(root, path) {
    let current = root;
    for (const segment of path.split('.')) {
        if (current === null || current === undefined) return undefined;
        if (Array.isArray(current)) {
            current = current[Number(segment)];
            continue;
        }
        if (typeof current !== 'object') return undefined;
        const key = keyVariants(segment).find((k) => k in current);
        if (key === undefined) return undefined;
        current = current[key];
    }
    return current;
}

// ---------------------------------------------------------------------------
// normalize
// ---------------------------------------------------------------------------

// Every rule below matches on the *value*, never on the key name — a snapshot
// tool that keyed on `cert_image` would stop redacting the moment Phase 2
// renamed it to `certImage`, and the diff would fill with noise.
const JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{10,}$/;
const ISO_TIMESTAMP =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const STORAGE_URL = /\/storage\/v1\/object\/public\//;

function flagValues(flag) {
    return args
        .map((arg, i) => (args[i - 1] === flag ? arg : null))
        .filter((arg) => arg !== null);
}

function flagValue(flag, fallback = '') {
    return flagValues(flag)[0] ?? fallback;
}

// --text name=value replaces the text anywhere it appears; --id key=42
// replaces the number 42, but only where it sits under that key. Two flags
// rather than one because a run id is a substring match and a row id must not
// be, or an id of 12 would rewrite half of every phone number.
function parsePairs(flag) {
    return flagValues(flag).map((pair) => {
        const at = pair.indexOf('=');
        return [pair.slice(0, at), pair.slice(at + 1)];
    });
}

// Underscores and case dropped, so an --id written as portfolio_id still
// matches after Phase 2 renames the field to portfolioId.
function normalizeKey(key) {
    return key.toLowerCase().replace(/_/g, '');
}

const textSubs = parsePairs('--text').filter(([, value]) => value !== '');

// The key has to match as well as the number. A new portfolio_id of 25 and a
// seeded listing_id of 25 are the same number meaning two different things,
// and replacing both would put a placeholder on a value that never changes.
const idSubs = parsePairs('--id')
    .filter(([, value]) => value !== '')
    .map(([key, value]) => ({
        key: normalizeKey(key),
        placeholder: `<${key}>`,
        value: Number(value),
    }));

function scrub(value, key) {
    if (Array.isArray(value)) return value.map((item) => scrub(item, key));

    if (value !== null && typeof value === 'object') {
        // Sorted so a re-ordered select is not a diff, and a renamed field is.
        return Object.fromEntries(
            Object.keys(value)
                .sort()
                .map((name) => [name, scrub(value[name], name)]),
        );
    }

    if (typeof value === 'number') {
        const wanted = normalizeKey(key ?? '');
        // Automatic system-generated updates create auto-incrementing projectUpdateIds for the probe project
        if (wanted === 'projectupdateid') return '<project_update_id>';
        const hit = idSubs.find(
            (sub) => sub.value === value && sub.key === wanted,
        );
        return hit ? hit.placeholder : value;
    }

    if (typeof value !== 'string') return value;

    // Date-only strings (YYYY-MM-DD) are deliberately left alone: the wire
    // format of a date is something this refactor is supposed to pin down.
    if (JWT.test(value)) return '<jwt>';
    if (ISO_TIMESTAMP.test(value)) return '<timestamp>';
    if (STORAGE_URL.test(value)) return '<storage-url>';

    let text = value;
    for (const [name, raw] of textSubs) {
        text = text.split(raw).join(`<${name}>`);
    }
    return text;
}

const RESOURCE_PREFIX_KEYS = {
    projects: ['projectid'],
    portfolios: ['portfolioid'],
    certificates: ['certificateid'],
    services: ['serviceid', 'listingid', 'deleteprobeid', 'deletedserviceid'],
    jobs: ['jobid', 'listingid', 'deletedjobid'],
    proposals: ['proposalid'],
    quotations: ['quotationid'],
    companies: ['companyid', 'senderid'],
    admin: ['companyid'],
};

function prefixMatchesKey(prefix, normalizedKey) {
    const allowed = RESOURCE_PREFIX_KEYS[prefix.toLowerCase()];
    return allowed ? allowed.includes(normalizedKey) : true;
}

// The request line carries the same ids the body does — PATCH /portfolios/26 —
// so it drifts every run unless it gets the same treatment.
function scrubRequest(text) {
    let out = text;
    for (const [name, raw] of textSubs) {
        out = out.split(raw).join(`<${name}>`);
    }

    // Replace resource path segment when preceded by known route prefix, e.g. /projects/188
    out = out.replace(
        /\/([a-zA-Z0-9_-]+)\/(\d+)(?![0-9])/g,
        (whole, prefix, numStr) => {
            const num = Number(numStr);
            const hit = idSubs.find(
                (sub) => sub.value === num && prefixMatchesKey(prefix, sub.key),
            );
            return hit ? `/${prefix}/${hit.placeholder}` : whole;
        },
    );

    for (const sub of idSubs) {
        // A query value is replaced only under a param of the same key, as
        // in the body: ?companyId=27 for --id company_id=27, never ?page=27.
        out = out.replace(
            new RegExp('([?&])([^=&]+)=' + sub.value + '(?![0-9])', 'g'),
            (whole, sep, name) =>
                normalizeKey(name) === sub.key
                    ? `${sep}${name}=${sub.placeholder}`
                    : whole,
        );
    }
    return out;
}

function normalize() {
    const raw = readStdin();
    let body;

    if (raw.trim() === '') {
        // 204, or any response with no body at all.
        body = null;
    } else {
        try {
            body = scrub(JSON.parse(raw), '');
        } catch {
            // Not JSON. Keep it visible rather than silently dropping it —
            // an endpoint that stops answering JSON is exactly the kind of
            // regression this script exists to catch.
            body = { '(not JSON)': raw.slice(0, 500) };
        }
    }

    const snapshot = {
        request: scrubRequest(flagValue('--request')),
        status: Number(flagValue('--status', '0')),
        body,
    };

    process.stdout.write(`${JSON.stringify(snapshot, null, 4)}\n`);
}

// ---------------------------------------------------------------------------

if (command === 'get') {
    const raw = readStdin();
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        process.exit(0);
    }
    const found = valueAt(parsed, args[0] ?? '');
    if (found !== undefined && found !== null) {
        process.stdout.write(String(found));
    }
} else if (command === 'normalize') {
    normalize();
} else {
    console.error('usage: snapshot-json.mjs get <dot.path> | normalize [...]');
    process.exit(2);
}
