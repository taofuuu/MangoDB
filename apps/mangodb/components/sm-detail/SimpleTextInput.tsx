import React, { useState, useEffect, useRef } from 'react';

interface SimpleTextInputProps {
    title: string;
    inputHeight?: string | number;
    debounceTimeout?: number;
    onChange?: (value: string) => void;
    validate?: (value: string) => boolean;
}

export const SimpleTextInput: React.FC<SimpleTextInputProps> = ({
    title,
    inputHeight = '40px',
    debounceTimeout = 500,
    onChange,
    validate,
}) => {
    const [inputValue, setInputValue] = useState<string>('');

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
            <label style={styles.label}>{title}</label>
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                style={{
                    ...styles.input,
                    height: inputHeight,
                }}
                placeholder="Type here..."
            />
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontFamily: 'sans-serif',
        width: '100%',
    },
    label: {
        fontSize: '14px',
        fontWeight: 600,
        color: '#333',
    },
    input: {
        width: '100%',
        padding: '0 12px',
        fontSize: '14px',
        backgroundColor: '#fff',
        borderRadius: '6px',
        boxSizing: 'border-box',
        outline: 'none',
        transition:
            'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        borderStyle: 'solid',
        borderWidth: '1px',
        borderColor: '#ccc',
    },
};
