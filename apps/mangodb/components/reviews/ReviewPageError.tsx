import EmptyState from '@/components/ui/EmptyState';

type ReviewPageErrorProps = {
    title: string;
    message?: string | undefined;
    projectId?: number | undefined;
};

export default function ReviewPageError({
    title,
    message,
    projectId,
}: ReviewPageErrorProps) {
    return (
        <main className="min-h-screen bg-surface px-4 py-24 text-ink">
            <div className="mx-auto max-w-4xl">
                <EmptyState
                    title={title}
                    message={message}
                    action={
                        projectId
                            ? {
                                  href: `/projects/${projectId}`,
                                  label: 'Back to project',
                              }
                            : { href: '/projects', label: 'Back to projects' }
                    }
                />
            </div>
        </main>
    );
}
