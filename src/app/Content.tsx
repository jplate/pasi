import React, { type JSX } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { hotkeys, pasi } from '@/app/Hotkeys';
import relationshipSrcLight from '@/images/relationshipLight.png';
import relationshipSrcDark from '@/images/relationshipDark.png';

export const sampleFile =
    '\\documentclass[twoside,12pt,a4paper]{article}\n\n\\usepackage[utf8]{inputenc}\n\\usepackage{texdraw, lipsum}\n\\usepackage[style=authoryear, backend=biber]{biblatex}\n\n\\begin{document}\n\n\\title{Sample}\n\n\\author{NN}\n\n\\maketitle\n\n\\section{Introduction}\n\n\\lipsum[1] See Figure~\\ref{f1}. \n\n\\lipsum[11]\n\n\\begin{figure}\n\\begin{center}\n\\begin{texdraw}%pasiCodecV1\n\\drawdim pt \\setunitscale 0.75 \n\\linewd 1 \\move(400 380)\\lcir r:12 %E0\n\\textref h:C v:B \\htext(400 394.5){\\vphantom{p}Desdemona}%L0{2 U 0}\n\\linewd 1 \\move(600 380)\\lcir r:12 %E1\n\\textref h:C v:B \\htext(600 394.5){\\vphantom{p}Othello}%L1{2 U 0}\n\\linewd 1 \\move(412 380)\\clvec(420 380)(579.6 380)(587.6 380)\\move(587.6 380)\\lvec(578.3612 383.8268)\\move(587.6 380)\\lvec(578.3612 376.1732)\\linewd 1 \\move(499.976 380)\\lcir r:5 %A2(0 1){.u7 0 .n 1}\n\\textref h:C v:B \\htext(499.976 387.5){\\vphantom{p}loves}%L2{2 U 0}\n\\linewd 1 \\move(500 280)\\lcir r:12 %E3\n\\textref h:C v:T \\htext(500 265.5){Iago}%L3{2 U- 0}\n\\linewd 1 \\move(499.9971 292)\\clvec(499.9952 300)(499.9806 360.6)(499.978 371.6)\\move(499.978 371.6)\\lvec(496.4295 373.4461)\\move(499.978 371.6)\\lvec(503.5256 373.4478)%A4(3 2){5 0 .u 0 3.n 1}\n\\textref h:L v:C \\htext(506.9878 330.675){\\small disapproves}%L4{2 0 0}\n\\end{texdraw}\n\\end{center}\n\\caption{\\label{f1}A dramatic diagram.\n}\n\\end{figure}\n\n\\section{Conclusion}\n\n\\lipsum[21-22]\n\n\\end{document}';

const relationshipCode =
    '\\begin{texdraw}%pasiCodecV1\n\\drawdim pt \\setunitscale 0.75 \n\\linewd 1 \\move(400 380)\\lcir r:12 %E0\n\\textref h:C v:B \\htext(400 394.5){\\vphantom{p}Desdemona}%L0{2 U 0}\n\\linewd 1 \\move(600 380)\\lcir r:12 %E1\n\\textref h:C v:B \\htext(600 394.5){\\vphantom{p}Othello}%L1{2 U 0}\n\\linewd 1 \\move(412 380)\\clvec(420 380)(579.6 380)(587.6 380)\\move(587.6 380)\\lvec(578.3612 383.8268)\\move(587.6 380)\\lvec(578.3612 376.1732)\\linewd 1 \\move(500 380)\\lcir r:5 %A2(0 1){.u7 0 .n 1}\n\\textref h:C v:B \\htext(500 387.5){\\vphantom{p}loves}%L2{2 U 0}\n\\linewd 1 \\move(500 280)\\lcir r:12 %E3\n\\textref h:C v:T \\htext(500 265.5){Iago}%L3{2 U- 0}\n\\linewd 1 \\move(500 292)\\clvec(500 300)(500 360.6)(500 371.6)\\move(500 371.6)\\lvec(496.452 373.447)\\move(500 371.6)\\lvec(503.5481 373.447)%A4(3 2){5 0 .u 0 3.n 1}\n\\textref h:L v:C \\htext(507 330.675){\\small disapproves}%L4{2 0 0}\n\\end{texdraw}';

const pentagonCode =
    '\\begin{texdraw}%pasiCodecV1\n\\drawdim pt \\setunitscale 0.75 \n\\linewd 1 \\move(368 380)\\clvec(375.7333 356.142)(407.2667 258.858)(415 235)\\clvec(440.08 235)(541.92 235)(567 235)\\clvec(574.5839 258.9059)(605.4161 356.0941)(613 380)\\clvec(592.6812 394.7022)(510.3188 454.2978)(490 469)\\clvec(469.7385 454.219)(388.2615 394.781)(368 380)%S0{0; 3; 0,0,|.8,|.8; 0,0,|.8,|.8; 0,0,|.8,|.8; 0,0,|.8,|.8; 0,0,|.8,|.8}\n\\end{texdraw}';

const hexagonCode =
    '\\begin{texdraw}%pasiCodecV1\n\\drawdim pt \\setunitscale 0.75 \n\\linewd 1 \\move(367.02 338.54)\\clvec(377.444 320.5752)(419.576 247.9648)(430 230)\\clvec(450.77 230)(535.19 230)(555.96 230)\\clvec(566.384 247.9648)(608.516 320.5752)(618.94 338.54)\\clvec(608.6115 356.5599)(566.2885 430.4001)(555.96 448.42)\\clvec(535.19 448.42)(450.77 448.42)(430 448.42)\\clvec(419.6715 430.4001)(377.3485 356.5599)(367.02 338.54)%S0{0; 3; 0,0,?.K,?.K; 0,0,?.K,?.K; 0,0,?.K,?.K; 0,0,?.K,?.K; 0,0,?.K,?.K; 0,0,?.K,?.K}\n\\end{texdraw}';

const dodecagonCode =
    '\\begin{texdraw}%pasiCodecV1\n\\drawdim pt \\setunitscale 0.75 \n\\linewd 1 \\move(403 253)\\clvec(416.8018 244.8668)(445.1982 228.1332)(459 220)\\clvec(475.02 220)(507.98 220)(524 220)\\clvec(537.8018 228.1332)(566.1982 244.8668)(580 253)\\clvec(588.1332 266.8018)(604.8668 295.1982)(613 309)\\clvec(613 325.02)(613 357.98)(613 374)\\clvec(604.8668 387.8018)(588.1332 416.1982)(580 430)\\clvec(566.1982 438.1332)(537.8018 454.8668)(524 463)\\clvec(507.98 463)(475.02 463)(459 463)\\clvec(445.1982 454.8668)(416.8018 438.1332)(403 430)\\clvec(394.8668 416.1982)(378.1332 387.8018)(370 374)\\clvec(370 357.98)(370 325.02)(370 309)\\clvec(378.1332 295.1982)(394.8668 266.8018)(403 253)%S0{0; 3; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2; 0,0,/.2,/.2}\n\\end{texdraw}';

export interface CodeButtonSpec {
    text: React.ReactNode;
    code: string;
}

interface ConnectorsSectionContentProps {
    dark: boolean;
    keyCmd: (s: string) => JSX.Element[];
    renderCodeButton: (spec: CodeButtonSpec) => React.ReactNode;
}

interface ContourExamplesSectionContentProps {
    dark: boolean;
    keyCmd: (s: string) => JSX.Element[];
    renderCodeButton: (spec: CodeButtonSpec) => React.ReactNode;
}

export function IntroSectionContent({ keyCmd }: { keyCmd: (s: string) => JSX.Element[] }) {
    return (
        <>
            <p>
                Suppose you&rsquo;re writing a paper in LaTeX and want to make a quick diagram to include in
                your text.
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
                you&rsquo;re done, click the {pasi('Generate')} button to have the LaTeX code displayed in the
                text area below the canvas. To use that code in your document, you&rsquo;ll need Peter
                Kabal&rsquo;s{' '}
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
                <span className='font-bold'>Simplicity.</span> A diagram in <i>pasi</i> consists of at most
                three basic kinds of building block: <em>entity</em> nodes, <em>contour</em> nodes, and{' '}
                <em>ornaments</em> (such as labels). Their placement and other properties completely determine
                the appearance of a diagram.
            </li>
            <li>
                <span className='font-bold'>Precision.</span> With the cursor keys (or {keyCmd('W')},{' '}
                {keyCmd('A')}, {keyCmd('S')}, {keyCmd('D')}), it is possible to position items to a precision
                of one-tenth of a pixel. The exact coordinates of an item can be inspected and adjusted in the{' '}
                {pasi('Editor')} tab. In addition, while dragging items across the canvas, the user can take
                advantage of three kinds of &lsquo;snapping&rsquo; behavior: to the centers of contours, to
                the centers of nodes, and to a variable grid.
            </li>
            <li>
                <span className='font-bold'>LaTeX export.</span> When using LaTeX for typesetting a document,
                a major advantage of including the document&rsquo;s diagrams in LaTeX-readable form is that
                this allows for commands defined elsewhere in the text to be used in the diagrams&rsquo;
                labels. In addition, the font of the labels will automatically match the rest of the document.
            </li>
            <li>
                <span className='font-bold'>Custom shapes.</span> While each <em>contour</em> initially
                consists of exactly eight nodes carrying information about the control points of their
                connecting curves, it is easy to add or delete nodes and to adjust their respective
                properties. A few examples of how different shapes can be created in this way are described{' '}
                <a href='#contour-examples'>below</a>.
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

export function ConnectorsSectionContent({ dark, keyCmd, renderCodeButton }: ConnectorsSectionContentProps) {
    return (
        <>
            <p>
                To create a <em>connector</em>, select two or more nodes and then click on the{' '}
                {pasi('Create')} button (or press {keyCmd('Space')}), having selected the desired class of
                connector in the menu immediately above that button.
            </p>
            <p>
                One thing to note about connectors is that they are implemented as entity nodes that{' '}
                <em>appear</em> as lines or arrows. Whereas <em>normal</em> entity nodes appear as circles, in
                the case of a connector the circle is usually invisible, and instead the user only sees a line
                or arrow connecting two nodes. The circle only becomes visible when the user clicks somewhere
                near the center of that line or arrow.
            </p>
            <p>
                The reason for this somewhat unusual design is that <i>pasi</i> has originally been developed
                with the aim of facilitating the creation of diagrammatic languages, in particular ones that
                make it possible to represent &lsquo;higher-order&rsquo; relationships:
                relationships&mdash;i.e., instantiations of relations&mdash;that non-trivially involve other
                relationships. An example would be Iago&rsquo;s disapproval of Desdemona&rsquo;s loving
                Othello:
            </p>
            <div className='flex justify-center mb-4'>
                <Image
                    className='bg-canvasbg'
                    src={dark ? relationshipSrcDark : relationshipSrcLight}
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
                (Click {renderCodeButton({ text: 'here', code: relationshipCode })} to load this diagram into
                the app.) The little circle under &lsquo;loves&rsquo;, together with the horizontal arrow,
                represents Desdemona&rsquo;s loving Othello, while Iago&rsquo;s disapproval is represented by
                the vertical arrow (which sports a modified arrowhead). The label &lsquo;disapproves&rsquo; is
                attached to its own little circle, but the latter is here invisible thanks to having had its
                linewidth set to zero.
            </p>
        </>
    );
}

export function ContourExamplesSectionContent({
    dark,
    keyCmd,
    renderCodeButton,
}: ContourExamplesSectionContentProps) {
    return (
        <>
            <ul>
                <li>
                    <span className='font-bold'>Regular octagon.</span> To create a <em>regular octagon</em>,
                    you can simply select all the nodes of some eight-node contour and press {keyCmd('P')};
                    or, at the bottom of the {pasi('Editor')} tab, click on the buttons labeled &lsquo;
                    {pasi('Defaults')}&rsquo;, &lsquo;{pasi('Equalize central angles')}&rsquo;, and &lsquo;
                    {pasi('Equalize distances from center')}&rsquo;, in any order. (To select all the nodes of
                    a given contour, it is normally enough to click on any one of them or near the
                    contour&rsquo;s center.)
                </li>
                <li>
                    <p>
                        <span className='font-bold'>Star of David.</span> For a more complex example (on more
                        than one level), suppose you wish to create two overlapping regular triangles to form
                        a <em>Star of David</em>. The simplest way to do this begins with creating a regular{' '}
                        {renderCodeButton({ text: 'hexagon', code: hexagonCode })}. Take a standard eight-node
                        contour, delete two of its nodes, and select the remaining six. Then press{' '}
                        {keyCmd('P')} to convert these into a regular hexagon.
                    </p>
                    <p>
                        Next, press {keyCmd('R')} to rotate the hexagon by 30 degrees, so that it stands on
                        one of its vertices. To create the triangles, select any three nodes that together
                        form a regular triangle, and press {keyCmd('G')}. This will cause these nodes to
                        constitute a new triangular contour, while the remaining three will form the second
                        triangle.
                    </p>
                </li>
                <li>
                    <span className='font-bold'>Pentagram.</span> It is also possible to change the order in
                    which contour nodes are connected, which is useful for creating shapes like a{' '}
                    <em>pentagram</em>. Start with a regular{' '}
                    {renderCodeButton({ text: 'pentagon', code: pentagonCode })}, select all its nodes, and
                    then press {keyCmd('H')} to deactivate their membership in the pentagon&rsquo;s
                    &lsquo;node group&rsquo;. (You&rsquo;ll notice that it&rsquo;s no longer the case that{' '}
                    <em>all</em> the nodes get selected whenever you click on any one of them.) Next, by using{' '}
                    {keyCmd('Shift')}
                    -click, select them again in the order in which you want them to be connected. Finally,
                    press {keyCmd('G')} to create a new group. In this group, those nodes will be connected in
                    the same order in which they have just been selected.
                </li>
                <li>
                    <p>
                        <span className='font-bold'>Swiss cross.</span> Starting from a standard contour,
                        select any four of its eight nodes and press {keyCmd('C')} (for &lsquo;copy&rsquo;) to
                        turn it into a contour with twelve nodes. Select all of them and press {keyCmd('P')}{' '}
                        to create a regular {renderCodeButton({ text: 'dodecagon', code: dodecagonCode })}.
                        Make sure that the &lsquo;{pasi('Snap to contour centers')}&rsquo; option (in the
                        default {pasi('Editor')} tab) is selected. Place an entity node on the canvas and drag
                        it to the center of the dodecagon.
                    </p>
                    <p>
                        Next, hold {keyCmd('Ctrl')} and select any one of the four nodes in the NE, SE, SW,
                        and NW corners. Holding {keyCmd('Ctrl+Shift')}, select also the other three (in any
                        order) as well as, lastly, the central entity node. Release the keys and press{' '}
                        {keyCmd('U')} to gradually shrink the square of selected nodes. After a few seconds,
                        you&rsquo;ll have a <i>Swiss cross</i> with a circle in the center. To remove the
                        circle (the entity node), select it and press {keyCmd('Delete')} or{' '}
                        {keyCmd('Backspace')}.
                    </p>
                </li>
            </ul>
            <div className='flex flex-col items-center mt-12'>
                <svg width='156' height='156' xmlns='http://www.w3.org/2000/svg' pointerEvents='none'>
                    <path
                        d='M 0.5 97.5 C 10.5 97.5, 52.8 97.5, 56.5 97.5 C 56.5 101.2, 56.5 143.5, 56.5 153.5 C 66.5 153.5, 87.5 153.5, 97.5 153.5 C 97.5 143.5, 97.5 101.2, 97.5 97.5 C 101.2 97.5, 143.5 97.5, 153.5 97.5 C 153.5 87.5, 153.5 66.5, 153.5 56.5 C 143.5 56.5, 101.2 56.5, 97.5 56.5 C 97.5 52.8, 97.5 10.5, 97.5 0.5 C 87.5 0.5, 66.5 0.5, 56.5 0.5 C 56.5 10.5, 56.5 52.8, 56.5 56.5 C 52.8 56.5, 10.5 56.5, 0.5 56.5 C 0.5 66.5, 0.5 87.5, 0.5 97.5'
                        fill='none'
                        stroke={dark ? 'rgb(190, 169, 150)' : 'black'}
                        strokeWidth='1'
                        strokeDasharray=''
                        strokeLinecap='round'
                        strokeLinejoin='round'
                    ></path>
                </svg>
            </div>
        </>
    );
}
