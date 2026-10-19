// Decorative dots from the design - they carry no data and are not clickable.
// var(), not hex: a style object cannot use a Tailwind class, but it can read
// the same tokens. #C5483E here was one of the four reds the danger merge
// removed, and #F5C24C was a fifth yellow within ΔE 4 of accent.
const DOT_COLORS = [
    'var(--color-brand)',
    'var(--color-accent)',
    'var(--color-danger)',
];

export default function PortfolioDots() {
    return (
        <div className="flex gap-[0.73vw]">
            {DOT_COLORS.map((color) => (
                <span
                    key={color}
                    aria-hidden="true"
                    className="size-[1.41vw] min-h-[14px] min-w-[14px] rounded-full"
                    style={{ backgroundColor: color }}
                />
            ))}
        </div>
    );
}
