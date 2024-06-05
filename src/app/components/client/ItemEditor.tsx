import React, { useRef } from 'react'
import clsx from 'clsx/lite'
import { basicColoredButtonClass } from './MainPanel.tsx'
import { LabelField, GlossField, CheckBoxField, InputField, Width } from './EditorComponents.tsx'
import Item from './Item.tsx'


export type Config = {
    logTranslationIncrement: number
}


type Type = 'label' | 'gloss' | 'checkbox' | 'number input' | 'string input' | 'button';

export type Entry = {
    type: Type,
    text: string,
    value?: any,
    step?: number,
    min?: number,
    max?: number,
    style?: string,
    width?: Width,
    extraBottomMargin?: boolean,
    onChange?: (e: React.ChangeEvent<HTMLInputElement> | null) => void
    inputRef?: React.RefObject<HTMLInputElement>
}

interface ItemEditorProps {
    info: Entry[],
    onChange: (e: React.ChangeEvent<HTMLInputElement> | null, index: number) => void,
}

const ItemEditor = ({info, onChange}: ItemEditorProps) => {

    const handleChange = (e: React.ChangeEvent<HTMLInputElement> | null, i: number, entry: Entry) => {
        // console.log(`change event: ${e?.nativeEvent}`);
        if(entry.onChange) entry.onChange(e); // for 'local' changes that 
        onChange(e, i);
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
                            onChange={() => handleChange(null, i, entry)} />):
                    entry.type==='number input'? (
                        <InputField key={i} label={entry.text} entry={entry} width={entry.width} value={entry.value} min={entry.min} max={entry.max} step={entry.step} 
                            extraBottomMargin={entry.extraBottomMargin}
                            onChange={(e) => handleChange(e, i, entry)} />):
                    entry.type==='string input'? (
                        <InputField key={i} type='string' entry={entry} label={entry.text} width={entry.width} value={entry.value} 
                            extraBottomMargin={entry.extraBottomMargin}
                            onChange={(e) => handleChange(e, i, entry)} />):
                    entry.type==='button'? (
                        <button key={i} className={clsx(basicColoredButtonClass, 'mx-2 rounded-lg', entry.style)} 
                                onClick={() => handleChange(null, i, entry)}>
                            {entry.text}
                        </button>): ''})
            }
        </div>
    );
};

export default ItemEditor;