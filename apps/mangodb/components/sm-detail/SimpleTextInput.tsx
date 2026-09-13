import React, { useState, useEffect, useRef } from 'react';

interface SimpleTextInputProps {
    title: string;
    inputHeight?: string | number;
    debounceTimeout?: number;
    onChange?: (value: string) => void;
    validate?: (value: string) => boolean;
    initValue?: string;
    error?: string;
    required?: boolean;
    type?: string;
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
            <label className="text-sm">
                {title}
                {required && <span className="ml-1 text-[#C5483B]">*</span>}
            </label>

            <input
                type={type}
                value={inputValue}
                onChange={handleInputChange}
                maxLength={maxLength}
                style={{
                    ...styles.input,
                    height: inputHeight,
                    borderColor: error ? '#C5483B' : '#497B93',
                }}
                placeholder="Type here..."
            />
            {error && <p className="mt-1 text-xs text-[#C5483B]">{error}</p>}
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
        borderColor: '#497B93',
    },
};
