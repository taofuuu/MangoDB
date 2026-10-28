'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
    ProjectRole,
    ProjectStatus,
    ProjectSummary,
} from '@mangodb/shared';
import PageGate from '@/components/auth/PageGate';
import ProjectCard from '@/components/projects/ProjectCard';
import EmptyState from '@/components/ui/EmptyState';
import { PROJECT_STATUS_CONFIGS } from '@/components/projects/ProjectStatusBadge';
import { describeError } from '@/lib/api';
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

    useEffect(() => {
        let isMounted = true;

        listMyProjects(1, 50)
            .then((data) => {
                if (!isMounted) return;
                setProjects(data.items);
                setError(null);
            })
            .catch((err: unknown) => {
                if (!isMounted) return;
                setError(describeError(err));
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // Switch role tabs for BOTH accounts
    const handleRoleChange = (role: ProjectRole) => {
        setActiveRole(role);
        const params = new URLSearchParams(searchParams.toString());
        params.set('role', role);
        router.replace(`/projects?${params.toString()}`);
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
                        <select
                            id="status-filter"
                            value={statusFilter}
                            onChange={(e) =>
                                setStatusFilter(e.target.value as StatusFilter)
                            }
                            className="rounded-input border border-line bg-surface-white px-3 py-1.5 type-sm text-ink transition focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                        >
                            <option value="ALL">All Statuses</option>
                            {Object.entries(PROJECT_STATUS_CONFIGS).map(
                                ([statusKey, config]) => (
                                    <option key={statusKey} value={statusKey}>
                                        {config.label}
                                    </option>
                                ),
                            )}
                        </select>
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
                                    : 'No projects yet'
                            }
                        />
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {displayProjects.map((project) => (
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
                )}
            </div>
        </div>
    );
}
