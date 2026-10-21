'use client';

import { useEffect, useState } from 'react';
import type { Category } from '@mangodb/shared';
import { describeError } from './api';
import { listCategories } from './categories';

// The category catalog for a form's chips. `error` is a sentence to show.
export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        listCategories()
            .then((data) => {
                if (!cancelled) setCategories(data);
            })
            .catch((err: unknown) => {
                if (!cancelled) setError(describeError(err));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return { categories, loading, error };
}
