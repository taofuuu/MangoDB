'use client';

import { use } from 'react';
import PageGate from '@/components/auth/PageGate';
import ProjectReviewView from '@/components/reviews/ProjectReviewView';
import ReviewPageError from '@/components/reviews/ReviewPageError';
import { parseId } from '@/lib/api';
import { useMyCompany } from '@/lib/useMyCompany';

export default function ProjectReviewPage({
    params,
}: {
    params: Promise<{ projectId: string }>;
}) {
    const { projectId: rawId } = use(params);
    const projectId = parseId(rawId);
    const me = useMyCompany();

    if (me.status !== 'ready') {
        return <PageGate state={me} />;
    }

    if (!projectId) {
        return <ReviewPageError title="Invalid project id" />;
    }

    return <ProjectReviewView projectId={projectId} />;
}
