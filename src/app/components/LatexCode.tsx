import { useRef } from 'react';
import clsx from 'clsx';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { duotoneSea as lightTheme } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { duotoneEarth as darkTheme } from 'react-syntax-highlighter/dist/cjs/styles/prism';

// good dark themes: cb, darcula, duotoneEarth
// good light themes: oneDark, duotoneDark, duotoneSea, nord

interface LaTeXCodeProps {
    dark: boolean;
    code: string;
}

const LaTeXCode: React.FC<LaTeXCodeProps> = ({ dark, code }) => {
    const codeRef = useRef<HTMLDivElement | null>(null);

    const handleClick = () => {
        if (codeRef.current) {
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(codeRef.current); // Select the contents of the code block
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    };

    return (
        <div
            ref={codeRef}
            className={clsx(
                'p-0 my-6 rounded-lg shadow-md cursor-pointer',
                dark ? 'bg-stone-900' : 'bg-gray-700'
            )}
            onClick={handleClick}
        >
            <SyntaxHighlighter language='latex' style={dark ? darkTheme : lightTheme} wrapLongLines>
                {code}
            </SyntaxHighlighter>
        </div>
    );
};

export default LaTeXCode;
