import type { PolicySection } from '@/lib/terms';

type PolicySectionsProps = {
    intro: string;
    sections: PolicySection[];
};

// The body of a consent dialog: an intro paragraph, then numbered sections.
export default function PolicySections({
    intro,
    sections,
}: PolicySectionsProps) {
    return (
        <>
            <p className="leading-[1.65]">{intro}</p>
            {sections.map((section) => (
                <section key={section.heading}>
                    <h3 className="mt-[0.5em] type-lg !font-[500]">
                        {section.heading}
                    </h3>
                    <p className="leading-[1.65]">{section.body}</p>
                </section>
            ))}
        </>
    );
}
