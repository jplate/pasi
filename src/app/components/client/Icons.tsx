import React from 'react';

export const undoIcon = (
    // source: https://heroicons.com/
    <svg
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth={1.5}
        stroke='currentColor'
        className='w-6 h-6 mx-auto'
    >
        <g transform='rotate(-45 12 12)'>
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3'
            />
        </g>
    </svg>
);

export const redoIcon = (
    // source: https://heroicons.com/
    <svg
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth={1.5}
        stroke='currentColor'
        className='w-6 h-6 mx-auto'
    >
        <g transform='rotate(45 12 12)'>
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3'
            />
        </g>
    </svg>
);

export const deleteIcon = (
    // source: https://heroicons.com/
    <svg
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth={1.5}
        stroke='currentColor'
        className='w-6 h-6 mx-auto'
    >
        <path strokeLinecap='round' strokeLinejoin='round' d='M6 18 18 6M6 6l12 12' />
    </svg>
);
