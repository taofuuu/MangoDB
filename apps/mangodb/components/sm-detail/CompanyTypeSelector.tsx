'use client';

import { CompanyType } from '@/app/register/page';
import React, { useState } from 'react';

interface CompanyTypeSelectorProps {
    title: string;
    companyTypeList: CompanyType[];
    onChange?: (selectedTypes: CompanyType[]) => void;
}

export const CompanyTypeSelector: React.FC<CompanyTypeSelectorProps> = ({
    title,
    companyTypeList,
    onChange,
}) => {
    const [selectedValues, setSelectedValues] = useState<CompanyType[]>([]);

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
            <h3 className="text-md">{title}</h3>

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
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: 'sans-serif',
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
        backgroundColor: '#fff',
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
