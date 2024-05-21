import React from 'react'
import clsx from 'clsx/lite'
import { basicColoredButtonClass } from './MainPanel.tsx'
import { LabelField, GlossField, CheckBoxField, InputField } from './EditorComponents.tsx'
import Item from './Item.tsx'


type Type = 'label' | 'gloss' | 'checkbox' | 'number input' | 'string input' | 'button';

export type Entry = {
    type: Type,
    text: string,
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