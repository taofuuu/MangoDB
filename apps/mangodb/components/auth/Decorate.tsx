import Image from 'next/image';

interface DecorativePatternProps {
    className?: string;
}

export default function DecorativePattern({
    className = '',
}: DecorativePatternProps) {
    return (
        <div className={`relative overflow-hidden ${className}`}>
            <Image
                src="/assets/background.png"
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-fill"
                aria-hidden="true"
            />
        </div>
    );
}
