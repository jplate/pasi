import React from 'react';
import clsx from 'clsx/lite';
import { hotkeys, pasi } from './components/client/Hotkeys';
import Section from './Section';

interface PasiSectionProps {
    dark: boolean;
    isMac?: boolean;
    keyCmd: (s: string) => JSX.Element[];
}

export const IntroSection = ({ dark, keyCmd }: PasiSectionProps) => {
    return (
        <Section id='intro-section' dark={dark}>
            <p>
                Suppose you’re writing a paper in LaTeX and want to make a quick diagram to include in your
                text.
            </p>
            <p>Here you can do that.</p>
            <p>
                To create a diagram, start by selecting one or (with {keyCmd('Shift')}-click) more locations
                on the canvas below
                <span className='xl:hidden'>
                    {' '}
                    (if none is visible, you may need to zoom out or increase your screen size)
                </span>
                , and then click either the {pasi('Node')} or the {pasi('Contour')} button. To manipulate your
                diagram, you can drag nodes around, add labels to nodes, connect nodes with arrows, etc. When
                you’re done, click the {pasi('Generate')} button to have the LaTeX code displayed in the text
                area below the canvas. To use that code in your document, you’ll need Peter Kabal’s{' '}
                <a href='https://ctan.org/pkg/texdraw' target='_blank' rel='noopener noreferrer'>
                    <i>texdraw</i>
                </a>
                &nbsp; package. You can also load diagrams from previously generated code, using the{' '}
                {pasi('Load')} button.
            </p>
        </Section>
    );
};

export const HotkeySection = ({ dark, isMac, keyCmd }: PasiSectionProps) => {
    return (
        <Section id='keyboard-commands' header='Keyboard commands' dark={dark}>
            <p>
                The following keyboard commands are available for editing the diagram displayed on the canvas.
                For editing the <i>texdraw</i> code in the text area, the usual commands (including{' '}
                {keyCmd('Ctrl+Z')} and {isMac ? keyCmd('Shift+⌘+Z') : keyCmd('Ctrl+Y')} for &lsquo;undo&rsquo;
                and &lsquo;redo&rsquo;) are also available. To select a single node out of a group, hold{' '}
                {keyCmd('Ctrl')} pressed while clicking on it.
            </p>
            <table className='w-full'>
                <colgroup>
                    <col className='max-w-[130px]' />
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
                                i % 2 === 0 ? (dark ? 'bg-btnbg/33' : 'bg-btnbg/40') : 'bg-btnbg/10',
                                i === arr.length - 1 ? 'border-b-4 border-btnborder/50' : ''
                            )}
                        >
                            {/* In light mode, we use the elaborate <kbd> styling provided by tailwind typography, with its box shadows and borders (which require a greater line height). 
    In dark mode, these shadows don't really look good and are hardly visible, so we default to monospace font. */}
                            <td className={clsx('px-4 py-2', dark ? '' : 'leading-7')}>
                                {it.rep.map((keyName, j, arr) => (
                                    <React.Fragment key={j}>
                                        {keyCmd(keyName)}
                                        {j < arr.length - 1 && <>, </>}
                                    </React.Fragment>
                                ))}
                            </td>
                            <td className='pl-4 pr-6 py-2'>
                                {dark && it.descrDark ? it.descrDark : it.descr}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Section>
    );
};

export const AltSection = ({ dark }: PasiSectionProps) => {
    return (
        <Section id='alternatives-section' header='Alternative apps' dark={dark}>
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
                    , a desktop application specializing on diagrams, with a wide variety of export options.
                </li>
                <li>
                    <a href='https://inkscape.org/' target='_blank' rel='noopener noreferrer'>
                        <i>Inkscape</i>
                    </a>
                    , a fully-featured desktop SVG editor, also allows the creation of diagrams.
                </li>
                <li>
                    <a
                        href='https://enjoysmath.github.io/quiver-bee/'
                        target='_blank'
                        rel='noopener noreferrer'
                    >
                        <i>Quiver</i>
                    </a>
                    , a powerful web-based editor that specializes on commutative diagrams.
                </li>
                <li>
                    <a href='https://tpx.sourceforge.net/' target='_blank' rel='noopener noreferrer'>
                        <i>TpX</i>
                    </a>
                    , another desktop application, superficially similar to <i>Dia</i>.
                </li>
            </ul>
            Web-based diagram editors that do not (as of this writing) export LaTeX code include{' '}
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
    );
};

export const BasicFeaturesSection = ({ dark, keyCmd }: PasiSectionProps) => {
    return (
        <Section id='design-principles' header='Basic design features' dark={dark}>
            <ol>
                <li>
                    <span className='font-bold'>Simplicity.</span> A diagram in <i>pasi</i> consists of at
                    most three basic kinds of building block: <em>entity</em> nodes, <em>contour</em> nodes,
                    and <em>ornaments</em> (such as labels). Their placement and other properties completely
                    determine the appearance of a diagram.
                </li>
                <li>
                    <span className='font-bold'>Precision.</span> With the cursor keys (or {keyCmd('W')},{' '}
                    {keyCmd('A')}, {keyCmd('S')}, {keyCmd('D')}), it is possible to position items to a
                    precision of one-tenth of a pixel. The exact coordinates of an item can be inspected and
                    adjusted in the {pasi('Editor')} tab. In addition, while dragging items across the canvas,
                    the user can take advantage of three kinds of &lsquo;snapping&rsquo; behavior: to the
                    centers of contours, to the centers of nodes, and to a variable grid.
                </li>
                <li>
                    <span className='font-bold'>LaTeX export.</span> When using LaTeX for typesetting a
                    document, a major advantage of including the document&rsquo;s diagrams in LaTeX-readable
                    form is that this allows for commands defined elsewhere in the text to be used in the
                    diagrams&rsquo; labels. In addition, the font of the labels will automatically match the
                    rest of the document.
                </li>
                <li>
                    <span className='font-bold'>Custom shapes.</span> While each <em>contour</em> initially
                    consists of exactly eight nodes carrying information about the control points of their
                    connecting curves, it is easy to add or delete nodes and to adjust their respective
                    properties. A few examples of how different shapes can be created in this way are
                    described <a href='#contour-examples'>below</a>.
                </li>
            </ol>
        </Section>
    );
};
