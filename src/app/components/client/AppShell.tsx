'use client';

import dynamic from 'next/dynamic';
import React, { useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import type { CodeButtonSpec } from '../../Content';
import {
    IntroSection,
    HotkeySection,
    AltSection,
    BasicFeaturesSection,
    ConnectorsSection,
    SampleFileSection,
    ContourExamplesSection,
} from '../Sections.tsx';
import { moonIcon, sunIcon } from '../Icons.tsx';
import Loading from '../../loading';

const MainPanel = dynamic(() => import('./MainPanel.tsx'), {
    ssr: false,
    loading: () => <Loading />,
});

const MyFooter = dynamic(() => import('../Footer.tsx'), { ssr: true });

const getInitialColorScheme = () => {
    const storedMode = localStorage.getItem('color-scheme');
    const systemMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    return storedMode ?? systemMode;
};

const LogoSpan: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            const triggerPoint = 300; // Adjust this value to set when the fadeout should start
            if (window.scrollY > triggerPoint) {
                setIsVisible(false);
            } else {
                setIsVisible(true);
            }
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <span
            className={`pasi-logo text-xl tracking-wide transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
            {/* There's a danger of the logo overlapping the site's content, so we hide the logo on screens under 2xl. 
            The 'pasi-logo' class is added in order to let the logo appear in the same font-family as the MainPanel. */}
            pasi
        </span>
    );
};

// Whitelist map for src URLs:
const URLS: Record<string, string> = {
    TORS0: 'https://raw.githubusercontent.com/jplate/data/main/TORS-diagram_v0.tex',
    TORS1: 'https://raw.githubusercontent.com/jplate/data/main/TORS-diagram_v1.tex',
};

export default function AppShell() {
    const searchParams = useSearchParams();
    const [isMobile, setIsMobile] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window === 'undefined') return false;
        return getInitialColorScheme() === 'dark';
    });
    const [diagramCode, setDiagramCode] = useState<string | null>(null);
    const [isMac, setIsMac] = useState(false);
    const mainPanelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.add('app-shell-hydrating');
        const rafId = window.requestAnimationFrame(() => {
            root.classList.add('app-shell-mounted');
            root.classList.remove('app-shell-hydrating');
        });
        return () => {
            window.cancelAnimationFrame(rafId);
            root.classList.remove('app-shell-hydrating');
            root.classList.remove('app-shell-mounted');
        };
    }, []);

    // Initialize state
    useEffect(() => {
        Object.freeze(Object.prototype); // to prevent prototype pollution

        setIsMobile(matchMedia('(pointer:coarse)').matches && matchMedia('(max-width: 768px)').matches);
        setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);

        const handleWheel = (event: WheelEvent) => {
            const modalOpen = document.body.classList.contains('ReactModal__Body--open');
            if (modalOpen) event.preventDefault(); // Prevent the default scroll behavior
        };

        // Add event listener to disable scrolling if the modal dialog is open
        window.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            window.removeEventListener('wheel', handleWheel);
        };
    }, []);

    // Change color scheme
    useLayoutEffect(() => {
        document.documentElement.classList.remove(isDarkMode ? 'light' : 'dark');
        document.documentElement.classList.add(isDarkMode ? 'dark' : 'light');
        document.body.classList.remove(isDarkMode ? 'light' : 'dark');
        document.body.classList.add(isDarkMode ? 'dark' : 'light');
        window.localStorage.setItem('color-scheme', isDarkMode ? 'dark' : 'light');

        const root = document.querySelector(':root');
        if (root instanceof HTMLElement) {
            root.style.setProperty('color-scheme', isDarkMode ? 'dark' : 'light');
        }
    }, [isDarkMode]);

    // Set diagram code based on query string
    useEffect(() => {
        const src = searchParams.get('src');
        if (!src) return;
        const url = URLS[src];
        if (!url) {
            console.error('Unknown source');
            return;
        }
        console.log(url);

        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(url, { cache: 'force-cache' });
                if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
                const text = await res.text();
                if (!cancelled) {
                    // console.log(`Text received: ${text}`);
                    setDiagramCode(text);
                }
            } catch (err: any) {
                if (!cancelled) {
                    console.error(err.message ?? String(err));
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [searchParams]);

    const key = useCallback(
        (name: string) => {
            if (isMac) name = name.replace(/Ctrl/, '⌘');
            const split = name.split('+');
            return split.map((s, i) => (
                <span key={i} className={clsx(isDarkMode ? 'font-mono' : 'whitespace-nowrap')}>
                    {isDarkMode ? (
                        s
                    ) : (
                        <>
                            &thinsp;<kbd>{s}</kbd>&thinsp;
                        </>
                    )}
                    {i < split.length - 1 && '+'}
                </span>
            ));
        },
        [isDarkMode, isMac]
    );

    const renderCodeButton = useCallback(
        ({ text, code }: CodeButtonSpec) => (
            <button
                className='text-linkcolor hover:text-linkhovercolor'
                onClick={() => {
                    setDiagramCode(code);
                    mainPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
            >
                {text}
            </button>
        ),
        [setDiagramCode, mainPanelRef]
    );

    return (
        <div id='app-shell-root'>
            <div
                id='sticky-top'
                className='sticky-top sticky top-0 bg-transparent z-40 hidden sm:block pointer-events-none'
            >
                <span className='flex items-center justify-between px-2 lg:px-4 2xl:px-6 py-1 lg:py-2'>
                    <LogoSpan />
                    <button
                        className='opacity-60 pointer-events-auto'
                        onClick={() => {
                            setIsDarkMode(!isDarkMode);
                        }}
                    >
                        {isDarkMode ? moonIcon : sunIcon}
                    </button>
                </span>
            </div>
            <main className='flex flex-col lg:items-center'>
                {' '}
                {/* 'flex flex-col' helps to make the sticky top to be actually sticky and to cause the background image to be spread 
                        out over the page instead of being repeated. 'items-center' centers the content but prevents the table rows from laterally 
                        compressing; so we activate it only for larger screens. */}
                {isMobile ? (
                    <div className='text-center text-lg text-white bg-slate-600 px-2 py-2 leading-relaxed'>
                        <p>
                            <strong>Mobile device not supported.</strong>
                        </p>
                        <p>Please access this application from a laptop or desktop.</p>
                    </div>
                ) : (
                    <>
                        <div id='content' className='flex-1 flex flex-col items-center mb-9'>
                            <IntroSection dark={isDarkMode} keyCmd={key} />

                            <div className='hidden lg:block' ref={mainPanelRef}>
                                <MainPanel
                                    dark={isDarkMode}
                                    diagramCode={diagramCode}
                                    reset={() => setDiagramCode(null)}
                                />
                            </div>

                            <HotkeySection dark={isDarkMode} isMac={isMac} keyCmd={key} />

                            <AltSection dark={isDarkMode} keyCmd={key} />

                            <BasicFeaturesSection dark={isDarkMode} keyCmd={key} />

                            <ConnectorsSection
                                dark={isDarkMode}
                                keyCmd={key}
                                renderCodeButton={renderCodeButton}
                            />

                            <SampleFileSection dark={isDarkMode} isMac={isMac} keyCmd={key} />

                            <ContourExamplesSection
                                dark={isDarkMode}
                                keyCmd={key}
                                renderCodeButton={renderCodeButton}
                            />
                        </div>
                        <MyFooter />
                    </>
                )}
            </main>
        </div>
    );
}
