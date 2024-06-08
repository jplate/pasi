import React from 'react'
import clsx from 'clsx/lite'
import { Grid } from './MainPanel.tsx'
import { BasicColoredButton } from './Button.tsx'
import { LabelField, InputField, CheckBoxField } from './EditorComponents.tsx'


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
                <InputField label='Horiz.' value={grid.hGap} onChange={onHGapChange} /> 
                <InputField label='Vert.' value={grid.vGap} onChange={onVGapChange} /> 
                <LabelField label='Grid offset' style='col-span-2 mt-1' />
                <InputField label='Horiz.' value={grid.hShift} onChange={onHShiftChange} /> 
                <InputField label='Vert.' value={grid.vShift}onChange={onVShiftChange} /> 
                <CheckBoxField label='Snap to contour nodes' style='col-span-2 mt-2 px-4 py-2 text-base' value={grid.snapToNodes} onChange={onSnapToNodeChange} />
                <CheckBoxField label='Snap to contour centers' style='col-span-2 mt-1 mb-2 px-4 py-2 text-base' value={grid.snapToContourCenters} onChange={onSnapToCCChange} />
                <LabelField label='Copy displacement' style='col-span-2 mb-0.5'/>
                <InputField label='Horiz.' value={hDisp} onChange={onHDispChange} />
                <InputField label='Vert.' value={vDisp} onChange={onVDispChange} />
            </div>
            <div className='flex-1'> {/* some filler to push the button to the bottom */}
            </div>
            <BasicColoredButton id='reset-button' label='Defaults' style='px-2 mx-2 col-span-2 rounded-lg' disabled={false} onClick={onReset} />
        </div>
    )
}

export default CanvasEditor;