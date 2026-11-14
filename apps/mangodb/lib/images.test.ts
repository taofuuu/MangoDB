import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isStorageImage } from './images';

const PUBLIC = '/storage/v1/object/public/portfolio/a.png';

test('accepts a public file on one of our projects', () => {
    assert.equal(
        isStorageImage(`https://vlwzyfljwrkefezphuzo.supabase.co${PUBLIC}`),
        true,
    );
});

test('refuses anything next/image would throw on', () => {
    for (const url of [
        `https://someoneelse.supabase.co${PUBLIC}`,
        `http://vlwzyfljwrkefezphuzo.supabase.co${PUBLIC}`,
        'https://vlwzyfljwrkefezphuzo.supabase.co/storage/v1/object/sign/q.pdf',
        'not a url',
        null,
    ]) {
        assert.equal(isStorageImage(url), false, String(url));
    }
});
