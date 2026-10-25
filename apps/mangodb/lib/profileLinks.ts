// Where a company's name links to (US3-7). Another company opens its public
// profile; your own opens /profile/view, the page with your edit links, not
// the read-only copy at /companies/[companyId]. viewerCompanyId is null while
// the signed-in company is still loading, so the link starts out public.
export function companyProfileHref(
    companyId: number,
    viewerCompanyId: number | null,
): string {
    return companyId === viewerCompanyId
        ? '/profile/view'
        : `/companies/${companyId}`;
}
