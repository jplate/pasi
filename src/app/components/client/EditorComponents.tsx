import clsx from 'clsx/lite'

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
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
}

export const InputField = ({label, value, type = 'number', min = 0, 
            max = Number.MAX_SAFE_INTEGER, step = 1, width = 'medium', lowTopMargin = false, onChange}: InputFieldProps) => {
    const w = width=='short'? 'min-w-10 w-10': width=='medium'? 'min-w-16 w-16': 'min-w-20 w-20';
    return (
        <span className={`flex items-center justify-end px-2 py-1 text-sm ${lowTopMargin? 'mt-[-4px]': ''}`}>
            {label} 
            <input className={clsx(w, type==='number'? 'text-right': '',
                    'ml-2 pl-2 border border-btnborder rounded-md focus:outline-none bg-textfieldbg text-textfieldcolor')}
                value={value} type={type} step={step==0? 'any': step} min={min} max={max} onChange={onChange} />
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
