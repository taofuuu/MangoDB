// The count in "(Search result: N items)": "1 item" for one, "items" otherwise.
export function formatItemCount(count: number): string {
    return `${count} ${count === 1 ? 'item' : 'items'}`;
}
