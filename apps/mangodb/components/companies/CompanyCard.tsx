import type { CompanyAccountSummary } from '@mangodb/shared';
import CompanyCardContent from './CompanyCardContent';
import CompanyCardShell from './CompanyCardShell';

interface CompanyCardProps {
    company: CompanyAccountSummary;
    onSelect: (companyId: number) => void;
}

export default function CompanyCard({ company, onSelect }: CompanyCardProps) {
    return (
        <CompanyCardShell
            companyName={company.companyName}
            onSelect={() => onSelect(company.companyId)}
        >
            <CompanyCardContent company={company} />
        </CompanyCardShell>
    );
}
