'use client';

import Image from 'next/image';
import { useId } from 'react';
import ModalShell from './ModalShell';

// What a page hands over to open one. The caller resolves the src, because it
// is the one that knows where the image came from — a portfolio row falls back
// to a placeholder, a certificate does not.
export type ExpandedImage = {
    title: string;
    src: string;
};

type ImageModalProps = {
    image: ExpandedImage;
    onClose: () => void;
};

// An image at full size, opened by clicking its thumbnail. ModalShell already
// owns Escape, the backdrop click, the scroll lock and the focus trap, so this
// only decides what the panel looks like.
//
// The panel carries no background of its own: the image sits straight on the
// dimmed backdrop, which is what makes it read as the image rather than as a
// form with a picture in it.
export default function ImageModal({ image, onClose }: ImageModalProps) {
    const titleId = useId();

    return (
        <ModalShell
            isOpen
            onClose={onClose}
            labelledBy={titleId}
            backdropClassName="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-[2.6vh]"
            panelClassName="flex w-full max-w-[70vw] flex-col gap-[1.5vh] max-md:max-w-[92vw]"
        >
            <div className="flex items-center justify-between gap-[1vw]">
                <h2
                    id={titleId}
                    className="truncate type-lg !font-[700] text-white"
                >
                    {image.title}
                </h2>

                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close image"
                    className="shrink-0 cursor-pointer px-[0.5vw] type-lg text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                    ✕
                </button>
            </div>

            {/* object-contain, unlike a card thumbnail's object-cover:
                expanding an image to look at it and then cropping it defeats
                the point. */}
            <div className="relative h-[72vh] w-full">
                <Image
                    src={image.src}
                    alt={image.title}
                    fill
                    sizes="70vw"
                    className="object-contain"
                />
            </div>
        </ModalShell>
    );
}
