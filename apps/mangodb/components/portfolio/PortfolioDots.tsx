// Decorative dots from the design - they carry no data and are not clickable.
const DOT_COLORS = ['#497B93', '#F5C24C', '#C5483E'];

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
