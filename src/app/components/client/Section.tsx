import React, { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

interface SectionProps {
    id: string
    header?: string
    dark: boolean
    children: React.ReactNode
}

const Section = ({ id, header, dark, children }: SectionProps) => {
    const headerRef = useRef<HTMLHeadingElement>(null);
    const sectionRef = useRef<HTMLDivElement>(null);
    const [scrolledPast, setScrolledPast] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (sectionRef.current && headerRef.current && header) {
                const rect = headerRef.current.getBoundingClientRect();
                if (rect.top <= 0) {
                    setScrolledPast(true); // This will make the header move 3rem to the left via tailwind css.
                    // But the resulting new width of the header depends on the actual width of the section, which means that we can't 
                    // use tailwind. So we do the following:
                    const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
                    headerRef.current.style.width = `${sectionRef.current.clientWidth + (2 * fontSize)}px`;
                } else {
                    setScrolledPast(false);
                    headerRef.current.style.width = `${sectionRef.current.clientWidth}px`;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [header]);

    return (
        <section id={id} ref={sectionRef} className={clsx('prose prose-lg xl:max-w-5xl mt-3 mx-4 xl:mx-9 mb-9',
                dark? 'prose-dark': 'prose-light')}>
            {header && 
                <h3 ref={headerRef} className={clsx(
                            scrolledPast && 'md:sticky md:top-0 md:font-normal xl:max-w-6xl xl:transform xl:-translate-x-8', 
                            'transition duration-200'
                        )}>
                    {header}
                </h3>
            }
            {children}
        </section>
    );

}

export default Section;