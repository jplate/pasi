import React from 'react'
import clsx from 'clsx/lite'
import { Grid } from './MainPanel.tsx'
import { BasicColoredButton } from './Button.tsx'
import { LabelField, InputField, CheckBoxField } from './EditorComponents.tsx'


interface CanvasEditorProps {
    grid: Grid,
    hDisp: number,
    vDisp: number,
    changeHGap: (e: React.ChangeEvent<HTMLInputElement>) => void,
    changeVGap: (e: React.ChangeEvent<HTMLInputElement>) => void,
    changeHShift: (e: React.ChangeEvent<HTMLInputElement>) => void,
    changeVShift: (e: React.ChangeEvent<HTMLInputElement>) => void,
    changeHDisp: (e: React.ChangeEvent<HTMLInputElement>) => void,
    changeVDisp: (e: React.ChangeEvent<HTMLInputElement>) => void,
    changeSnapToNode: () => void,
    changeSnapToCC: () => void,
    reset: () => void,
}

const CanvasEditor = ({grid, hDisp, vDisp, changeHGap, changeVGap, changeHShift, changeVShift, changeHDisp, changeVDisp,
        changeSnapToNode, changeSnapToCC, reset}: CanvasEditorProps) => {

    return (
        <div className='flex flex-col h-full'>
            <div className='grid grid-cols-2'>
                <LabelField label='Grid width' style='col-span-2' />
                <InputField label='Horiz.' value={grid.hGap} onChange={changeHGap} /> 
                <InputField label='Vert.' value={grid.vGap} onChange={changeVGap} /> 
                <LabelField label='Grid offset' style='col-span-2 mt-2' />
                <InputField label='Horiz.' value={grid.hShift} onChange={changeHShift} /> 
                <InputField label='Vert.' value={grid.vShift}onChange={changeVShift} /> 
                <CheckBoxField label='Snap to contour nodes' style='col-span-2 mt-3 px-4 py-2 text-base' value={grid.snapToNodes} onChange={changeSnapToNode} />
                <CheckBoxField label='Snap to contour centers' style='col-span-2 mb-2 px-4 py-2 text-base' value={grid.snapToContourCenters} onChange={changeSnapToCC} />
                <LabelField label='Copy displacement' style='col-span-2 mb-0.5'/>
                <InputField label='Horiz.' value={hDisp} onChange={changeHDisp} />
                <InputField label='Vert.' value={vDisp} onChange={changeVDisp} /> 
            </div>
            <div className='flex-1'> {/* some filler to push the button to the bottom */}
            </div>
            <BasicColoredButton id='reset-button' label='Defaults' style='px-2 mx-2 mb-2 col-span-2 rounded-lg text-sm' disabled={false} onClick={reset} />
        </div>
    )
}

export default CanvasEditor;