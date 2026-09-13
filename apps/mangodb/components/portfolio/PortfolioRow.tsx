'use client';

import Image from 'next/image';
import type { ServicePortfolio } from '@mangodb/shared';
import type { ExpandedImage } from '@/components/ui/ImageModal';
import PortfolioDots from './PortfolioDots';
import { hasPortfolioImage, portfolioImageSrc } from './portfolioImage';

type PortfolioRowProps = {
    item: ServicePortfolio;
    onEdit: (item: ServicePortfolio) => void;
    onDelete: (item: ServicePortfolio) => void;
    onExpandImage: (image: ExpandedImage) => void;
};

export default function PortfolioRow({
    item,
    onEdit,
    onDelete,
    onExpandImage,
}: PortfolioRowProps) {
    const frameClassName =
        'relative h-[9.26vh] w-[9.9vw] shrink-0 overflow-hidden rounded-[4px]';

    const src = portfolioImageSrc(item.portfolioImage);

    const image = (
        <Image src={src} alt="" fill sizes="10vw" className="object-cover" />
    );

    return (
        <div className="flex w-full items-center gap-[1.25vw] rounded-[2px] border border-line bg-white p-[1.2vh] text-left shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-md">
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

            <div className="min-w-0">
                <h2 className="type-lg leading-tight !font-[700] text-ink">
                    {/* An anchor, not a button: middle-click, copy link and
                        screen readers all expect a link for an external URL. */}
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
            </div>

            {/* ml-auto pushes the footer to the far right of the row */}
            <div className="ml-auto flex items-center gap-[1.25vw] pr-[1vw]">
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
