'use client';

import Image from 'next/image';
import type { ServicePortfolio } from '@mangodb/shared';
import type { ExpandedImage } from '@/components/ui/ImageModal';
import PortfolioDots from './PortfolioDots';
import { hasPortfolioImage, portfolioImageSrc } from './portfolioImage';

type PortfolioCardProps = {
    item: ServicePortfolio;
    onEdit: (item: ServicePortfolio) => void;
    onDelete: (item: ServicePortfolio) => void;
    onExpandImage: (image: ExpandedImage) => void;
};

export default function PortfolioCard({
    item,
    onEdit,
    onDelete,
    onExpandImage,
}: PortfolioCardProps) {
    // Fixed height so every card lines its image up at the same spot.
    const frameClassName =
        'relative mx-[1.88vw] mt-[2.2vh] h-[16.39vh] overflow-hidden rounded-[4px] max-lg:mx-0 max-lg:h-[22vh]';

    const src = portfolioImageSrc(item.portfolioImage);

    const image = (
        <Image src={src} alt="" fill sizes="19vw" className="object-cover" />
    );

    return (
        <div className="flex h-[37.13vh] flex-col rounded-[2px] border border-line bg-white px-[1.25vw] pt-[3.7vh] pb-[2.5vh] text-left shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-md max-lg:h-auto max-lg:w-full max-lg:px-4">
            <h2 className="type-lg leading-tight !font-[700] text-ink">
                {/* An anchor, not a button: middle-click, copy link and screen
                    readers all expect a link for an external URL. */}
                <a
                    href={item.portfolioLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark"
                >
                    {item.portfolioName}
                </a>
            </h2>

            <p className="mt-[0.3vh] type-md leading-snug !font-[400] text-ink-soft">
                {item.portfolioDescription}
            </p>

            {hasPortfolioImage(item.portfolioImage) ? (
                <button
                    type="button"
                    onClick={() =>
                        onExpandImage({
                            title: item.portfolioName,
                            src,
                        })
                    }
                    aria-label={`Expand the image for ${item.portfolioName}`}
                    className={`${frameClassName} cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark`}
                >
                    {image}
                </button>
            ) : (
                <div className={frameClassName}>{image}</div>
            )}

            {/* mt-auto pins the footer to the bottom of the card */}
            <div className="mt-auto flex items-center justify-between pt-[2vh] pr-[1vw]">
                <div className="flex items-center gap-[1vw]">
                    <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="type-sm !font-[600] text-brand transition-colors hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="type-sm !font-[600] text-danger transition-colors hover:text-danger-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                    >
                        Delete
                    </button>
                </div>

                <PortfolioDots />
            </div>
        </div>
    );
}
