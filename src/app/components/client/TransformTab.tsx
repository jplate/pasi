import React, { useState } from 'react'
import clsx from 'clsx/lite'
import { InputField, CheckBoxField, parseInputValue, parseCyclicInputValue, validInt } from './EditorComponents.tsx'
import { basicColoredButtonClass } from './MainPanel.tsx'

const MIN_ROTATION_LOG_INCREMENT = -3
const MAX_ROTATION_LOG_INCREMENT = 2
const MIN_SCALING_LOG_INCREMENT = -3
const MAX_SCALING_LOG_INCREMENT = 3
const MIN_ROTATION = -180
const MAX_ROTATION_INPUT = 360 + 10 ** MAX_ROTATION_LOG_INCREMENT
const MAX_SCALING = 1E6

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
    testRotation: (increment: number, newAngle: number) => boolean // The increment is how much the selection needs to be rotated by; the newAngle is the...
    rotate: (increment: number, newAngle: number) => void // ...new value to be shown in the input field.        
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

    return (
        <div className='flex flex-col h-full'>
            <InputField label='Rotate' value={rotation} 
                min={-MAX_ROTATION_INPUT} max={MAX_ROTATION_INPUT} 
                step={0} width={'long'} onChange={(e) => {
                    const [val, delta] = parseCyclicInputValue(e.target.value, MIN_ROTATION, 360, rotation, logIncrements.rotate, Math.max(0, -MIN_ROTATION_LOG_INCREMENT));
                    if(!isNaN(val) && val!==rotation && testRotation(delta, val)) rotate(delta, val)
                }} />
            <InputField label='log Increment' value={logIncrements.rotate} min={MIN_ROTATION_LOG_INCREMENT} max={MAX_ROTATION_LOG_INCREMENT} 
                step={1} width={'short'} lowTopMargin={true} onChange={e => 
                    setRotationIncrement(prev => logIncrements.rotate = validInt(e.target.value, MIN_ROTATION_LOG_INCREMENT, MAX_ROTATION_LOG_INCREMENT))
            } />
            <InputField label='Scale %' value={scaling} 
                min={0} max={MAX_SCALING} 
                step={0} width={'long'} onChange={(e) => {
                    const val = parseInputValue(e.target.value, 0, MAX_SCALING, scaling, logIncrements.scale, Math.max(0, -MIN_SCALING_LOG_INCREMENT));
                    if(!isNaN(val) && val!==scaling && testScaling(val)) scale(val);
                }} />
            <InputField label='log Increment' value={logIncrements.scale} min={MIN_SCALING_LOG_INCREMENT} max={MAX_SCALING_LOG_INCREMENT} 
                step={1} width={'short'} lowTopMargin={true} onChange={e => 
                    setScalingIncrement(prev => logIncrements.scale = validInt(e.target.value, MIN_SCALING_LOG_INCREMENT, MAX_SCALING_LOG_INCREMENT))
            } />
            <button className={clsx(basicColoredButtonClass, 'px-2 mx-2 mt-3 rounded-lg')} disabled={!hFlipPossible} onClick={hFlip}>
                Horizontal Flip
            </button>
            <button className={clsx(basicColoredButtonClass, 'px-2 mx-2 mt-2 mb-3 rounded-lg')} disabled={!vFlipPossible} onClick={vFlip}>
                Vertical Flip
            </button>
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