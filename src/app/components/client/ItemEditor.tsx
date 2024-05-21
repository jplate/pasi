import React from 'react'
import clsx from 'clsx/lite'
import { basicColoredButtonClass } from './MainPanel.tsx'
import { CheckBoxField, InputField, LabelField } from './CanvasEditor.tsx'
import Item from './Item.tsx'


export type Type = 'label' | 'gloss' | 'checkbox' | 'number input' | 'string input' | 'button';

export type Entry = {
    type: Type,
    text: string,
    value?: any,
    step?: number,
    min?: number,
    max?: number,
    style?: string
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


export interface ItemEditorProps {
    item: Item,
    info: Entry[],
    onChange?: (e: React.ChangeEvent<HTMLInputElement> | null, index: number) => void,
}

const ItemEditor = ({item, info, onChange}: ItemEditorProps) => {

    const handleChange = (e: React.ChangeEvent<HTMLInputElement> | null, i: number) => {
        onChange && onChange(e, i);
    }

    return (
        <div className='flex flex-col h-full'>
            {info.map((entry, i)  => {
               return entry.type==='label'? (
                        <LabelField key={i} label={entry.text} style={entry.style} />): 
                    entry.type==='gloss'? (
                        <GlossField key={i} text={entry.text} style={entry.style} />):
                    entry.type==='checkbox'? (
                        <CheckBoxField key={i} label={entry.text} style={entry.style} value={entry.value} 
                            onChange={() => handleChange(null, i)} />):
                    entry.type==='number input'? (
                        <InputField key={i} label={entry.text} value={entry.value} min={entry.min} max={entry.max} step={entry.step} 
                            onChange={(e) => handleChange(e, i)} />):
                    entry.type==='string input'? (
                        <InputField key={i} type='string' label={entry.text} value={entry.value} 
                            onChange={(e) => handleChange(e, i)} />):
                    entry.type==='button'? (
                        <button key={i} className={clsx(basicColoredButtonClass, 'mx-1 rounded-lg', entry.style)} 
                                onClick={() => handleChange(null, i)}>
                            {entry.text}
                        </button>): ''})
            }
        </div>
    );
};

export default ItemEditor;