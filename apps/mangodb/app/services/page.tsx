import { SearchServicesPage } from '@/components/searchservices/SearchServicesPage';

// Route: /services (mirrors API noun, see docs/conventions.md §2.9)
export default function ServicesPage() {
    return <SearchServicesPage mode="pagination" />;
}
