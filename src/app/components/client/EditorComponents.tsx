import React, { useRef } from 'react'
import clsx from 'clsx/lite'
import { Entry } from './ItemEditor'


export const debounce = <T extends (...args: any[]) => void>(func: T, wait: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return function(...args: Parameters<T>) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

export type Width = 'short' | 'medium' | 'long'

export interface CheckBoxFieldProps {
    label: string,
    style?: string,
    value: boolean,
    onChange: () => void,
}

export const CheckBoxField = ({label, style='px-4 py-1 text-sm', value, onChange}: CheckBoxFieldProps) => {
    return (
        <span className={style}>
            <input type='checkbox' className='mr-2' checked={value} onChange={()=>{onChange()}} /> 
            <a className='text-textcolor hover:text-textcolor' href='#' 
                    onClick={(e) => {
                        e.preventDefault();
                        onChange()
                    }}> 
                {label}
            </a>
        </span>
    )
}

export interface GlossFieldProps {
    text: string;
    style?: string;
}

export const GlossField = ({text, style=''}: GlossFieldProps) => {
    return (
        <div className={clsx('block px-2 py-1 text-left text-sm', style)}>
            <p>
                {text}
            </p>
        </div>
    )
}

export interface InputFieldProps {
    label: string,
    value: any,
    type?: string,
    step?: number,
    min?: number,
    max?: number,
    width?: Width,
    lowTopMargin?: boolean,
    extraBottomMargin?: boolean,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    entry?: Entry
}

export const InputField = ({label, value, type = 'number', min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, step = 1, width = 'medium', 
        lowTopMargin = false, extraBottomMargin = false, onChange, entry}: InputFieldProps) => {
    const inputRef = useRef<HTMLInputElement>(null);
    if(entry) {
        entry.inputRef = inputRef;
    }
    const w = width=='short'? 'min-w-10 w-10': width=='medium'? 'min-w-16 w-16': 'min-w-20 w-20';
    return (
        <span className={clsx('flex items-center justify-end px-2 py-1 text-sm', lowTopMargin? 'mt-[-4px]': '', extraBottomMargin? 'mb-4': '')}>
            {label} 
            <input className={clsx(w, type==='number'? 'text-right': '',
                    'ml-2 pl-2 border border-btnborder rounded-md focus:outline-none bg-textfieldbg text-textfieldcolor')}
                ref={inputRef} value={value} type={type} step={step==0? 'any': step} min={min} max={max} onChange={onChange} />
        </span>
    )
}

export interface LabelFieldProps {
    label: string;
    style?: string;
}

export const LabelField = ({label, style=''}: LabelFieldProps) => {
    return (
        <div className={clsx('block px-2 py-1 text-center tracking-wider', style)}>
            {label}
        </div>
    )
}

export const validInt = (s: string, min: number, max: number, dflt: number = min) => {
    const val = parseInt(s);
    return isNaN(val)? dflt: Math.min(Math.max(min, val), max)
}

export const validFloat = (s: string, min: number, max: number, dflt: number = min) => {
    const val = parseFloat(s);
    return isNaN(val)? dflt: Math.min(Math.max(min, val), max)
}


/**
 *  Computes the new value of an input number field with step 'any', whose stepping controls only increase the value by 1 or -1. The 'intended' increase or decrease is given
 *  by 10 ** logIncrement.
*/
const getRawValue = (prev: number, input: number, logIncrement: number) => {
    const delta = 10 ** logIncrement;
    const stepper: boolean = input==prev+1 || input==prev-1; // in this case we assume that the input field's controls were used.
    return stepper? prev + (input>prev? 1: -1) * delta: input
}

/**
 * Computes and validates the new value of an input number field with step 'any', whose stepping controls only increase the value by 1 or -1. The 'intended' increase or 
 *  decrease is given by 10 ** logIncrement.
 * 
 * CAUTION: Since this creates a temporary mismatch between the value coming from the input field and the property it represents, care has to be taken that this function
 *  be called ONLY ONCE per change event.
*/
export const parseInputValue = (input: string, min: number, max: number, oldValue: number, logIncrement: number, roundingDigits: number) => {
    const val = parseFloat(input);
    // console.log(`parsing input= ${input}, min= ${min}, max= ${max}, old= ${oldValue} logIncrement= ${logIncrement}`);
    if(isNaN(val)) {
        return NaN;
    } else {
        const raw = getRawValue(oldValue, val, logIncrement);
        const v0 = Math.min(Math.max(min, raw), max);
        const factor = 10 ** roundingDigits; // we want to round the number to prevent long runs of 9s or 0s.
        return Math.round(v0 * factor) / factor;
    }
}

const modulo = (value: number, base: number) => { // a modulo function that works also for negative numbers
    return (value % base + base) % base;
}

/*
    Computes and validates the new value of a 'cyclic' input number field with step 'any', whose stepping controls only increase the value by 1 or -1. The 'intended' increase or 
    decrease is given by 10 ** logIncrement.
*/
export const parseCyclicInputValue = (input: string, min: number, base: number, oldValue: number, logIncrement: number, roundingDigits: number) => {
    const val = parseFloat(input);
    if(isNaN(val)) {
        return [NaN, NaN];
    } else {
        const raw = getRawValue(oldValue, val, logIncrement);
        const v1 = modulo(raw - min, base);
        const v2 = (v1==0? base: v1) + min; // jump back to min only *after* reaching min+base.
        const factor = 10 ** roundingDigits; // we want to round the number to prevent long runs of 9s or 0s.
        return [Math.round(v2 * factor) / factor, raw - oldValue];
    }
}
