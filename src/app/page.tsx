'use client'

import dynamic from "next/dynamic";
import React, { useState, useEffect } from "react";
import clsx from 'clsx/lite';
import { hotkeys } from './components/client/MainPanel'


const MainPanel = dynamic(() => import('./components/client/MainPanel.tsx'), {ssr: false,});
const Section = dynamic(() => import('./components/client/Section.tsx'), {ssr: false,});



const getInitialColorScheme = () => {
  const storedMode = localStorage.getItem('color-scheme');
  const systemMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  return storedMode ?? systemMode;
}

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
      <span className={`pasi-logo text-xl tracking-wide transition-opacity duration-500 ${isVisible? 'opacity-100': 'opacity-0'}`}>
        {/* There's a danger of the logo overlapping the site's content, so we hide the logo on screens under 2xl. 
            The 'pasi-logo' class is added in order to let the logo appear in the same font-family as the MainPanel. */}
          pasi
      </span>
  );
};


interface PasiProps {
  children: React.ReactNode
}


const Pasi = ({ children }: PasiProps) => {
  return (
    <span className='pasi text-base'>
      {children}
    </span>
  );
}

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMac, setIsMac] = useState(false);

  // Initialize state
  useEffect(() => {
    Object.freeze(Object.prototype); // to prevent prototype pollution

    setIsMobile(matchMedia('(pointer:fine)').matches==false);
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0); 
    setIsDarkMode(getInitialColorScheme()=='dark');  

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
    document.body.classList.remove(isDarkMode? 'light': 'dark');
    document.body.classList.add(isDarkMode? 'dark': 'light');
    window.localStorage.setItem('color-scheme', isDarkMode? 'dark': 'light');

    const root = document.querySelector(':root');
    if (root instanceof HTMLElement) {
      root.style.setProperty('color-scheme', isDarkMode? 'dark': 'light');
    }
  }, [isDarkMode]);


  const key = (name: string) => {
    if (isMac) name = name.replace(/Ctrl/, '⌘');
    const split = name.split('+');
    return split.map((s, i) => 
      <span key={i} className={clsx(isDarkMode? 'font-mono': 'whitespace-nowrap')}>
        {isDarkMode? s: <>&thinsp;<kbd>{s}</kbd>&thinsp;</>}
        {i < split.length - 1 && '+'}
      </span>
    );
  }

  const hyphens = <>-----<span className='hidden md:inline'>-------------</span></>;
  
  return (<> {/* We're returning a fragment. */}
    <div id='sticky-top' className={`sticky-top sticky top-0 bg-transparent z-40 hidden sm:block`}>
      <span className='flex items-center justify-between px-2 lg:px-4 2xl:px-6 py-1 lg:py-2'>
        <LogoSpan />
        <button className='opacity-60'
            onClick={() => {setIsDarkMode(!isDarkMode)}}>
          {isDarkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"> {/* moon icon */}
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>):(
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"> {/* sun icon */}
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
        )}
        </button>
      </span>
    </div>
    <main className='flex flex-col lg:items-center'> {/* 'flex flex-col' helps to make the sticky top to be actually sticky and to cause the background image to be spread 
        out over the page instead of being repeated. 'items-center' centers the content but prevents the table rows from laterally compressing; so we activate it only
        for larger screens. */}
      {isMobile? 
        <div className='text-center text-lg text-white bg-slate-600 px-2 py-2 leading-relaxed'>
            <p><strong>Mobile device not supported.</strong></p>
            <p>Please access this application from a laptop or desktop.</p>
        </div>:
        <div id='content' className='flex-1 flex flex-col items-center mb-9'>
          <Section id='intro-section' dark={isDarkMode}>
            <p>
              <strong>{hyphens}UNDER CONSTRUCTION{hyphens}</strong> 
            </p>
            <p>
              Suppose you’re writing a paper in LaTeX and want to make a quick diagram to include in your text.
            </p>
            <p>
              Here you can do that.
            </p>
            <p>
              To create a diagram, start by selecting one or (with shift-click) more locations on the canvas below<span className='xl:hidden'>{' '}
              (if none is visible, you may need to zoom out or increase your screen size)</span>, and then click either the <Pasi>Node</Pasi> or 
              the <Pasi>Contour</Pasi> button. To manipulate your diagram, you can drag nodes around, add labels to nodes, connect nodes 
              with arrows, etc. When you’re done, click the <Pasi>Generate</Pasi> button to have the LaTeX code displayed in the text area below the canvas. 
              To use that code in your document, you’ll need Peter Kabal’s <a href='https://ctan.org/pkg/texdraw' target='_blank'><i>texdraw</i></a>&nbsp; package.
              You can also load diagrams from previously generated code, using the <Pasi>Load</Pasi> button.
            </p>
          </Section>

          <div className='hidden xl:block'>
            <MainPanel dark={isDarkMode} />
          </div>

          <Section id='hotkey-section' header='Keyboard shortcuts' dark={isDarkMode}>
            <p>
              The following keyboard commands are available for editing the diagram displayed on the canvas. For editing the <i>texdraw</i> code in the text area, the
              usual commands (including {key('Ctrl+Z')} and {isMac? key('Shift+⌘+Z'): key('Ctrl+Y')} for &lsquo;undo&rsquo; and &lsquo;redo&rsquo;) are also available.
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
                  <tr key={i} 
                    className={clsx(i % 2 === 0 ? (isDarkMode? 'bg-btnbg/33' : 'bg-btnbg/40'): 'bg-btnbg/10', 
                        i===arr.length-1? 'border-b-4 border-btnborder/50': '')}>
                    {/* In light mode, we use the elaborate <kbd> styling provided by tailwind typography, with its box shadows and borders (which require a greater line height). 
                        In dark mode, these shadows don't really look good and are hardly visible, so we default to monospace font. */}
                    <td className={clsx('px-4 py-2', isDarkMode? '': 'leading-7')}>{it.rep.map((keyName, j, arr) => (
                      <React.Fragment key={j}>
                        {key(keyName)}
                        {j < arr.length - 1 && <>, </>}
                      </React.Fragment>
                    ))}
                    </td>
                    <td className='pl-4 pr-6 py-2'>{isDarkMode && it.descrDark? it.descrDark: it.descr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section id='alternatives-section' header='Alternative apps' dark={isDarkMode}>
            <p>
              The following are a few other editors that also export LaTeX code:
            </p>
            <ul>
              <li><a href='https://sourceforge.net/projects/dia-installer/?source=directory' target='_blank'><i>Dia</i></a>, a desktop application specializing on diagrams, with a wide variety of export options.</li>
              <li><a href='https://inkscape.org/' target='_blank'><i>Inkscape</i></a>, a fully-featured desktop SVG editor, also allows the creation of diagrams.</li>
              <li><a href='https://enjoysmath.github.io/quiver-bee/' target='_blank'><i>Quiver</i></a>, a powerful web-based editor that specializes on commutative diagrams.</li>
              <li><a href='https://tpx.sourceforge.net/' target='_blank'><i>TpX</i></a>, another desktop application, superficially similar to <i>Dia</i>.</li>
            </ul>
            Web-based diagram editors that do not (as of this writing) export LaTeX code include <a href='https://app.diagrams.net/' target='_blank'><i>draw.io</i></a> and{' '}
            <a href='https://excalidraw.com/' target='_blank'><i>Excalidraw</i></a>. {' '}
            While it&rsquo;s of course possible to tell LaTeX to include an image file in its output, the major advantage of having it create a diagram <i>from LaTeX code</i>{' '} 
            is that this approach allows the diagram to contain text processed by LaTeX. {' '}
            In the case of <i>pasi</i>, this means that you may feel free to use any command you&rsquo;ve defined in your document in the text of a label. The <i>dis</i>&#8202;advantage{' '}
            of this approach (but I think it&rsquo;s relatively minor) is that the diagram editor cannot easily give a faithful representation of how a label will appear in the output produced{' '}
            by LaTeX.
          </Section>
        </div>
      }
    </main>
  </>);
}
