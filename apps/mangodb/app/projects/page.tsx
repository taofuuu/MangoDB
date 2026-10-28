'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
    PaginationMeta,
    ProjectRole,
    ProjectStatus,
    ProjectSummary,
} from '@mangodb/shared';
import { ChevronDown } from 'lucide-react';
import PageGate from '@/components/auth/PageGate';
import ProjectCard from '@/components/projects/ProjectCard';
import EmptyState from '@/components/ui/EmptyState';
import Pagination from '@/components/ui/Pagination';
import { PROJECT_STATUS_CONFIGS } from '@/components/projects/ProjectStatusBadge';
import { describeError } from '@/lib/api';
import { PROJECT_PAGE_SIZE } from '@/lib/pagination';
import { listMyProjects } from '@/lib/projects';
import { useMyCompany } from '@/lib/useMyCompany';

type StatusFilter = ProjectStatus | 'ALL';

export default function ProjectsPage() {
    const me = useMyCompany();

    if (me.status !== 'ready') {
        return <PageGate state={me} />;
    }

    return <ProjectsView companyAccountType={me.company.accountType} />;
}

function ProjectsView({ companyAccountType }: { companyAccountType: string }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roleParam = searchParams.get('role');

    // Role view: 'provider' or 'receiver'
    const initialRole: ProjectRole =
        roleParam === 'receiver' || companyAccountType === 'RECEIVER'
            ? 'receiver'
            : 'provider';

    const [activeRole, setActiveRole] = useState<ProjectRole>(initialRole);
    const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [page, setPage] = useState(1);

    useEffect(() => {
        let isMounted = true;

        const loadAllProjects = async () => {
            try {
                let currentPage = 1;
                let all: ProjectSummary[] = [];
                while (true) {
                    const data = await listMyProjects(currentPage, 50);
                    if (!isMounted) return;
                    all = all.concat(data.items);
                    if (
                        currentPage >= data.pagination.totalPages ||
                        data.items.length === 0
                    ) {
                        break;
                    }
                    currentPage++;
                }
                setProjects(all);
                setError(null);
            } catch (err: unknown) {
                if (!isMounted) return;
                setError(describeError(err));
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        loadAllProjects();

        return () => {
            isMounted = false;
        };
    }, []);

    // Switch role tabs for BOTH accounts
    const handleRoleChange = (role: ProjectRole) => {
        setActiveRole(role);
        setPage(1);
        const params = new URLSearchParams(searchParams.toString());
        params.set('role', role);
        router.replace(`/projects?${params.toString()}`);
    };

    const handleStatusChange = (newStatus: StatusFilter) => {
        setStatusFilter(newStatus);
        setPage(1);
    };

    // Filter by role (provider vs receiver)
    const roleFiltered = useMemo(() => {
        if (!projects) return [];
        return projects.filter((p) => p.myRole === activeRole);
    }, [projects, activeRole]);

    // Filter by status
    const displayProjects = useMemo(() => {
        if (!roleFiltered) return [];
        if (statusFilter === 'ALL') {
            return roleFiltered;
        }
        return roleFiltered.filter((p) => p.projectStatus === statusFilter);
    }, [roleFiltered, statusFilter]);

    const totalItems = displayProjects.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PROJECT_PAGE_SIZE));
    const effectivePage = Math.min(page, totalPages);

    const pagedProjects = useMemo(() => {
        const start = (effectivePage - 1) * PROJECT_PAGE_SIZE;
        return displayProjects.slice(start, start + PROJECT_PAGE_SIZE);
    }, [displayProjects, effectivePage]);

    const paginationMeta: PaginationMeta = useMemo(
        () => ({
            page: effectivePage,
            pageSize: PROJECT_PAGE_SIZE,
            totalItems,
            totalPages,
        }),
        [effectivePage, totalItems, totalPages],
    );

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const isBoth = companyAccountType === 'BOTH';
    const title =
        activeRole === 'provider'
            ? 'Your Projects as a Provider'
            : 'Your Projects as a Receiver';

    return (
        <div className="min-h-screen bg-surface px-4 py-8 font-sans text-ink sm:px-8">
            <div className="mx-auto w-full max-w-5xl">
                {/* Role Switcher Tabs (Only if account has BOTH roles) */}
                {isBoth && (
                    <div className="mb-6 flex justify-center">
                        <div className="flex rounded-button bg-fill-muted/50 p-1">
                            <button
                                type="button"
                                onClick={() => handleRoleChange('provider')}
                                className={`rounded-button px-5 py-2 type-sm font-semibold transition ${
                                    activeRole === 'provider'
                                        ? 'bg-surface-white text-brand shadow-xs'
                                        : 'text-ink-soft hover:text-ink'
                                }`}
                            >
                                As Provider
                            </button>
                            <button
                                type="button"
                                onClick={() => handleRoleChange('receiver')}
                                className={`rounded-button px-5 py-2 type-sm font-semibold transition ${
                                    activeRole === 'receiver'
                                        ? 'bg-surface-white text-brand shadow-xs'
                                        : 'text-ink-soft hover:text-ink'
                                }`}
                            >
                                As Receiver
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Header Title */}
                <div className="mb-8 text-center sm:text-left">
                    <h1 className="type-hd !font-[700] text-ink">{title}</h1>
                </div>

                {/* Subheader: Project Count & Status Filter Control */}
                <div className="mb-6 flex flex-col gap-4 border-b border-line/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="type-sm text-ink-soft">
                        {displayProjects.length}{' '}
                        {displayProjects.length === 1 ? 'project' : 'projects'}
                    </span>

                    {/* Status Filter Dropdown */}
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="status-filter"
                            className="type-sm font-medium text-ink-soft whitespace-nowrap"
                        >
                            Status:
                        </label>
                        <div className="relative inline-flex items-center">
                            <select
                                id="status-filter"
                                value={statusFilter}
                                onChange={(e) =>
                                    handleStatusChange(
                                        e.target.value as StatusFilter,
                                    )
                                }
                                className="appearance-none cursor-pointer rounded-full border border-line bg-surface-white pl-4 pr-11 py-2 type-sm text-ink transition hover:border-brand focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-2xs"
                            >
                                <option value="ALL">All Statuses</option>
                                {Object.entries(PROJECT_STATUS_CONFIGS).map(
                                    ([statusKey, config]) => (
                                        <option
                                            key={statusKey}
                                            value={statusKey}
                                        >
                                            {config.label}
                                        </option>
                                    ),
                                )}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4 text-ink-soft" />
                        </div>
                    </div>
                </div>

                {/* Content States */}
                {isLoading ? (
                    <div className="py-24 text-center type-sm text-ink-soft">
                        Loading projects...
                    </div>
                ) : error ? (
                    <div className="py-24 text-center type-sm text-danger">
                        {error}
                    </div>
                ) : displayProjects.length === 0 ? (
                    <div className="py-12">
                        <EmptyState
                            title={
                                statusFilter !== 'ALL'
                                    ? `No ${PROJECT_STATUS_CONFIGS[statusFilter]?.label ?? ''} projects found`
                                    : 'No Project Yet'
                            }
                            message={
                                statusFilter !== 'ALL'
                                    ? undefined
                                    : 'No project for this company yet'
                            }
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-4">
                            {pagedProjects.map((project) => (
                                <ProjectCard
                                    key={project.projectId}
                                    project={project}
                                    onClick={() =>
                                        router.push(
                                            `/projects/${project.projectId}`,
                                        )
                                    }
                                />
                            ))}
                        </div>

                        <Pagination
                            pagination={paginationMeta}
                            onPageChange={handlePageChange}
                            ariaLabel="Projects pagination"
                            isLoading={isLoading}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
