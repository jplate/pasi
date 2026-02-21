import React from 'react';

interface StaticLatexCodeProps {
    code: string;
}

const StaticLatexCode = ({ code }: StaticLatexCodeProps) => {
    return (
        <pre className='p-4 my-6 rounded-lg shadow-md bg-gray-700 text-gray-100 text-sm overflow-x-auto whitespace-pre-wrap'>
            <code>{code}</code>
        </pre>
    );
};

export default StaticLatexCode;
