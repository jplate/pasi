import type { JSX } from 'react';
import {
    IntroSection,
    HotkeySection,
    AltSection,
    BasicFeaturesSection,
    SampleFileSection,
} from './components/StaticSections.tsx';
import AppShellLoader from './components/client/AppShellLoader';
import MyFooter from './components/Footer';

const staticKeyCmd = (name: string): JSX.Element[] => {
    const split = name.split('+');
    return split.map((s, i) => (
        <span key={i} className='whitespace-nowrap'>
            &thinsp;<kbd>{s}</kbd>&thinsp;
            {i < split.length - 1 && '+'}
        </span>
    ));
};

export default function Home() {
    return (
        <>
            <AppShellLoader />

            <div id='static-sections-fallback'>
                <div id='static-sections-fallback-light' className='flex flex-col lg:items-center'>
                    <div className='flex-1 flex flex-col items-center mb-9'>
                        <IntroSection dark={false} keyCmd={staticKeyCmd} />
                        <HotkeySection dark={false} isMac={false} keyCmd={staticKeyCmd} />
                        <AltSection dark={false} keyCmd={staticKeyCmd} />
                        <BasicFeaturesSection dark={false} keyCmd={staticKeyCmd} />
                        <SampleFileSection dark={false} isMac={false} keyCmd={staticKeyCmd} />
                    </div>
                    <MyFooter />
                </div>
                <div id='static-sections-fallback-dark' className='flex flex-col lg:items-center'>
                    <div className='flex-1 flex flex-col items-center mb-9'>
                        <IntroSection dark={true} keyCmd={staticKeyCmd} />
                        <HotkeySection dark={true} isMac={false} keyCmd={staticKeyCmd} />
                        <AltSection dark={true} keyCmd={staticKeyCmd} />
                        <BasicFeaturesSection dark={true} keyCmd={staticKeyCmd} />
                        <SampleFileSection dark={true} isMac={false} keyCmd={staticKeyCmd} />
                    </div>
                    <MyFooter />
                </div>
            </div>

            <script
                type='application/ld+json'
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'WebApplication',
                        name: 'Pasi',
                        url: 'https://jplate.github.io/pasi',
                        description:
                            'A free, browser-based diagram editor that exports TeXdraw code for use in LaTeX documents.',
                        applicationCategory: 'DesignApplication',
                        operatingSystem: 'Any',
                        offers: {
                            '@type': 'Offer',
                            price: '0',
                            priceCurrency: 'USD',
                        },
                    }),
                }}
            />
        </>
    );
}
