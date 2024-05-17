'use client'


import dynamic from "next/dynamic";
import React, {useState, useEffect} from "react";
import 'tippy.js/dist/tippy.css';



const MainPanel = dynamic(() => import('./components/client/MainPanel.tsx'), {ssr: false,});

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);

  
  useEffect(() => {
    Object.freeze(Object.prototype); // to prevent prototype pollution
    setIsMobile(matchMedia('(pointer:fine)').matches==false);
  }, []);


  return (
    <main className='flex min-h-screen flex-col items-center justify-between p-24'>
      {isMobile? 
        <div className='text-center text-lg text-white bg-slate-600 px-2 py-2 leading-relaxed'>
            <p><strong>Mobile device not supported.</strong></p>
            <p>Please access this web application from a laptop or desktop.</p>
        </div>:
        <div style={{minWidth: '1200px', maxWidth: '1500px', marginBottom: '30px'}}>
          <section>
            <p className='mb-2'>
              <strong>&lt;&lt;&lt;UNDER CONSTRUCTION&gt;&gt;&gt;</strong> Suppose you’re writing a paper in LaTeX and want to make a quick diagram to include in your text.
            </p>
            <p className='mb-2'>
              Here you can do that.
            </p>
            <p className='mb-2'>
              To create a diagram, start by selecting one or (with shift-click) more locations on the canvas below, and then click either the <strong>Node</strong> or 
              the <strong>Contour</strong> button. To manipulate your diagram, you can drag nodes around, add labels to nodes, connect nodes 
              with arrows, etc. When you’re done, click the <strong>Generate</strong> button to have the LaTeX code displayed in the grey area further below. 
              To use that code in your document, you’ll need Peter Kabal’s <a className='custom' href='https://ctan.org/pkg/texdraw'><code>texdraw</code></a> package.
              You can also load diagrams from previously generated code, using the <strong>Load</strong> button.
            </p>
          </section>
          <section>
            <MainPanel />
          </section> 
          <section>
            <p>
              The following are a few other editors that also export LaTeX code:
            </p>
            <ul className='list-disc translate-x-5'>
              <li><a className='custom' href='https://sourceforge.net/projects/dia-installer/?source=directory'>Dia</a>, a desktop application specializing on diagrams, with a wide variety of export options.</li>
              <li><a className='custom' href='https://inkscape.org/'>Inkscape</a>, a fully-featured desktop SVG editor, also allows the creation of diagrams.</li>
              <li><a className='custom' href='https://enjoysmath.github.io/quiver-bee/'>Quiver</a>, a powerful web-based editor that specializes on commutative diagrams.</li>
              <li><a className='custom' href='https://tpx.sourceforge.net/'>TpX</a>, another desktop application, superficially similar to Dia.</li>
            </ul>
          </section>
        </div>
      }
    </main>
  );
}
