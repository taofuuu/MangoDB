import Image from 'next/image';

interface DecorativePatternProps {
    className?: string;
    // Rendered width, so next/image can pick a source that fits.
    sizes?: string;
}

export default function DecorativePattern({
    className = '',
    sizes = '100vw',
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
