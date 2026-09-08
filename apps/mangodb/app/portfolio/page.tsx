'use client';

import { type MouseEvent, useState } from 'react';
import DeletePortfolioModal from '@/components/ui/DeletePortfolioModal';

type TestPortfolio = {
    portfolio_id: number;
    portfolio_name: string;
    portfolio_description: string;
    development_date: string;
    portfolio_link: string;
};

export default function DeletePortfolioPage() {
    // Test portfolios
    // In the real page, this data will come from your API/database.
    const [portfolios, setPortfolios] = useState<TestPortfolio[]>([
        {
            portfolio_id: 13,
            portfolio_name: 'Test Portfolio 1',
            portfolio_description:
                'This is the first test portfolio for testing the delete functionality.',
            development_date: '2026-09-08',
            portfolio_link: 'https://example.com/test-portfolio-1',
        },
        {
            portfolio_id: 14,
            portfolio_name: 'Test Portfolio 2',
            portfolio_description:
                'This is the second test portfolio for testing the delete functionality.',
            development_date: '2026-09-08',
            portfolio_link: 'https://example.com/test-portfolio-2',
        },
        {
            portfolio_id: 15,
            portfolio_name: 'Test Portfolio 3',
            portfolio_description:
                'This is the third test portfolio for testing the delete functionality.',
            development_date: '2026-09-08',
            portfolio_link: 'https://example.com/test-portfolio-3',
        },
    ]);

    // The portfolio that the user selected to delete
    const [selectedPortfolio, setSelectedPortfolio] =
        useState<TestPortfolio | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Open confirmation modal for a specific portfolio
    const handleOpenModal = (
        event: MouseEvent<HTMLButtonElement>,
        portfolio: TestPortfolio,
    ) => {
        event.preventDefault();
        event.stopPropagation();

        // Remember which portfolio the user clicked
        setSelectedPortfolio(portfolio);
        setIsModalOpen(true);
    };

    // Delete the selected portfolio
    const handleDeletePortfolio = async () => {
        // Make sure a portfolio was selected
        if (!selectedPortfolio) {
            throw new Error('No portfolio selected');
        }

        const token = localStorage.getItem('mangodb.token');

        if (!token) {
            throw new Error('Authentication required');
        }

        setIsDeleting(true);

        try {
            const response = await fetch(
                `http://localhost:4000/portfolios/${selectedPortfolio.portfolio_id}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (!response.ok) {
                const result = await response.json();

                throw new Error(
                    result?.error?.message || 'Failed to delete portfolio',
                );
            }

            // Remove the deleted portfolio from the page
            setPortfolios((currentPortfolios) =>
                currentPortfolios.filter(
                    (portfolio) =>
                        portfolio.portfolio_id !==
                        selectedPortfolio.portfolio_id,
                ),
            );

            // Clear selected portfolio
            setSelectedPortfolio(null);

            // Close modal
            setIsModalOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <main className="min-h-screen p-[3.7vh]">
            {/* Portfolio list */}
            <div className="space-y-6">
                {portfolios.map((portfolio) => (
                    <div
                        key={portfolio.portfolio_id}
                        className="w-full max-w-[500px] rounded-xl border border-[#D6D6D6] bg-[#FFFDF9] p-6 shadow-sm"
                    >
                        <h1 className="mb-3 text-xl font-semibold text-[#171717]">
                            {portfolio.portfolio_name}
                        </h1>

                        <p className="mb-4 text-sm text-[#65798e]">
                            {portfolio.portfolio_description}
                        </p>

                        <div className="mb-4 space-y-2 text-sm text-[#171717]">
                            <p>
                                <span className="font-semibold">
                                    Portfolio ID:
                                </span>{' '}
                                {portfolio.portfolio_id}
                            </p>

                            <p>
                                <span className="font-semibold">
                                    Development Date:
                                </span>{' '}
                                {portfolio.development_date}
                            </p>

                            <p>
                                <span className="font-semibold">
                                    Portfolio Link:
                                </span>{' '}
                                {portfolio.portfolio_link}
                            </p>
                        </div>

                        {/* Delete button for this specific portfolio */}
                        <button
                            type="button"
                            onClick={(event) =>
                                handleOpenModal(event, portfolio)
                            }
                            disabled={isDeleting}
                            className="rounded-button h-[4.44vh] min-h-[40px] w-[10.42vw] min-w-[160px] bg-[#CE473E] text-sm font-[600] text-[#FFFDF9] transition-colors hover:bg-[#B93D35] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CE473E]"
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>

            {/* Delete confirmation popup */}
            <DeletePortfolioModal
                isOpen={isModalOpen}
                onClose={() => {
                    if (!isDeleting) {
                        setIsModalOpen(false);
                        setSelectedPortfolio(null);
                    }
                }}
                onConfirm={handleDeletePortfolio}
                isDeleting={isDeleting}
            />
        </main>
    );
}
