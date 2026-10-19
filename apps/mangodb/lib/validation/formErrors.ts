import { ApiRequestError, describeError } from '@/lib/api';

// One message per field, keyed by whatever the form calls that field.
export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

// What a failed save leaves the form to show.
export type FormErrors<Field extends string> = {
    // Goes under the input it names.
    fields: FieldErrors<Field>;
    // Everything with no input to sit under: offline, a 500, or a field this
    // form does not render. Null when every message found a field.
    message: string | null;
};

// Sorts an API failure into those two halves. `fields` maps an API field name
// onto the name the form uses for it — often the same word, but the
// certificate form calls certTitle "name".
//
// zod reports an array problem as "companyType.0", so only the part before the
// first dot is matched.
export function toFormErrors<Field extends string>(
    cause: unknown,
    fields: Record<string, Field>,
): FormErrors<Field> {
    // No envelope to read — a proxy, a crash, no network.
    if (!(cause instanceof ApiRequestError)) {
        return { fields: {}, message: describeError(cause) };
    }

    const errors: FieldErrors<Field> = {};
    const unplaced: string[] = [];

    for (const detail of cause.details) {
        const field = fields[detail.field.split('.')[0] ?? ''];
        if (!field) {
            unplaced.push(detail.message);
        } else if (!errors[field]) {
            errors[field] = detail.message;
        }
    }

    const placedAny = Object.keys(errors).length > 0;

    return {
        fields: errors,
        // The envelope's own message is the fallback, but only when nothing
        // landed on a field — otherwise "Request body is invalid" would
        // repeat what the inputs already say.
        message: unplaced[0] ?? (placedAny ? null : cause.message),
    };
}
