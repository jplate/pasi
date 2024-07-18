import react from 'react'
import clsx from 'clsx/lite'
import { Placement } from 'tippy.js'
import { BasicColoredButton } from './Button.tsx'
import { LabelField, GlossField, CheckBoxField, InputField, Width, validInt } from './EditorComponents.tsx'
import { MIN_TRANSLATION_LOG_INCREMENT, MAX_TRANSLATION_LOG_INCREMENT } from './MainPanel'


type Type = 'label' | 'gloss' | 'checkbox' | 'number input' | 'string input' | 'button' | 'logIncrement';

export type Entry = {
    type: Type,
    text?: string,
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
}

interface ItemEditorProps {
    info: Entry[],
    logIncrement: number,
    onIncrementChange: (val: number) => void,
    onChange: (e: React.ChangeEvent<HTMLInputElement> | null, key: string) => void,
}

const ItemEditor = ({info, logIncrement, onIncrementChange, onChange}: ItemEditorProps) => {


    const handleChange = (e: React.ChangeEvent<HTMLInputElement> | null, key: string) => {
        // console.log(`change event: ${e?.nativeEvent}`);
        onChange(e, key);
    }

    return (
        <div className='flex flex-col h-full'>
            {info.map((entry, i)  => {
                switch (entry.type) {
                    case 'label': return (
                        <LabelField key={i} label={entry.text?? ''} style={entry.style} />);
                    case 'gloss': return (
                        <GlossField key={i} text={entry.text?? ''} style={entry.style} />);
                    case 'checkbox': return (
                        <CheckBoxField key={i} label={entry.text?? ''} style={entry.style} value={entry.value} 
                            extraBottomMargin={entry.extraBottomMargin} tooltip={entry.tooltip} tooltipPlacement={entry.tooltipPlacement}
                            onChange={() => handleChange(null, entry.key?? '')} />);
                    case 'number input': return (
                        <InputField key={i} label={entry.text?? ''} width={entry.width} value={entry.value} min={entry.min} max={entry.max} step={entry.step} 
                            extraBottomMargin={entry.extraBottomMargin} tooltip={entry.tooltip} tooltipPlacement={entry.tooltipPlacement}
                            onChange={(e) => handleChange(e, entry.key?? '')} />);
                    case 'string input': return (
                        <InputField key={i} type='string' label={entry.text?? ''} width={entry.width} value={entry.value} 
                            extraBottomMargin={entry.extraBottomMargin} tooltip={entry.tooltip} tooltipPlacement={entry.tooltipPlacement}
                            onChange={(e) => handleChange(e, entry.key?? '')} />);
                    case 'button': return (
                        <BasicColoredButton key={i} id={`${i}`} label={entry.text} 
                                style={clsx('mx-2 rounded-lg text-sm', entry.extraBottomMargin? 'mb-4': 'mb-2', entry.style)} 
                                disabled={false} tooltip={entry.tooltip} tooltipPlacement={entry.tooltipPlacement}
                                onClick={() => handleChange(null, entry.key?? '')} />);
                    case 'logIncrement': return (
                        <InputField key={i} type='number' label={'log Increment'} width={'short'} value={logIncrement} min={MIN_TRANSLATION_LOG_INCREMENT} max={MAX_TRANSLATION_LOG_INCREMENT} step={1}
                            extraBottomMargin={entry.extraBottomMargin} tooltip={entry.tooltip} tooltipPlacement={entry.tooltipPlacement}
                            onChange={(e) => {
                                if(e) {
                                    const val = validInt(e.target.value, MIN_TRANSLATION_LOG_INCREMENT, MAX_TRANSLATION_LOG_INCREMENT);
                                    onIncrementChange(val);
                                }
                            }} />);
                    default: return null;
                }
            })}
        </div>
    );
}

export default ItemEditor;