import React, { useState, useEffect, useRef } from 'react';
import FieldError from '@/components/ui/FieldError';

interface SimpleTextInputProps {
    title: string;
    inputHeight?: string | number;
    debounceTimeout?: number;
    onChange?: (value: string) => void;
    validate?: (value: string) => boolean;
    initValue?: string;
    error?: string;
    required?: boolean;
    // The four this form actually uses. React's own HTMLInputTypeAttribute ends
    // in `string & {}`, so it would accept a typo; listing them does not.
    type?: 'text' | 'password' | 'tel' | 'email';
    maxLength?: number;
}

export const SimpleTextInput: React.FC<SimpleTextInputProps> = ({
    title,
    type = 'text',
    inputHeight = '40px',
    debounceTimeout = 500,
    onChange,
    validate,
    initValue,
    error,
    required,
    maxLength,
}) => {
    const [inputValue, setInputValue] = useState<string>(initValue ?? '');

    // Track the last emitted value to prevent duplicate updates when the component rerenders
    const lastEmittedValueRef = useRef<string>('');

    // Report a value once, however many paths reach it — the debounce timer
    // and leaving the field can both fire for the same text.
    const emit = (value: string) => {
        if (!onChange || value === lastEmittedValueRef.current) return;
        lastEmittedValueRef.current = value;
        onChange(value);
    };

    useEffect(() => {
        if (!onChange) return;

        // Guard gate: Only trigger the timer if the text value has genuinely changed from what was last updated
        if (inputValue === lastEmittedValueRef.current) {
            return;
        }

        const timer = setTimeout(() => {
            lastEmittedValueRef.current = inputValue;
            onChange(inputValue);
        }, debounceTimeout);

        return () => clearTimeout(timer);
    }, [inputValue, debounceTimeout, onChange]);

    // Leaving the field reports it now rather than after the debounce. A
    // click on Next or Create Account blurs the field before the click lands,
    // so the button never reads a value from before the last keystrokes.
    const handleBlur = () => emit(inputValue);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        //validate input
        if (validate !== undefined) {
            if (!validate(e.target.value)) {
                return;
            }
        }

        setInputValue(e.target.value);
    };

    return (
        <div style={styles.container}>
            <label className="type-sm">
                {title}
                {required && <span className="ml-1 text-danger">*</span>}
            </label>

            <input
                type={type}
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleBlur}
                maxLength={maxLength}
                style={{
                    ...styles.input,
                    height: inputHeight,
                    borderColor: error
                        ? 'var(--color-danger)'
                        : 'var(--color-brand)',
                }}
                placeholder="Type here..."
            />
            <FieldError message={error} />
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        width: '100%',
    },
    // label: {
    //     fontSize: '14px',
    //     fontWeight: 600,
    //     color: '#333',
    // },
    input: {
        width: '100%',
        padding: '0 12px',
        fontSize: '14px',
        backgroundColor: '#FFFDF9',
        borderRadius: '6px',
        boxSizing: 'border-box',
        outline: 'none',
        transition:
            'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        borderStyle: 'solid',
        borderWidth: '1px',
        borderColor: 'var(--color-brand)',
    },
};
