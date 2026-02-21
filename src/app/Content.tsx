import React, { type JSX } from 'react';
import clsx from 'clsx';
import { hotkeys, pasi } from './Hotkeys';

export const sampleFile =
    '\\documentclass[twoside,12pt,a4paper]{article}\n\n\\usepackage[utf8]{inputenc}\n\\usepackage{texdraw, lipsum}\n\\usepackage[style=authoryear, backend=biber]{biblatex}\n\n\\begin{document}\n\n\\title{Sample}\n\n\\author{NN}\n\n\\maketitle\n\n\\section{Introduction}\n\n\\lipsum[1] See Figure~\\ref{f1}. \n\n\\lipsum[11]\n\n\\begin{figure}\n\\begin{center}\n\\begin{texdraw}%pasiCodecV1\n\\drawdim pt \\setunitscale 0.75 \n\\linewd 1 \\move(400 380)\\lcir r:12 %E0\n\\textref h:C v:B \\htext(400 394.5){\\vphantom{p}Desdemona}%L0{2 U 0}\n\\linewd 1 \\move(600 380)\\lcir r:12 %E1\n\\textref h:C v:B \\htext(600 394.5){\\vphantom{p}Othello}%L1{2 U 0}\n\\linewd 1 \\move(412 380)\\clvec(420 380)(579.6 380)(587.6 380)\\move(587.6 380)\\lvec(578.3612 383.8268)\\move(587.6 380)\\lvec(578.3612 376.1732)\\linewd 1 \\move(499.976 380)\\lcir r:5 %A2(0 1){.u7 0 .n 1}\n\\textref h:C v:B \\htext(499.976 387.5){\\vphantom{p}loves}%L2{2 U 0}\n\\linewd 1 \\move(500 280)\\lcir r:12 %E3\n\\textref h:C v:T \\htext(500 265.5){Iago}%L3{2 U- 0}\n\\linewd 1 \\move(499.9971 292)\\clvec(499.9952 300)(499.9806 360.6)(499.978 371.6)\\move(499.978 371.6)\\lvec(496.4295 373.4461)\\move(499.978 371.6)\\lvec(503.5256 373.4478)%A4(3 2){5 0 .u 0 3.n 1}\n\\textref h:L v:C \\htext(506.9878 330.675){\\small disapproves}%L4{2 0 0}\n\\end{texdraw}\n\\end{center}\n\\caption{\\label{f1}A dramatic diagram.\n}\n\\end{figure}\n\n\\section{Conclusion}\n\n\\lipsum[21-22]\n\n\\end{document}';

export function IntroSectionContent({ keyCmd }: { keyCmd: (s: string) => JSX.Element[] }) {
    return (
        <>
            <p>
                Suppose you're writing a paper in LaTeX and want to make a quick diagram to include in your
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
                you're done, click the {pasi('Generate')} button to have the LaTeX code displayed in the text
                area below the canvas. To use that code in your document, you'll need Peter Kabal's{' '}
                <a href='https://ctan.org/pkg/texdraw' target='_blank' rel='noopener noreferrer'>
                    <i>TeXdraw</i>
                </a>
                &nbsp; package. (See <a href='#sample-file'>below</a> for a sample file and instructions for{' '}
                <i>Overleaf</i> users.) You can also load diagrams from previously generated code, using the{' '}
                {pasi('Load')} button.
            </p>
        </>
    );
}

interface HotkeyContentProps {
    keyCmd: (s: string) => JSX.Element[];
    dark: boolean;
    isMac?: boolean;
}

export function HotkeySectionContent({ keyCmd, dark, isMac }: HotkeyContentProps) {
    return (
        <>
            <p>
                The following keyboard commands are available for editing the diagram displayed on the canvas.
                For editing the <i>TeXdraw</i> code in the text area, the usual commands (including{' '}
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
                            <td className='px-4 py-2 leading-7'>
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
        </>
    );
}

export function AltSectionContent() {
    return (
        <>
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
        </>
    );
}

export function BasicFeaturesSectionContent({ keyCmd }: { keyCmd: (s: string) => JSX.Element[] }) {
    return (
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
    );
}

export function SampleFileSectionContent({ codeBlock }: { codeBlock: React.ReactNode }) {
    return (
        <>
            <p>
                Here is a sample file that illustrates how <i>TeXdraw</i> code can be used in a LaTeX
                document:
            </p>
            {codeBlock}
            <p>
                If you are using{' '}
                <a href='https://www.overleaf.com/' target='_blank' rel='noopener noreferrer'>
                    <i>Overleaf</i>
                </a>
                , you will need to select the &lsquo;LaTeX&rsquo; compiler in the settings menu&mdash;in the
                top-left corner of the <i>Overleaf</i> editor screen&mdash;so as to allow for the processing
                of <i>PostScript</i>. Something similar holds for users of other systems, such as{' '}
                <a href='https://www.texstudio.org/' target='_blank' rel='noopener noreferrer'>
                    <i>TeXstudio</i>
                </a>
                . (Thanks to Stephan Leuenberger for bringing this to my attention!)
            </p>
        </>
    );
}
