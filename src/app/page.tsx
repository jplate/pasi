'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { pasi } from './components/client/Hotkeys';
import {
    IntroSection,
    HotkeySection,
    AltSection,
    BasicFeaturesSection,
    SampleFileSection,
} from './components/Sections.tsx';
import { moonIcon, sunIcon } from './components/Icons.tsx';
import Loading from './loading';

import relationshipSrcLight from '@/images/relationshipLight.png';
import relationshipSrcDark from '@/images/relationshipDark.png';

const MainPanel = dynamic(() => import('./components/client/MainPanel.tsx'), {
    ssr: false,
    loading: () => <Loading />,
});

const SectionComp = dynamic(() => import('./components/Section.tsx'), { ssr: true });

const MyFooter = dynamic(() => import('./components/Footer.tsx'), { ssr: true });

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

const relationshipCode =
    '\\begin{texdraw}%pasiCodecV1\n\\drawdim pt \\setunitscale 0.75 \n\\linewd 1 \\move(400 380)\\lcir r:12 %E0\n\\textref h:C v:B \\htext(400 394.5){\\vphantom{p}Desdemona}%L0{2 U 0}\n\\linewd 1 \\move(600 380)\\lcir r:12 %E1\n\\textref h:C v:B \\htext(600 394.5){\\vphantom{p}Othello}%L1{2 U 0}\n\\linewd 1 \\move(412 380)\\clvec(420 380)(579.6 380)(587.6 380)\\move(587.6 380)\\lvec(578.3612 383.8268)\\move(587.6 380)\\lvec(578.3612 376.1732)\\linewd 1 \\move(500 380)\\lcir r:5 %A2(0 1){.u7 0 .n 1}\n\\textref h:C v:B \\htext(500 387.5){\\vphantom{p}loves}%L2{2 U 0}\n\\linewd 1 \\move(500 280)\\lcir r:12 %E3\n\\textref h:C v:T \\htext(500 265.5){Iago}%L3{2 U- 0}\n\\linewd 1 \\move(500 292)\\clvec(500 300)(500 360.6)(500 371.6)\\move(500 371.6)\\lvec(496.452 373.447)\\move(500 371.6)\\lvec(503.5481 373.447)%A4(3 2){5 0 .u 0 3.n 1}\n\\textref h:L v:C \\htext(507 330.675){\\small disapproves}%L4{2 0 0}\n\\end{texdraw}';

const pentagonCode =
    '\\begin{texdraw}%pasiCodecV1\n\\drawdim pt \\setunitscale 0.75 \n\\linewd 1 \\move(368 380)\\clvec(375.7333 356.142)(407.2667 258.858)(415 235)\\clvec(440.08 235)(541.92 235)(567 235)\\clvec(574.5839 258.9059)(605.4161 356.0941)(613 380)\\clvec(592.6812 394.7022)(510.3188 454.2978)(490 469)\\clvec(469.7385 454.219)(388.2615 394.781)(368 380)%S0{0; 3; 0,0,|.8,|.8; 0,0,|.8,|.8; 0,0,|.8,|.8; 0,0,|.8,|.8; 0,0,|.8,|.8}\n\\end{texdraw}';

const hexagonCode =
    '\\begin{texdraw}%pasiCodecV1\n\\drawdim pt \\setunitscale 0.75 \n\\linewd 1 \\move(367.02 338.54)\\clvec(377.444 320.5752)(419.576 247.9648)(430 230)\\clvec(450.77 230)(535.19 230)(555.96 230)\\clvec(566.384 247.9648)(608.516 320.5752)(618.94 338.54)\\clvec(608.6115 356.5599)(566.2885 430.4001)(555.96 448.42)\\clvec(535.19 448.42)(450.77 448.42)(430 448.42)\\clvec(419.6715 430.4001)(377.3485 356.5599)(367.02 338.54)%S0{0; 3; 0,0,?.K,?.K; 0,0,?.K,?.K; 0,0,?.K,?.K; 0,0,?.K,?.K; 0,0,?.K,?.K; 0,0,?.K,?.K}\n\\end{texdraw}';

const dodecagonCode =
    '\\begin{texdraw}%pasiCodecV1\n\\drawdim pt \\setunitscale 0.75 \n\\linewd 1 \\move(403 253)\\clvec(416.8018 244.8668)(445.1982 228.1332)(459 220)\\clvec(475.02 220)(507.98 220)(524 220)\\clvec(537.8018 228.1332)(566.1982 244.8668)(580 253)\\clvec(588.1332 266.8018)(604.8668 295.1982)(613 309)\\clvec(613 325.02)(613 357.98)(613 374)\\clvec(604.8668 387.8018)(588.1332 416.1982)(580 430)\\clvec(566.1982 438.1332)(537.8018 454.8668)(524 463)\\clvec(507.98 463)(475.02 463)(459 463)\\clvec(445.1982 454.8668)(416.8018 438.1332)(403 430)\\clvec(394.8668 416.1982)(378.1332 387.8018)(370 374)\\clvec(370 357.98)(370 325.02)(370 309)\\clvec(378.1332 295.1982)(394.8668 266.8018)(403 253)%S0{0; 3; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2}\n\\end{texdraw}';

export default function Home() {
    const searchParams = useSearchParams()
    const [isMobile, setIsMobile] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [diagramCode, setDiagramCode] = useState<string | null>(null);
    const [isMac, setIsMac] = useState(false);
    const mainPanelRef = useRef<HTMLDivElement | null>(null);

    // Initialize state
    useEffect(() => {
        Object.freeze(Object.prototype); // to prevent prototype pollution

        setIsMobile(matchMedia('(pointer:coarse)').matches && matchMedia('(max-width: 768px)').matches);
        setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
        setIsDarkMode(getInitialColorScheme() == 'dark');

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
    useEffect(() => {
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

    interface SectProps {
        id?: string;
        header?: string;
        children: React.ReactNode;
    }

    const Section = useCallback(
        ({ id, header, children }: SectProps) => (
            <SectionComp id={id || ''} header={header} dark={isDarkMode}>
                {/* This way we don't need to pass the dark prop every time we start a section. */}
                {children}
            </SectionComp>
        ),
        [isDarkMode]
    );

    interface CodeButtonProps {
        text: React.ReactNode;
        code: string;
    }

    const CodeButton = useCallback(
        ({ text, code }: CodeButtonProps) => {
            return (
                <button
                    className='text-linkcolor hover:text-linkhovercolor'
                    onClick={() => {
                        setDiagramCode(code);
                        mainPanelRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                >
                    {text}
                </button>
            );
        },
        [setDiagramCode, mainPanelRef]
    );

    return (
        <>
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

                            <Section id='connectors' header='Connectors'>
                                <p>
                                    To create a <em>connector</em>, select two or more nodes and then click on
                                    the {pasi('Create')} button (or press {key('Space')}), having selected the
                                    desired class of connector in the menu immediately above that button.
                                </p>
                                <p>
                                    One thing to note about connectors is that, roughly speaking, they are
                                    implemented as odd-looking entity nodes. <em>Normal</em> entity nodes
                                    appear as circles. In the case of a connector, by contrast, the circle is
                                    usually invisible, and instead the user only sees a line or arrow
                                    connecting two nodes. (Of course, in a natural sense, a connector{' '}
                                    <i>just is</i> that line or arrow.) The circle only becomes visible when
                                    the user clicks somewhere near the center of the line or arrow.
                                </p>
                                <p>
                                    The reason for this somewhat unusual design is that <i>pasi</i> has
                                    originally been developed with the aim of facilitating the creation of
                                    diagrammatic languages, in particular ones that make it possible to
                                    represent &lsquo;higher-order&rsquo; relationships:
                                    relationships&mdash;i.e., instantiations of relations&mdash;that
                                    non-trivially involve other relationships. An example would be
                                    Iago&rsquo;s disapproval of Desdemona&rsquo;s loving Othello:
                                </p>
                                <div className='flex justify-center mb-4'>
                                    <Image
                                        className='bg-canvasbg'
                                        src={isDarkMode ? relationshipSrcDark : relationshipSrcLight}
                                        alt={`Iago disapproving of Desdemona's loving Othello`}
                                        width={380}
                                        style={{
                                            borderRadius: '0.5rem',
                                            border: '0.25rem solid rgb(var(--canvasbg))',
                                        }}
                                        placeholder='blur'
                                        priority
                                    />
                                </div>
                                <p>
                                    (Click <CodeButton text='here' code={relationshipCode} /> to load this
                                    diagram into the app.) The little circle under &lsquo;loves&rsquo;,
                                    together with the horizontal arrow, represents Desdemona&rsquo;s loving
                                    Othello, while Iago&rsquo;s disapproval is represented by the vertical
                                    arrow (which sports a modified arrowhead). The label
                                    &lsquo;disapproves&rsquo; is attached to its own little circle, but the
                                    latter is here invisible thanks to having had its linewidth set to zero.
                                </p>
                            </Section>

                            <SampleFileSection dark={isDarkMode} isMac={isMac} keyCmd={key} />

                            <Section id='contour-examples' header='Contour examples'>
                                <ul>
                                    <li>
                                        <span className='font-bold'>Regular octagon.</span> To create a{' '}
                                        <em>regular octagon</em>, you can simply select all the nodes of some
                                        eight-node contour and press {key('P')}; or, at the bottom of the{' '}
                                        {pasi('Editor')} tab, click on the buttons labeled &lsquo;
                                        {pasi('Defaults')}&rsquo;, &lsquo;{pasi('Equalize central angles')}
                                        &rsquo;, and &lsquo;
                                        {pasi('Equalize distances from center')}&rsquo;, in any order. (To
                                        select all the nodes of a given contour, it is normally enough to
                                        click on any one of them or near the contour&rsquo;s center.)
                                    </li>
                                    <li>
                                        <p>
                                            <span className='font-bold'>Star of David.</span> For a more
                                            complex example (on more than one level), suppose you wish to
                                            create two overlapping regular triangles to form a{' '}
                                            <em>Star of David</em>. The simplest way to do this begins with
                                            creating a regular{' '}
                                            <CodeButton text='hexagon' code={hexagonCode} />. Take a standard
                                            eight-node contour, delete two of its nodes, and select the
                                            remaining six. Then press {key('P')} to convert these into a
                                            regular hexagon.
                                        </p>
                                        <p>
                                            Next, press {key('R')} to rotate the hexagon by 30 degrees, so
                                            that it stands on one of its vertices. To create the triangles,{' '}
                                            select any three nodes that together form a regular triangle, and
                                            press {key('G')}. This will cause these nodes to constitute a new
                                            triangular contour, while the remaining three will form the second
                                            triangle.
                                        </p>
                                    </li>
                                    <li>
                                        <span className='font-bold'>Pentagram.</span> It is also possible to
                                        change the order in which contour nodes are connected, which is useful
                                        for creating shapes like a <em>pentagram</em>. Start with a regular{' '}
                                        <CodeButton text='pentagon' code={pentagonCode} />, select all its
                                        nodes, and then press {key('H')} to deactivate their membership in the
                                        pentagon&rsquo;s &lsquo;node group&rsquo;. (You&rsquo;ll notice that
                                        it&rsquo;s no longer the case that <em>all</em> the nodes get selected
                                        whenever you click on any one of them.) Next, by using {key('Shift')}
                                        -click, select them again in the order in which you want them to be
                                        connected. Finally, press {key('G')} to create a new group. In this
                                        group, those nodes will be connected in the same order in which they
                                        have just been selected.
                                    </li>
                                    <li>
                                        <p>
                                            <span className='font-bold'>Swiss cross.</span> Starting from a
                                            standard contour, select any four of its eight nodes and press{' '}
                                            {key('C')} (for &lsquo;copy&rsquo;) to turn it into a contour with
                                            twelve nodes. Select all of them and press {key('P')} to create a
                                            regular <CodeButton text='dodecagon' code={dodecagonCode} />. Make
                                            sure that the &lsquo;{pasi('Snap to contour centers')}&rsquo;
                                            option (in the default {pasi('Editor')} tab) is selected. Place an
                                            entity node on the canvas and drag it to the center of the
                                            dodecagon.
                                        </p>
                                        <p>
                                            Next, hold {key('Ctrl')} and select any one of the four nodes in
                                            the NE, SE, SW, and NW corners. Holding {key('Ctrl+Shift')},{' '}
                                            select also the other three (in any order) as well as, lastly, the
                                            central entity node. Release the keys and press {key('U')} to
                                            gradually shrink the square of selected nodes. After a few
                                            seconds, you&rsquo;ll have a <i>Swiss cross</i> with a circle in
                                            the center. To remove the circle (the entity node), select it and
                                            press {key('Delete')} or {key('Backspace')}.
                                        </p>
                                    </li>
                                </ul>
                                <div className='flex flex-col items-center mt-12'>
                                    <svg
                                        width='156'
                                        height='156'
                                        xmlns='http://www.w3.org/2000/svg'
                                        pointerEvents='none'
                                    >
                                        <path
                                            d='M 0.5 97.5 C 10.5 97.5, 52.8 97.5, 56.5 97.5 C 56.5 101.2, 56.5 143.5, 56.5 153.5 C 66.5 153.5, 87.5 153.5, 97.5 153.5 C 97.5 143.5, 97.5 101.2, 97.5 97.5 C 101.2 97.5, 143.5 97.5, 153.5 97.5 C 153.5 87.5, 153.5 66.5, 153.5 56.5 C 143.5 56.5, 101.2 56.5, 97.5 56.5 C 97.5 52.8, 97.5 10.5, 97.5 0.5 C 87.5 0.5, 66.5 0.5, 56.5 0.5 C 56.5 10.5, 56.5 52.8, 56.5 56.5 C 52.8 56.5, 10.5 56.5, 0.5 56.5 C 0.5 66.5, 0.5 87.5, 0.5 97.5'
                                            fill='none'
                                            stroke={isDarkMode ? 'rgb(190, 169, 150)' : 'black'}
                                            strokeWidth='1'
                                            strokeDasharray=''
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        ></path>
                                    </svg>
                                </div>
                            </Section>
                        </div>
                        <MyFooter />
                    </>
                )}
            </main>
        </>
    );
}
