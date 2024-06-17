import react, { useContext } from 'react'
import clsx from 'clsx/lite'
import Tippy from '@tippyjs/react'
import { Placement } from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'
import 'tippy.js/themes/translucent.css'
import 'tippy.js/animations/shift-toward.css'

import { DarkModeContext } from './MainPanel.tsx'


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
    extraBottomMargin?: boolean,
    onChange: () => void,
}

export const CheckBoxField = ({label, style='px-4 py-1 text-sm', value, extraBottomMargin, onChange}: CheckBoxFieldProps) => {
    return (
        <span className={clsx(style, extraBottomMargin? 'mb-4': '')}>
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
    tooltip?: react.ReactNode,
    tooltipPlacement?: Placement,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
}

export const InputField = ({label, value, type = 'number', min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, step = 1, width = 'medium', 
        lowTopMargin = false, extraBottomMargin = false, tooltip, tooltipPlacement, onChange}: InputFieldProps) => {
    const dark = useContext(DarkModeContext);

    const w = width=='short'? 'min-w-10 w-10': width=='medium'? 'min-w-16 w-16': 'min-w-20 w-20';
    const labelComp = (<span>{label}</span>);
    const inputComp = (<input className={clsx(w, type==='number'? 'text-right': '',
            'ml-2 pl-2 border border-btnborder rounded-md focus:outline-none bg-textfieldbg text-textfieldcolor')}
            value={value} type={type} step={step==0? 'any': step} min={min} max={max} onChange={onChange} />);
    return ( 
        <span className={clsx('flex items-center justify-end px-2 py-1 text-sm', lowTopMargin? 'mt-[-4px]': '', extraBottomMargin? 'mb-4': '')}>
            {tooltip? 
                <Tippy theme={dark? 'translucent': 'light'} delay={[750,0]} arrow={true} placement={tooltipPlacement} animation='shift-toward' content={tooltip}>
                    {labelComp}
                </Tippy>
                :
                labelComp
            }
            {inputComp}
        </span>
    );      
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

/** 
 * Normalizes a 'raw' value (first argument) relative to a cyclic scale with the supplied minimum and base. Also rounds the result.
 */
export const getCyclicValue = (raw: number, min: number, base: number, roundingFactor: number): number => {
    const v1 = modulo(raw - min, base);
    const v2 = (v1==0? base: v1) + min; // jump back to min only *after* reaching min+base.
    return Math.round(v2 * roundingFactor) / roundingFactor;
}

/**
 *  Computes and validates the new value of a 'cyclic' input number field with step 'any', whose stepping controls only increase the value by 1 or -1. The 'intended' increase or 
 *  decrease is given by 10 ** logIncrement. Returns an array consisting of a normalized value (computed with getCyclicValue) and the result of subtracting oldValue from the 
 *  'raw' value obtained from input. If the optional parameters are left unspecified, the first element of the returned array will be NaN.
 */
export const parseCyclicInputValue = (input: string, oldValue: number, logIncrement: number, 
        min: number = 0, base: number = 0, roundingDigits: number = 0): [val: number, delta: number] => {
    const val = parseFloat(input);
    if(isNaN(val)) {
        return [NaN, NaN];
    } else {
        const raw = getRawValue(oldValue, val, logIncrement);
        return [getCyclicValue(raw, min, base, 10 ** roundingDigits), raw - oldValue];
    }
}

export class DashValidator {

    private dottedIndex = -1; // the first index at which we've found a dot (possibly followed by one or more zeros) at the end of a portion of the stroke pattern input. We'll
        // assume that the user is editing at that point, and add the corresponding string - i.e., match - to the string shown in the input field.
    private match = ''; // the 'match' just mentioned
    private trailingSpace = false; // keeps track of whether a space should be added to the stroke pattern in editing

    constructor(public maxDashValue: number, public maxDashLength: number) {
    }

    public write = (dash: number[]): string => 
        dash.map((n, i) => {        
            return i==this.dottedIndex? n+this.match: n
        }).join(' ')+(this.trailingSpace? ' ': '');

    public read = (element: HTMLInputElement): number[] => {
        const { selectionEnd: caret } = element;
        const split = element.value.split(/[^0-9.]+/);
        let found = -1,
            uptoNext = 0,
            deleted = 0;
        for(let i = 0; i<split.length && caret; i++) {
            uptoNext += split[i].length + 1;
            const m0 = split[i].match(/^\d*\.\d*$/); // We're looking for representations of floating point numbers...
            const m1 = split[i].match(/\.0*$|0+$/); // ... that end EITHER with a dot followed by zero or more zeros OR with one or more zeros. 
            if(m0 && m1) {
                if(caret<uptoNext) {
                    this.match = m1[0];
                    found = i;
                    break;
                }
                else deleted += m1[0].length;
            } 
            else { // In this case, split[i] contains either no dot or two dots (unless the pattern has been pasted in, in which case split[i] may contain more than
                // two dots -- but we can safely ignore this possibility). So, if split[i] ends in a dot, that will be the SECOND dot, and it will effectively be deleted below, 
                // when we're computing item.dash, along with any preceding zeros and possibly the first dot ('effectively' because the deletion is partially due to how  
                // string representation of numbers works). We'll add their number to deleted.
                const m2 = split[i].match(/\.0*\.$|0*\.$/);
                if(m2) deleted += m2[0].length;
            }
            
            if(caret<uptoNext) break;
        }
        this.dottedIndex = found;
        this.trailingSpace = split[split.length-1]===''; // the last element of split will be '' iff the user entered a comma or space (or some combination thereof) at the end
        const slice = split.filter(s => s!=='').slice(0, this.maxDashLength); // shorten the array if too long
        
        // Now we just have to translate the string array into numbers:
        let substituteZero = false, 
            eliminateZero = false;
        const result = slice.map(s => {
            const match = s.match(/^[^.]*\.[^.]*/); // If there is a second dot in s, then match[0] will only include the material up to that second dot (exclusive).
            const trimmed = match? match[0]: s; // This may still be just a dot, in which case it should be interpreted as a zero.
            if(!substituteZero) substituteZero = trimmed.startsWith('.');
            if(!eliminateZero) eliminateZero = trimmed.match(/^0\d/)!==null;
            return Math.min(trimmed=='.'? 0: Number(trimmed), this.maxDashValue);
        }).filter(n => !isNaN(n));
        if(caret) setTimeout(() => {
            const extra = eliminateZero? -1: substituteZero? 1: 0;
            element.setSelectionRange(caret + extra - deleted, caret + extra - deleted);
        }, 0);
        return result;
    }
}