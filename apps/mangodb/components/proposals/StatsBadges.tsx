// Which proposals the page lists: all of them, or only the rejected ones. UI
// state, not a wire type, so it lives here rather than in packages/shared.
export type ViewMode = 'all' | 'rejected';

interface StatsBadgesProps {
    total: number;
    rejected: number;
    remain: number;
    viewMode: ViewMode;
    onSelectViewMode: (mode: ViewMode) => void;
}

export default function StatsBadges({
    total,
    rejected,
    remain,
    viewMode,
    onSelectViewMode,
}: StatsBadgesProps) {
    return (
        <div className="flex items-center gap-4 select-none">
            {/* Total Badge */}
            <div className="flex items-center text-xs font-semibold rounded-lg overflow-hidden border border-[#e5a024] shadow-sm">
                <span className="bg-[#f3b829] text-gray-800 px-4 py-1.5 min-w-[55px] text-center">
                    Total
                </span>
                <span className="bg-white text-gray-600 px-3 py-1.5 font-normal min-w-[40px] text-center">
                    {total}
                </span>
            </div>

            {/* Rejected Badge */}
            <div className="flex items-center text-xs font-semibold rounded-lg overflow-hidden border border-[#e5a024] shadow-sm">
                <span className="bg-[#f3b829] text-gray-800 px-4 py-1.5 min-w-[55px] text-center">
                    Rejected
                </span>
                <span className="bg-white text-gray-600 px-3 py-1.5 font-normal min-w-[40px] text-center">
                    {rejected}
                </span>
            </div>

            {/* Remain Badge */}
            <div className="flex items-center text-xs font-semibold rounded-lg overflow-hidden border border-[#e5a024] shadow-sm">
                <span className="bg-[#f3b829] text-gray-800 px-4 py-1.5 min-w-[55px] text-center">
                    Remain
                </span>
                <span className="bg-white text-gray-600 px-3 py-1.5 font-normal min-w-[40px] text-center">
                    {remain}
                </span>
            </div>
        </div>
    );
}
