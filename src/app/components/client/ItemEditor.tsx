import React from 'react'
import clsx from 'clsx'
import { basicColoredButtonClass } from './MainPanel.tsx'
import { CheckBoxField, InputField, LabelField } from './CanvasEditor.tsx'
import Item from './Item.tsx'


export type Type = 'label' | 'boolean' | 'number' | 'string' | 'button';

export type Entry = {
    type: Type,
    label: string,
    value?: any,
    step?: number,
    min?: number,
    max?: number,
    style?: string
}


interface ItemEditorProps {
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
                        <LabelField key={i} label={entry.label} style={entry.style} />): 
                    entry.type==='boolean'? (
                        <CheckBoxField key={i} label={entry.label} style={entry.style} value={entry.value} 
                            onChange={() => handleChange(null, i)} />):
                    entry.type==='number'? (
                        <InputField key={i} label={entry.label} value={entry.value} min={entry.min} max={entry.max} step={entry.step} 
                            onChange={(e) => handleChange(e, i)} />):
                    entry.type==='string'? (
                        <InputField key={i} type='string' label={entry.label} value={entry.value} 
                            onChange={(e) => handleChange(e, i)} />):
                    entry.type==='button'? (
                        <button key={i} className={clsx(basicColoredButtonClass, 'mx-1 rounded-lg', entry.style)} 
                                onClick={() => handleChange(null, i)}>
                            {entry.label}
                        </button>): ''})
            }
        </div>
    );
};

export default ItemEditor;