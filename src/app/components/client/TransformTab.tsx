import React, { useState } from 'react'
import { InputField, CheckBoxField, parseInputValue, parseCyclicInputValue, validInt } from './EditorComponents.tsx'
import { BasicColoredButton } from './Button.tsx'
import { MAX_SCALING, MIN_ROTATION, HotkeyComp } from './MainPanel'

export const MIN_ROTATION_LOG_INCREMENT = -3
export const MAX_ROTATION_LOG_INCREMENT = 2
export const MIN_SCALING_LOG_INCREMENT = -3
export const MAX_SCALING_LOG_INCREMENT = 3
const MAX_ROTATION_INPUT = 360 + 10 ** MAX_ROTATION_LOG_INCREMENT

interface TransformTabProps {
    rotation: number
    scaling: number
    hFlipPossible: boolean
    vFlipPossible: boolean
    transformFlags: {
        scaleArrowheads: boolean
        scaleENodes: boolean
        scaleDash: boolean
        scaleLinewidths: boolean
        flipArrowheads: boolean
    }
    logIncrements: {
        rotate: number, 
        scale: number
    }
    testRotation: (increment: number) => boolean // The increment is how much the selection needs to be rotated by; the newAngle is the...
    rotate: (increment: number) => void // ...new value to be shown in the input field.        
    testScaling: (newScaling: number) => boolean
    scale: (newScaling: number) => void 
    hFlip: () => void
    vFlip: () => void
}

const TransformTab = ({rotation, scaling, hFlipPossible, vFlipPossible, logIncrements, transformFlags,
        testRotation, rotate, testScaling, scale, hFlip, vFlip}: TransformTabProps) => {  
            
    const [, setRotationIncrement] = useState(logIncrements.rotate);
    const [, setScalingIncrement] = useState(logIncrements.scale);
    const [scaleArrowheads, setScaleArrowheads] = useState(transformFlags.scaleArrowheads);
    const [scaleENodes, setScaleENodes] = useState(transformFlags.scaleENodes);
    const [scaleLinewidths, setScaleLinewidths] = useState(transformFlags.scaleLinewidths);
    const [scaleDash, setScaleDash] = useState(transformFlags.scaleDash);
    const [flipArrowheads, setFlipArrowheads] = useState(transformFlags.flipArrowheads);

    const originDescription = <><i>either</i>&thinsp; the last-selected location on the canvas <i>or</i>&thinsp; (if no location is selected) the center
        of either the currently focused or (if no node is focused) the last-selected node</>;

    return (
        <div className='flex flex-col h-full'>
            <InputField label='Rotate' 
                tooltip={<>Rotate the selected nodes around {originDescription}.</>}
                tooltipPlacement='right'
                value={rotation} 
                min={-MAX_ROTATION_INPUT} max={MAX_ROTATION_INPUT} 
                step={0} width={'long'} onChange={(e) => {
                    const [val, delta] = parseCyclicInputValue(e.target.value, rotation, logIncrements.rotate, MIN_ROTATION, 360, Math.max(0, -MIN_ROTATION_LOG_INCREMENT));
                    if(!isNaN(val) && val!==rotation && testRotation(delta)) rotate(delta);
                }} />
            <InputField label='log Increment' value={logIncrements.rotate} min={MIN_ROTATION_LOG_INCREMENT} max={MAX_ROTATION_LOG_INCREMENT} 
                step={1} width={'short'} lowTopMargin={true} onChange={e => 
                    setRotationIncrement(prev => logIncrements.rotate = validInt(e.target.value, MIN_ROTATION_LOG_INCREMENT, MAX_ROTATION_LOG_INCREMENT))
            } />
            <InputField label='Scale %' 
                tooltip={<>Scale the selected nodes, using as origin {originDescription}. By default, scaling does not affect the sizes of the selected
                    nodes but only their distances to each other. This can be changed by selecting the relevant option below.</>}
                tooltipPlacement='right'
                value={scaling} 
                min={0} max={MAX_SCALING} 
                step={0} width={'long'} onChange={(e) => {
                    const val = parseInputValue(e.target.value, 0, MAX_SCALING, scaling, logIncrements.scale, Math.max(0, -MIN_SCALING_LOG_INCREMENT));
                    if(!isNaN(val) && val!==scaling && testScaling(val)) scale(val);
                }} />
            <InputField label='log Increment' value={logIncrements.scale} min={MIN_SCALING_LOG_INCREMENT} max={MAX_SCALING_LOG_INCREMENT} 
                step={1} width={'short'} lowTopMargin={true} onChange={e => 
                    setScalingIncrement(prev => logIncrements.scale = validInt(e.target.value, MIN_SCALING_LOG_INCREMENT, MAX_SCALING_LOG_INCREMENT))
            } />
            <BasicColoredButton id='hflip-button' label='Horizontal flip' style='px-2 mx-2 mt-3 rounded-lg' 
                tooltip={<>Flips the current selection horizontally, using a vertical axis that runs through {originDescription}.<HotkeyComp mapKey='hflip' /></>}
                tooltipPlacement='right'
                disabled={!hFlipPossible} onClick={hFlip} />
            <BasicColoredButton id='vflip-button' label='Vertical flip' style='px-2 mx-2 mt-2 mb-3 rounded-lg' 
                tooltip={<>Flips the current selection vertically, using an horizontal axis that runs through {originDescription}.<HotkeyComp mapKey='vflip' /></>}
                tooltipPlacement='right'
                disabled={!vFlipPossible} onClick={vFlip} />
            <CheckBoxField label='Scale arrowheads' value={scaleArrowheads} onChange={() => 
                setScaleArrowheads(prev => transformFlags.scaleArrowheads = !prev)
            } />
            <CheckBoxField label='Scale entity nodes' value={scaleENodes} onChange={() => 
                setScaleENodes(prev => transformFlags.scaleENodes = !prev)
            } />
            <CheckBoxField label='Scale linewidths' value={scaleLinewidths} onChange={() => 
               setScaleLinewidths(prev => transformFlags.scaleLinewidths = !prev)
            } />
            <CheckBoxField label='Scale stroke patterns' value={scaleDash} onChange={() => 
                setScaleDash(prev => transformFlags.scaleDash = !prev)
            } />
            <CheckBoxField label='Flip arrowheads' value={flipArrowheads} onChange={() => 
                setFlipArrowheads(prev => transformFlags.flipArrowheads = !prev)
            } />
        </div>
    );
}

export default TransformTab;