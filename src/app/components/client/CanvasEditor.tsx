import React from 'react'
import { Grid, basicColoredButtonClass } from './MainPanel.tsx'
import clsx from 'clsx/lite'

const MAX_VGAP: number = 999;
const MAX_HGAP: number = 999;
const MAX_HSHIFT: number = 999;
const MAX_VSHIFT: number = 999;
export const MAX_VDISPLACEMENT = 999;
export const MAX_HDISPLACEMENT = 999;



export interface InputFieldProps {
    label: string,
    value: any,
    type?: string,
    step?: number,
    min?: number,
    max?: number,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
}

export const InputField = ({label, value, type = 'number', min = 0, max = Number.MAX_SAFE_INTEGER, step = 1, onChange}: InputFieldProps) => {

    return (
        <span className='flex items-center justify-end px-2 py-1 text-sm'>
            {label} 
            <input className={`w-16 px-2 py-0.5 ml-2 ${type==='number'? 'text-right': ''} border border-btnborder rounded-md focus:outline-none bg-textfieldbg text-textfieldcolor`}
                value={value} type={type} step={step} min={min} max={max} onChange={onChange} />
        </span>
    )
}

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


export interface LabelFieldProps {
    label: string;
    style?: string;
}

export const LabelField = ({label, style='py-1'}: LabelFieldProps) => {
    return (
        <div className={clsx('block px-2 py-1 text-center tracking-wider', style)}>
            {label}
        </div>
    )
}


interface CanvasEditorProps {
    grid: Grid,
    hDisp: number,
    vDisp: number,
    onHGapChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onVGapChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onHShiftChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onVShiftChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onHDispChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onVDispChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onSnapToNodeChange: () => void,
    onSnapToCCChange: () => void,
    onReset: () => void,
}

const CanvasEditor = ({grid, hDisp, vDisp, onHGapChange, onVGapChange, onHShiftChange, onVShiftChange, onHDispChange, onVDispChange,
        onSnapToNodeChange, onSnapToCCChange, onReset}: CanvasEditorProps) => {

    return (
        <div className='flex flex-col h-full'>
            <div className='grid grid-cols-2'>
                <LabelField label='Grid width' style='col-span-2' />
                <InputField label='Horiz.' value={grid.hGap} min={1} max={MAX_HGAP} onChange={onHGapChange} /> 
                <InputField label='Vert.' value={grid.vGap} min={1} max={MAX_VGAP} onChange={onVGapChange} /> 
                <LabelField label='Grid offset' style='col-span-2 mt-1' />
                <InputField label='Horiz.' value={grid.hShift} min={-MAX_HSHIFT} max={MAX_HSHIFT} onChange={onHShiftChange} /> 
                <InputField label='Vert.' value={grid.vShift} min={-MAX_VSHIFT} max={MAX_VSHIFT} onChange={onVShiftChange} /> 
                <CheckBoxField label='Snap to contour nodes' style='col-span-2 mt-2 px-4 py-2 text-base' value={grid.snapToNodes} onChange={onSnapToNodeChange} />
                <CheckBoxField label='Snap to contour centers' style='col-span-2 mt-1 mb-2 px-4 py-2 text-base' value={grid.snapToContourCenters} onChange={onSnapToCCChange} />
                <LabelField label='Copy displacement' style='col-span-2 mb-0.5'/>
                <InputField label='Horiz.' value={hDisp} min={-MAX_HDISPLACEMENT} max={MAX_HDISPLACEMENT} onChange={onHDispChange} />
                <InputField label='Vert.' value={vDisp} min={-MAX_VDISPLACEMENT} max={MAX_VDISPLACEMENT} onChange={onVDispChange} />
            </div>
            <div className='flex-1'> {/* some filler to push the button to the bottom */}
            </div>
            <button className={clsx(basicColoredButtonClass, 'px-2 mx-1 col-span-2 rounded-lg')} onClick={onReset}>
                Defaults
            </button>
        </div>
    )
}

export default CanvasEditor;