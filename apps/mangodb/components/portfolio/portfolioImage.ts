import { isStorageImage } from '@/lib/images';

const PLACEHOLDER = '/portfolio-placeholder.svg';

// Anything that is not one of our own uploads gets the placeholder, rather
// than being handed to next/image to throw on. The host rule itself lives in
// lib/images.ts, because the profile photo needs the same answer.
export function portfolioImageSrc(url: string): string {
    return isStorageImage(url) ? url : PLACEHOLDER;
}

// Whether the row points at an image worth expanding. The placeholder has
// nothing behind it, so a card showing one leaves the frame unclickable rather
// than opening a dialog on a bigger placeholder.
export function hasPortfolioImage(url: string): boolean {
    return portfolioImageSrc(url) !== PLACEHOLDER;
}
