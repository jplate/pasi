import React from 'react';
import clsx from 'clsx';

interface StaticSectionProps {
    id: string;
    header?: string;
    dark?: boolean;
    children: React.ReactNode;
}

const StaticSection = ({ id, header, dark = false, children }: StaticSectionProps) => {
    return (
        <section
            id={id}
            className={clsx(
                'prose prose-lg max-w-md md:max-w-xl xl:max-w-3xl mt-3 mx-4 2xl:ml-[-150px] mb-9',
                dark ? 'prose-dark' : 'prose-light'
            )}
        >
            {header && <h3>{header}</h3>}
            {children}
        </section>
    );
};

export default StaticSection;
