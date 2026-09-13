'use client';

type FieldErrorProps = {
    message?: string | null | undefined;
    // Point the input's aria-describedby here so a screen reader reads the
    // message as part of the field rather than as a stray paragraph.
    id?: string | undefined;
};

// Every field's error line, so a message always sits directly under the input
// it is about instead of next to the submit button.
export default function FieldError({ message, id }: FieldErrorProps) {
    if (!message) {
        return null;
    }

    return (
        <p id={id} role="alert" className="mt-[0.46vh] type-sm text-danger">
            {message}
        </p>
    );
}
