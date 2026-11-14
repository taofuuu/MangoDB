// Ends a sentence that finishes with a name. Company names often end in "Co."
// or "Ltd.", so a period is added only when the text does not already end
// with one (or with ! or ?).
export function endSentence(text: string): string {
    return /[.!?]$/.test(text) ? text : `${text}.`;
}
