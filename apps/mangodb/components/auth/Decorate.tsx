import Image from 'next/image';

interface DecorativePatternProps {
    className?: string;
    // Rendered width, so next/image can pick a source that fits. Required, and
    // deliberately without a default: it used to default to '100vw' and neither
    // caller is anywhere near that wide, so both spent the whole page's image
    // budget on a panel a few hundred pixels across — and next/image said so on
    // every load.
    sizes: string;
}

export default function DecorativePattern({
    className = '',
    sizes,
}: DecorativePatternProps) {
    return (
        <div className={`relative overflow-hidden ${className}`}>
            <Image
                src="/assets/background.png"
                alt=""
                fill
                priority
                sizes={sizes}
                className="object-fill"
            />
        </div>
    );
}
