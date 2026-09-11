'use client';

import React, { useState } from 'react';
import { CompanyType } from '../register/CompanyInfoStep';

interface CompanyTypeSelectorProps {
    title: string;
    companyTypeList: CompanyType[];
    onChange?: (selectedTypes: CompanyType[]) => void;
    initValues?: CompanyType[];
    error?: string;
    required?: boolean;
}

export const CompanyTypeSelector: React.FC<CompanyTypeSelectorProps> = ({
    title,
    companyTypeList,
    onChange,
    initValues,
    error,
    required,
}) => {
    const [selectedValues, setSelectedValues] = useState<CompanyType[]>(
        initValues ?? [],
    );

    React.useEffect(() => {
        if (initValues) {
            setSelectedValues(initValues);
        }
    }, [initValues]);

    const handleSelect = (type: CompanyType) => {
        let updatedValues: CompanyType[];

        if (selectedValues.includes(type)) {
            updatedValues = selectedValues.filter((value) => value !== type);
        } else {
            updatedValues = [...selectedValues, type];
        }

        setSelectedValues(updatedValues);

        if (onChange) {
            onChange(updatedValues);
        }
    };

    return (
        <div style={styles.container}>
            <h3 className="text-sm">
                {title}
                {required && <span className="ml-1 text-[#C5483B]">*</span>}
            </h3>

            <div style={styles.optionsGrid}>
                {companyTypeList.map((type) => {
                    const isSelected = selectedValues.includes(type);
                    return (
                        <button
                            key={type}
                            type="button"
                            onClick={() => handleSelect(type)}
                            style={{
                                ...styles.optionButton,
                                ...(isSelected ? styles.selectedButton : {}),
                            }}
                        >
                            {type}
                        </button>
                    );
                })}
            </div>
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
    // title: {
    //     margin: 0,
    //     fontSize: '16px',
    //     fontWeight: 600,
    //     color: '#333',
    // },
    optionsGrid: {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: '8px',
    },
    optionButton: {
        padding: '8px 16px',
        fontSize: '14px',
        backgroundColor: '#FFFDF9',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        outline: 'none',
        // Avoided shorthand 'border: 1px solid #ccc' to prevent conflicts with selected state
        borderStyle: 'solid',
        borderWidth: '1px',
        borderColor: '#497B93',
    },
    selectedButton: {
        backgroundColor: '#497B93',
        color: '#fff',
        // Safely overriding just the color now that styles are split
        borderColor: '#497B93',
    },
};
