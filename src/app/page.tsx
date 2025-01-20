'use client';

import dynamic from 'next/dynamic';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import clsx from 'clsx/lite';
import { pasi, hotkeys } from './components/client/MainPanel';

const MainPanel = dynamic(() => import('./components/client/MainPanel.tsx'), { ssr: false });
const SectionComp = dynamic(() => import('./components/client/Section.tsx'), { ssr: false });
const Footer = dynamic(() => import('./components/client/Footer.tsx'), { ssr: false });

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

export default function Home() {
    const [isMobile, setIsMobile] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isMac, setIsMac] = useState(false);

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
                {' '}
                {/* This way we don't need to pass the dark prop every time we start a section. */}
                {children}
            </SectionComp>
        ),
        [isDarkMode]
    );

    const hyphens = (
        <>
            -----<span className='hidden md:inline'>-------------</span>
        </>
    );

    return (
        <>
            {' '}
            {/* We're returning a fragment. */}
            <div id='sticky-top' className='sticky-top sticky top-0 bg-transparent z-40 hidden sm:block'>
                <span className='flex items-center justify-between px-2 lg:px-4 2xl:px-6 py-1 lg:py-2'>
                    <LogoSpan />
                    <button
                        className='opacity-60'
                        onClick={() => {
                            setIsDarkMode(!isDarkMode);
                        }}
                    >
                        {isDarkMode ? (
                            <svg
                                xmlns='http://www.w3.org/2000/svg'
                                fill='none'
                                viewBox='0 0 24 24'
                                strokeWidth={1.5}
                                stroke='currentColor'
                                className='w-6 h-6'
                            >
                                {' '}
                                {/* moon icon */}
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    d='M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z'
                                />
                            </svg>
                        ) : (
                            <svg
                                xmlns='http://www.w3.org/2000/svg'
                                fill='none'
                                viewBox='0 0 24 24'
                                strokeWidth={1.5}
                                stroke='currentColor'
                                className='w-6 h-6'
                            >
                                {' '}
                                {/* sun icon */}
                                <path
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    d='M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z'
                                />
                            </svg>
                        )}
                    </button>
                </span>
            </div>
            <main className='flex flex-col lg:items-center'>
                {' '}
                {/* 'flex flex-col' helps to make the sticky top to be actually sticky and to cause the background image to be spread 
        out over the page instead of being repeated. 'items-center' centers the content but prevents the table rows from laterally compressing; so we activate it only
        for larger screens. */}
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
                            <Section id='intro-section'>
                                <p>
                                    <strong>
                                        {hyphens}UNDER CONSTRUCTION{hyphens}
                                    </strong>
                                </p>
                                <p>
                                    Suppose you’re writing a paper in LaTeX and want to make a quick diagram
                                    to include in your text.
                                </p>
                                <p>Here you can do that.</p>
                                <p>
                                    To create a diagram, start by selecting one or (with shift-click) more
                                    locations on the canvas below
                                    <span className='xl:hidden'>
                                        {' '}
                                        (if none is visible, you may need to zoom out or increase your screen
                                        size)
                                    </span>
                                    , and then click either the {pasi('Node')} or the {pasi('Contour')}{' '}
                                    button. To manipulate your diagram, you can drag nodes around, add labels
                                    to nodes, connect nodes with arrows, etc. When you’re done, click the{' '}
                                    {pasi('Generate')} button to have the LaTeX code displayed in the text
                                    area below the canvas. To use that code in your document, you’ll need
                                    Peter Kabal’s{' '}
                                    <a
                                        href='https://ctan.org/pkg/texdraw'
                                        target='_blank'
                                        rel='noopener noreferrer'
                                    >
                                        <i>texdraw</i>
                                    </a>
                                    &nbsp; package. You can also load diagrams from previously generated code,
                                    using the {pasi('Load')} button.
                                </p>
                            </Section>
                            <Suspense fallback={<div>Loading...</div>}>
                                <div className='hidden lg:block'>
                                    <MainPanel dark={isDarkMode} />
                                </div>
                            </Suspense>
                            <Section id='keyboard-commands' header='Keyboard commands'>
                                <p>
                                    The following keyboard commands are available for editing the diagram
                                    displayed on the canvas. For editing the <i>texdraw</i> code in the text
                                    area, the usual commands (including {key('Ctrl+Z')} and{' '}
                                    {isMac ? key('Shift+⌘+Z') : key('Ctrl+Y')} for &lsquo;undo&rsquo; and
                                    &lsquo;redo&rsquo;) are also available. To select a single node out of a
                                    group, hold {key('Ctrl')} pressed while clicking on it.
                                </p>
                                <table>
                                    <colgroup>
                                        <col className='max-w-[150px]' />
                                    </colgroup>
                                    <thead>
                                        <tr className='border-b-2 border-btnborder/50'>
                                            <th className='text-left px-4 py-3'>Shortcut</th>
                                            <th className='text-left px-4 py-3'>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {hotkeys.map((it, i, arr) => (
                                            <tr
                                                key={i}
                                                className={clsx(
                                                    i % 2 === 0
                                                        ? isDarkMode
                                                            ? 'bg-btnbg/33'
                                                            : 'bg-btnbg/40'
                                                        : 'bg-btnbg/10',
                                                    i === arr.length - 1
                                                        ? 'border-b-4 border-btnborder/50'
                                                        : ''
                                                )}
                                            >
                                                {/* In light mode, we use the elaborate <kbd> styling provided by tailwind typography, with its box shadows and borders (which require a greater line height). 
                          In dark mode, these shadows don't really look good and are hardly visible, so we default to monospace font. */}
                                                <td
                                                    className={clsx(
                                                        'px-4 py-2',
                                                        isDarkMode ? '' : 'leading-7'
                                                    )}
                                                >
                                                    {it.rep.map((keyName, j, arr) => (
                                                        <React.Fragment key={j}>
                                                            {key(keyName)}
                                                            {j < arr.length - 1 && <>, </>}
                                                        </React.Fragment>
                                                    ))}
                                                </td>
                                                <td className='pl-4 pr-6 py-2'>
                                                    {isDarkMode && it.descrDark ? it.descrDark : it.descr}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Section>

                            <Section id='alternatives-section' header='Alternative apps'>
                                <p>The following are a few other editors that also export LaTeX code:</p>
                                <ul>
                                    <li>
                                        <a
                                            href='https://sourceforge.net/projects/dia-installer/?source=directory'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                        >
                                            <i>Dia</i>
                                        </a>
                                        , a desktop application specializing on diagrams, with a wide variety
                                        of export options.
                                    </li>
                                    <li>
                                        <a
                                            href='https://inkscape.org/'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                        >
                                            <i>Inkscape</i>
                                        </a>
                                        , a fully-featured desktop SVG editor, also allows the creation of
                                        diagrams.
                                    </li>
                                    <li>
                                        <a
                                            href='https://enjoysmath.github.io/quiver-bee/'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                        >
                                            <i>Quiver</i>
                                        </a>
                                        , a powerful web-based editor that specializes on commutative
                                        diagrams.
                                    </li>
                                    <li>
                                        <a
                                            href='https://tpx.sourceforge.net/'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                        >
                                            <i>TpX</i>
                                        </a>
                                        , another desktop application, superficially similar to <i>Dia</i>.
                                    </li>
                                </ul>
                                Web-based diagram editors that do not (as of this writing) export LaTeX code
                                include{' '}
                                <a href='https://app.diagrams.net/' target='_blank' rel='noopener noreferrer'>
                                    <i>draw.io</i>
                                </a>
                                ,{' '}
                                <a href='https://excalidraw.com/' target='_blank' rel='noreferrer'>
                                    <i>Excalidraw</i>
                                </a>
                                , and{' '}
                                <a href='https://tldraw.com/' target='_blank' rel='noopener noreferrer'>
                                    <i>tldraw</i>
                                </a>
                                .{' '}
                            </Section>

                            <Section id='design-principles' header='Basic design features'>
                                <ol>
                                    <li>
                                        <span className='font-bold'>Simplicity.</span> Any diagram in{' '}
                                        <i>pasi</i> consists of two basic building blocks:{' '}
                                        <em>entity nodes</em> and <em>contour nodes</em>. Any label is
                                        attached to one of these nodes; and any connector (i.e., line or
                                        arrow) runs between two of these nodes, or from one node back to
                                        itself.
                                    </li>
                                    <li>
                                        <span className='font-bold'>Ease of precise positioning.</span> With
                                        the cursor keys (or {key('W')}, {key('A')}, {key('S')}, {key('D')}),
                                        it is possible to position selected items to a precision of a tenth of
                                        a pixel. The exact coordinates of an item can be inspected and
                                        manipulated in the {pasi('Editor')} tab. In addition, while dragging
                                        items across the canvas, the user can take advantage of three kinds of
                                        &lsquo;snapping&rsquo; behavior: to the centers of contours, to the
                                        centers of nodes, and to a variable grid.
                                    </li>
                                    <li>
                                        <span className='font-bold'>Exporting LaTeX code.</span> While it is
                                        of course possible to tell LaTeX to include image files in its output,
                                        a major advantage of having it create a diagram from LaTeX code is
                                        that this approach allows the diagram code to make use (e.g., in the
                                        text of a label) of commands defined elsewhere in the document. The
                                        font of the labels will also normally match that of the rest of the
                                        document.
                                    </li>
                                    <li>
                                        <span className='font-bold'>
                                            Freedom to design one&rsquo;s own shapes.
                                        </span>{' '}
                                        While each <em>contour</em> consists of eight nodes carrying
                                        information about the control points of their connecting curves, it is
                                        easy to add or delete nodes, and to modify their respective{' '}
                                        properties. A few examples of how different shapes can be created in
                                        this way are described <a href='#contour-examples'>below</a>.
                                    </li>
                                </ol>
                            </Section>

                            <Section id='connectors' header='Connectors'>
                                <p>
                                   To create a <em>connector</em>, select two or more nodes and then click on the {pasi('Create')} button{' '}
                                   (or press {key('Space')}), having selected the desired kind of connector in the adjacent menu.
                                </p>
                                <p>
                                   One thing to note about connectors is that, roughly speaking, they are implemented as odd-looking entity nodes.{' '}
                                   Normally, an entity node is represented on the canvas by a circle. In the case of a connector, there is a circle, too, but usually{' '}
                                   it is invisible, the only visible part being a line or arrow connecting two nodes. (Of course, in a natural sense of the word,{' '}
                                   a connector <i>just is</i> that line or arrow.) The circle only becomes visible when one clicks somewhere near the center of the{' '}
                                   line or arrow. 
                                </p>
                                <p>
                                   The reason for this somewhat unusual design is that <i>pasi</i> has originally been developed with the aim of facilitating{' '}
                                   the creation of a diagrammatic language, and in particular a language that makes it possible to express &lsquo;higher-order&rsquo;{' '}
                                   relationships, i.e., relationships that involve other relationships:
                                </p>
                            </Section>

                            <Section id='contour-examples' header='Contour examples'>
                                <ul>
                                    <li>
                                        <span className='font-bold'>Regular octagon.</span> To draw a{' '}
                                        <em>regular octagon</em>, one can simply select all the nodes of some
                                        eight-node contour and press {key('P')}&mdash;or, at the bottom of the{' '}
                                        {pasi('Editor')} tab, click on the buttons labeled &lsquo;
                                        {pasi('Defaults')}&rsquo;, &lsquo;{pasi('Equalize central angles')}
                                        &rsquo;, and &lsquo;
                                        {pasi('Equalize distances from center')}&rsquo;, in any order. (To
                                        select all the nodes of a given contour, it is normally enough to
                                        click on any one of them or near the contour&rsquo;s center.)
                                    </li>
                                    <li>
                                        <span className='font-bold'>Star of David.</span> For a more
                                        complicated (and controversial) example, suppose you would like to
                                        draw two regular triangles that overlap to form a{' '}
                                        <em>Star of David</em>. The easiest way to do this is to start with a
                                        regular hexagon, which can be created from a standard eight-node
                                        contour by deleting two of its nodes, selecting the remaining six, and
                                        then pressing {key('P')}. Next, press {key('R')}, which will rotate
                                        the hexagon by 30 degrees and make it stand on a vertex. Finally,
                                        select any three nodes of the hexagon that form a regular{' '}
                                        triangle, and press {key('G')}. This will create a new group
                                        consisting of those same three nodes (defining a new, triangular
                                        contour) while the remaining three will form a group of their own,
                                        which will define the second triangle.
                                    </li>
                                    <li>
                                        <span className='font-bold'>Pentagram.</span> It is also possible to
                                        change the order in which the nodes of a contour are connected to each
                                        other. For example, to create a <em>pentagram</em>, you would
                                        typically start with a regular pentagon. Having selected all the nodes
                                        of such a pentagon, by pressing {key('H')} you can deactivate the
                                        node&rsquo;s membership in the pentagon&rsquo; &lsquo;node
                                        group&rsquo;. Now you can select them again in the appropriate order,
                                        and, by pressing {key('G')}, form a new group in which they will all be
                                        connected in the same order in which they have just been selected.
                                    </li>
                                    <li>
                                        <span className='font-bold'>Swiss cross.</span> An easy way to draw a{' '}
                                        <em>Swiss cross</em> involves first creating a regular dodecagon.
                                        Starting from a standard contour, select any four of its eight nodes
                                        and press {key('C')} (for &lsquo;copy&rsquo;) to turn it into a
                                        contour with twelve nodes. Select all twelve and press {key('P')} to
                                        turn it into a regular dodecagon. Next, make sure that the{' '}
                                        {pasi('Snap to contour centers')} option in the default{' '}
                                        {pasi('Editor')} tab (which opens whenever you click on the canvas) is
                                        set. Create an <em>entity node</em> somewhere on the canvas and drag
                                        it to the center of the dodecagon you&rsquo;ve just created. Holding{' '}
                                        {key('Ctrl')} pressed, select any one of the four nodes in the NE, SE,
                                        SW, and NW corners of the contour. Holding {key('Ctrl+Shift')}{' '}
                                        pressed, select also the other three (in any order), and finally
                                        select the central entity node as well, again holding{' '}
                                        {key('Ctrl+Shift')} pressed. Now release those keys and press{' '}
                                        {key('U')} to gradually shrink the square of selected contour nodes.
                                        After a few seconds of holding {key('U')} pressed, you&rsquo;ll have a
                                        Swiss cross.
                                    </li>
                                </ul>
                            </Section>
                        </div>
                        <Footer
                            copyRightHolder='Jan Plate'
                            licenseInfo='The source code for this webpage is licensed under the MIT License.'
                            sections={[
                                {
                                    header: 'Links',
                                    contents: [
                                        <a
                                            key='1'
                                            href='https://github.com/jplate/pasi'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                        >
                                            GitHub repository
                                        </a>,
                                        <a
                                            key='2'
                                            href='https://opensource.org/license/MIT'
                                            target='_blank'
                                            rel='noopener noreferrer'
                                        >
                                            License
                                        </a>,
                                    ],
                                },
                                {
                                    header: 'Contact',
                                    contents: [
                                        <>
                                            <span>Email: </span>
                                            <a href='mailto:janplate@gmail.com'>jan.plate@gmail.com</a>
                                        </>,
                                        <>
                                            <span>&#120143;: </span> {/* Twitter */}
                                            <a
                                                href='https://x.com/jan_plate'
                                                target='_blank'
                                                rel='noopener noreferrer'
                                            >
                                                @jan_plate
                                            </a>
                                        </>,
                                    ],
                                },
                            ]}
                        />
                    </>
                )}
            </main>
        </>
    );
}
