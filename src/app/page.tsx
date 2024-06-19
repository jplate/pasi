'use client'

import dynamic from "next/dynamic";
import React, { useState, useEffect } from "react";


const MainPanel = dynamic(() => import('./components/client/MainPanel.tsx'), {ssr: false,});


const getInitialColorScheme = () => {
  const storedMode = localStorage.getItem('color-scheme');
  const systemMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  return storedMode ?? systemMode;
}


export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  
  useEffect(() => {
    Object.freeze(Object.prototype); // to prevent prototype pollution

    setIsMobile(matchMedia('(pointer:fine)').matches==false);

    setIsDarkMode(getInitialColorScheme()=='dark');  
  }, []);


  useEffect(() => {
    document.body.classList.remove(isDarkMode? 'light': 'dark');
    document.body.classList.add(isDarkMode? 'dark': 'light');
    window.localStorage.setItem('color-scheme', isDarkMode? 'dark': 'light');

    const root = document.querySelector(':root');
    if (root instanceof HTMLElement) {
      root.style.setProperty('color-scheme', isDarkMode? 'dark': 'light');
    }
  }, [isDarkMode]);


  return (<> {/* We're returning a fragment. */}
    <div id='sticky-top' className={`sticky top-0 ${isDarkMode? 'bg-stone-400/20': 'bg-white/20'} z-50 px-4 py-2 shadow-md`}>
      <span className='flex items-center justify-between px-6'>
        <i><strong>pasi</strong></i>
        <button className='' onClick={() => {setIsDarkMode(!isDarkMode)}}>
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
    <main className='flex flex-col min-h-screen items-center justify-between p-12'>
      {isMobile? 
        <div className='text-center text-lg text-white bg-slate-600 px-2 py-2 leading-relaxed'>
            <p><strong>Mobile device not supported.</strong></p>
            <p>Please access this application from a laptop or desktop.</p>
        </div>:
        <div id='content' className='flex-1 flex flex-col mb-[30px]'>
          <section className='max-w-3xl ml-9'>
            <p className='text-red-500/50'>
              <strong>------------------UNDER CONSTRUCTION------------------</strong> 
            </p>
            <p>
              Suppose you’re writing a paper in LaTeX and want to make a quick diagram to include in your text.
            </p>
            <p>
              Here you can do that.
            </p>
            <p>
              To create a diagram, start by selecting one or (with shift-click) more locations on the canvas below, and then click either the <strong>Node</strong> or 
              the <strong>Contour</strong> button. To manipulate your diagram, you can drag nodes around, add labels to nodes, connect nodes 
              with arrows, etc. When you’re done, click the <strong>Generate</strong> button to have the LaTeX code displayed in the grey area further below. 
              To use that code in your document, you’ll need Peter Kabal’s <a href='https://ctan.org/pkg/texdraw' target='_blank'><code><i>texdraw</i></code></a> package.
              You can also load diagrams from previously generated code, using the <strong>Load</strong> button.
            </p>
          </section>

          <MainPanel dark={isDarkMode} />

          <section className='max-w-3xl ml-9'>
            <p>
              The following are a few other editors that also export LaTeX code:
            </p>
            <ul className='list-disc translate-x-5'>
              <li><a href='https://sourceforge.net/projects/dia-installer/?source=directory' target='_blank'><i>Dia</i></a>, a desktop application specializing on diagrams, with a wide variety of export options.</li>
              <li><a href='https://inkscape.org/' target='_blank'><i>Inkscape</i></a>, a fully-featured desktop SVG editor, also allows the creation of diagrams.</li>
              <li><a href='https://enjoysmath.github.io/quiver-bee/' target='_blank'><i>Quiver</i></a>, a powerful web-based editor that specializes on commutative diagrams.</li>
              <li><a href='https://tpx.sourceforge.net/' target='_blank'><i>TpX</i></a>, another desktop application, superficially similar to Dia.</li>
            </ul>
          </section>
        </div>
      }
    </main>
  </>);
}
