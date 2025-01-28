import React from 'react';

export const moonIcon = (
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
);

export const sunIcon = (
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
);

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
