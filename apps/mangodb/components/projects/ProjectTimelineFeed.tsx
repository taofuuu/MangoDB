'use client';

import { useState } from 'react';
import {
    Ban,
    CheckCheck,
    ChevronDown,
    ChevronUp,
    CircleX,
    CloudUpload,
    FileCheck,
    FileCheck2,
    FileText,
    Pencil,
    RotateCcw,
    SendHorizontal,
    Trash2,
} from 'lucide-react';

export type TimelineEventType =
    | 'proposal-accepted'
    | 'quotation-uploaded'
    | 'quotation-rejected'
    | 'quotation-deleted'
    | 'quotation-accepted'
    | 'deposit-reported'
    | 'deposit-confirmed'
    | 'progress-update'
    | 'work-submitted'
    | 'work-rejected'
    | 'work-accepted'
    | 'project-cancel';

export type TimelineEvent = {
    id: string;
    type: TimelineEventType;
    title: string;
    date: string;
    description?: string | null | undefined;
    expandable?: boolean;
};

type ProjectTimelineFeedProps = {
    events: TimelineEvent[];
};

function formatSlashDate(iso?: string | null): string {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    } catch {
        return iso;
    }
}

export default function ProjectTimelineFeed({
    events,
}: ProjectTimelineFeedProps) {
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

    const toggleExpand = (id: string) => {
        setExpandedIds((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    if (events.length === 0) {
        return (
            <div className="py-12 text-center type-sm text-ink-soft">
                No timeline events yet.
            </div>
        );
    }

    return (
        <div className="relative pl-7 sm:pl-9">
            {/* Connecting Vertical Line */}
            <div className="absolute left-3 sm:left-4 top-6 bottom-6 w-[2px] bg-brand-light/50 -translate-x-1/2" />

            <div className="flex flex-col gap-3.5">
                {events.map((event) => {
                    const isExpanded = !!expandedIds[event.id];
                    const hasDescription = !!event.description;
                    const canExpand = event.expandable || hasDescription;

                    // Exact styling matching Figma mockup and globals.css:
                    let boxStyle =
                        'bg-surface-white border border-line text-ink';
                    let titleStyle = 'text-ink';
                    let dateStyle = 'text-ink-soft';
                    let icon = <Pencil className="h-5 w-5 text-ink shrink-0" />;

                    switch (event.type) {
                        case 'proposal-accepted':
                            boxStyle =
                                'bg-brand-mist/70 border border-brand-light/40 text-ink';
                            icon = (
                                <FileCheck className="h-5 w-5 text-brand shrink-0" />
                            );
                            break;

                        case 'quotation-uploaded':
                            boxStyle =
                                'bg-accent-tint border border-accent/40 text-ink';
                            icon = (
                                <CloudUpload className="h-5 w-5 text-accent shrink-0" />
                            );
                            break;

                        case 'quotation-rejected':
                            boxStyle =
                                'bg-danger-wash border border-danger/30 text-ink';
                            icon = (
                                <RotateCcw className="h-5 w-5 text-danger shrink-0" />
                            );
                            break;

                        case 'quotation-deleted':
                            boxStyle =
                                'bg-accent-tint border border-accent/40 text-ink';
                            icon = (
                                <Trash2 className="h-5 w-5 text-accent shrink-0" />
                            );
                            break;

                        case 'quotation-accepted':
                            boxStyle =
                                'bg-brand-mist/70 border border-brand-light/40 text-ink';
                            icon = (
                                <FileCheck className="h-5 w-5 text-brand shrink-0" />
                            );
                            break;

                        case 'deposit-reported':
                            boxStyle =
                                'bg-accent-tint border border-accent/40 text-ink';
                            icon = (
                                <FileText className="h-5 w-5 text-accent shrink-0" />
                            );
                            break;

                        case 'deposit-confirmed':
                            boxStyle =
                                'bg-brand-mist/70 border border-brand-light/40 text-ink';
                            icon = (
                                <FileCheck2 className="h-5 w-5 text-brand shrink-0" />
                            );
                            break;

                        case 'progress-update':
                            boxStyle =
                                'bg-surface-white border border-line text-ink shadow-sm';
                            icon = (
                                <Pencil className="h-5 w-5 text-ink shrink-0" />
                            );
                            break;

                        case 'work-submitted':
                            boxStyle =
                                'bg-brand-mist/70 border border-brand-light/40 text-ink';
                            icon = (
                                <SendHorizontal className="h-5 w-5 text-brand shrink-0" />
                            );
                            break;

                        case 'work-rejected':
                            boxStyle =
                                'bg-danger-wash border border-danger/40 text-danger-deep';
                            titleStyle = 'text-danger-deep';
                            dateStyle = 'text-danger/80';
                            icon = (
                                <div className="relative shrink-0">
                                    <SendHorizontal className="h-5 w-5 text-danger" />
                                    <CircleX className="h-3.5 w-3.5 text-danger fill-danger-wash absolute -bottom-1 -left-1 rounded-full stroke-[2.5]" />
                                </div>
                            );
                            break;

                        case 'work-accepted':
                            boxStyle =
                                'bg-brand-light text-surface-white border border-transparent shadow-sm';
                            titleStyle = 'text-surface-white';
                            dateStyle = 'text-surface-white/80';
                            icon = (
                                <CheckCheck className="h-5 w-5 text-surface-white shrink-0 stroke-[2.5]" />
                            );
                            break;

                        case 'project-cancel':
                            boxStyle =
                                'bg-scrollbar text-surface-white border border-transparent shadow-sm';
                            titleStyle = 'text-surface-white';
                            dateStyle = 'text-surface-white/80';
                            icon = (
                                <Ban className="h-5 w-5 text-surface-white shrink-0" />
                            );
                            break;
                    }

                    return (
                        <div
                            key={event.id}
                            className="relative flex items-start"
                        >
                            {/* Horizontal connector line */}
                            <div className="absolute -left-[16px] sm:-left-[20px] top-[24px] w-[16px] sm:w-[20px] h-[2px] bg-brand-light/50" />

                            {/* Node ring circle on the vertical line */}
                            <div className="absolute -left-[20px] sm:-left-[24px] top-[17px] h-3.5 w-3.5 rounded-full border-2 border-brand-light bg-surface-white z-10 -translate-x-1/2" />

                            {/* Event Card Box */}
                            <div
                                onClick={
                                    canExpand
                                        ? () => toggleExpand(event.id)
                                        : undefined
                                }
                                className={`w-full rounded-status px-5 py-3.5 transition-all shadow-xs ${
                                    canExpand
                                        ? 'cursor-pointer hover:shadow-card'
                                        : ''
                                } ${boxStyle}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {icon}
                                        <h4
                                            className={`type-sm !font-[700] truncate ${titleStyle}`}
                                        >
                                            {event.title}
                                        </h4>
                                    </div>

                                    <div className="flex items-center gap-2.5 shrink-0">
                                        <span
                                            className={`type-xs whitespace-nowrap ${dateStyle}`}
                                        >
                                            {formatSlashDate(event.date)}
                                        </span>
                                        {canExpand && (
                                            <button
                                                type="button"
                                                aria-label={
                                                    isExpanded
                                                        ? 'Collapse'
                                                        : 'Expand'
                                                }
                                                className="text-inherit opacity-75 hover:opacity-100 transition-opacity ml-1"
                                            >
                                                {isExpanded ? (
                                                    <ChevronUp className="h-4 w-4" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4" />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Description */}
                                {canExpand && isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-black/10 type-sm whitespace-pre-wrap leading-relaxed opacity-90">
                                        {event.description}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
