import { SearchServicesPage } from '@/components/searchservices/SearchServicesPage';

// ASSUMPTION: route is /matching, guessed from the header nav item in the
// US3-1 mockup ("MATCHING"). Rename this folder if the real route differs —
// nothing else needs to change.
export default function MatchingPage() {
    return <SearchServicesPage mode="pagination" />;
}
