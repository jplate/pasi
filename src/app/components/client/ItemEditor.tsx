import react from 'react'
import clsx from 'clsx/lite'
import { Placement } from 'tippy.js'
import { BasicColoredButton } from './Button.tsx'
import { LabelField, GlossField, CheckBoxField, InputField, Width } from './EditorComponents.tsx'


export type Config = {
    logIncrement: number
}


type Type = 'label' | 'gloss' | 'checkbox' | 'number input' | 'string input' | 'button';

export type Entry = {
    type: Type,
    text: string,
    key?: string,
    value?: any,
    step?: number,
    min?: number,
    max?: number,
    style?: string,
    tooltip?: react.ReactNode,
    tooltipPlacement?: Placement,
    width?: Width,
    extraBottomMargin?: boolean,
    onChange?: (e: React.ChangeEvent<HTMLInputElement> | null) => void
}

interface ItemEditorProps {
    info: Entry[],
    onChange: (e: React.ChangeEvent<HTMLInputElement> | null, key: string) => void,
}

const ItemEditor = ({info, onChange}: ItemEditorProps) => {

    const handleChange = (e: React.ChangeEvent<HTMLInputElement> | null, key: string, entry: Entry) => {
        // console.log(`change event: ${e?.nativeEvent}`);
        if(entry.onChange) entry.onChange(e); // for 'local' changes that 
        onChange(e, key);
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
                            extraBottomMargin={entry.extraBottomMargin} tooltip={entry.tooltip} tooltipPlacement={entry.tooltipPlacement}
                            onChange={() => handleChange(null, entry.key?? '', entry)} />):
                    entry.type==='number input'? (
                        <InputField key={i} label={entry.text} width={entry.width} value={entry.value} min={entry.min} max={entry.max} step={entry.step} 
                            extraBottomMargin={entry.extraBottomMargin} tooltip={entry.tooltip} tooltipPlacement={entry.tooltipPlacement}
                            onChange={(e) => handleChange(e, entry.key?? '', entry)} />):
                    entry.type==='string input'? (
                        <InputField key={i} type='string' label={entry.text} width={entry.width} value={entry.value} 
                            extraBottomMargin={entry.extraBottomMargin} tooltip={entry.tooltip} tooltipPlacement={entry.tooltipPlacement}
                            onChange={(e) => handleChange(e, entry.key?? '', entry)} />):
                    entry.type==='button'? (
                        <BasicColoredButton key={i} id={`${i}`} label={entry.text} 
                                style={clsx('mx-2 rounded-lg', entry.extraBottomMargin? 'mb-4': 'mb-2', entry.style)} 
                                disabled={false} tooltip={entry.tooltip} tooltipPlacement={entry.tooltipPlacement}
                                onClick={() => handleChange(null, entry.key?? '', entry)} />):
                    null})
            }
        </div>
    );
}

export default ItemEditor;