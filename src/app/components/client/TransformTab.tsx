import React, { useState } from 'react'
import clsx from 'clsx/lite'
import { InputField, CheckBoxField, validInt } from './EditorComponents.tsx'
import { basicColoredButtonClass } from './MainPanel.tsx'

const MIN_ROTATION_LOG_INCREMENT = -3
const MAX_ROTATION_LOG_INCREMENT = 2
const MIN_SCALING_LOG_INCREMENT = -3
const MAX_SCALING_LOG_INCREMENT = 3
const MIN_ROTATION = -180
const MAX_ROTATION_INPUT = 360 + 10 ** MAX_ROTATION_LOG_INCREMENT
const MAX_SCALING = 1E6


const modulo = (value: number, base: number) => { // a modulo function that works also for negative numbers
    return (value % base + base) % base;
}

const getNewValue = (prev: number, input: number, logIncrement: number) => {
    const stepper = input==prev+1 || input==prev-1; // in this case we assume that the input field's controls were used.
    return !stepper? input: prev + (input>prev? 1: -1) * 10 ** logIncrement;
}


interface TransformTabProps {
    rotation: number
    scaling: number
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
    onHFlip: () => void
    onVFlip: () => void
}

const TransformTab = ({rotation, scaling, logIncrements, transformFlags,
        testRotation, rotate, testScaling, scale, onHFlip, onVFlip}: TransformTabProps) => {  
            
    const [, setRotationIncrement] = useState(logIncrements.rotate);
    const [, setScalingIncrement] = useState(logIncrements.scale);
    const [scaleArrowheads, setScaleArrowheads] = useState(transformFlags.scaleArrowheads);
    const [scaleENodes, setScaleENodes] = useState(transformFlags.scaleENodes);
    const [scaleLinewidths, setScaleLinewidths] = useState(transformFlags.scaleLinewidths);
    const [scaleDash, setScaleDash] = useState(transformFlags.scaleDash);
    const [flipArrowheads, setFlipArrowheads] = useState(transformFlags.flipArrowheads);

    const handleRotation = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if(!isNaN(val) && val!==rotation) {
            // The step of the input element is going to be 'any', which means that val should be just 1 greater or less than rotation.
            // We need to take care of computing the increment ourselves, and make sure that the result is not out of bounds.
            const v0 = getNewValue(rotation, val, logIncrements.rotate);
            const v1 = modulo(v0 - MIN_ROTATION, 360);
            const v2 = (v1==0? 360: v1) + MIN_ROTATION; // jump to negative numbers only *after* reaching 180 (assuming MIN_ROTATION==-180).
            const factor = 10 ** Math.max(0, -MIN_ROTATION_LOG_INCREMENT); // we want to round the number to prevent long runs of 9s or 0s.
            const delta = v0 - rotation;
            const newValue = Math.round(v2 * factor) / factor;
            if(testRotation(delta, newValue)) rotate(delta, newValue)
        }
    }
    
    const handleScaling = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if(!isNaN(val) && val!==scaling) {
            // The step of the input element is going to be 'any', which means that val should be just 1 greater or less than scaling.
            // We need to take care of computing the increment ourselves, and make sure that the result is not out of bounds.
            const v0 = Math.min(Math.max(0, getNewValue(scaling, val, logIncrements.scale)), MAX_SCALING);
            const factor = 10 ** Math.max(0, -MIN_SCALING_LOG_INCREMENT); // we want to round the number to prevent long runs of 9s or 0s.
            const newValue = Math.round(v0 * factor) / factor;
            if(testScaling(newValue)) scale(newValue);
        }
    }

    return (
        <div className='flex flex-col h-full'>
            <InputField label='Rotate' value={rotation} 
                min={-MAX_ROTATION_INPUT} max={MAX_ROTATION_INPUT} 
                step={0} width={'long'} onChange={handleRotation} />
            <InputField label='log Increment' value={logIncrements.rotate} min={MIN_ROTATION_LOG_INCREMENT} max={MAX_ROTATION_LOG_INCREMENT} 
                step={1} width={'short'} lowTopMargin={true} onChange={e => 
                    setRotationIncrement(prev => logIncrements.rotate = validInt(e.target.value, MIN_ROTATION_LOG_INCREMENT, MAX_ROTATION_LOG_INCREMENT))
            } />
            <InputField label='Scale %' value={scaling} 
                min={0} max={MAX_SCALING} 
                step={0} width={'long'} onChange={handleScaling} />
            <InputField label='log Increment' value={logIncrements.scale} min={MIN_SCALING_LOG_INCREMENT} max={MAX_SCALING_LOG_INCREMENT} 
                step={1} width={'short'} lowTopMargin={true} onChange={e => 
                    setScalingIncrement(prev => logIncrements.scale = validInt(e.target.value, MIN_SCALING_LOG_INCREMENT, MAX_SCALING_LOG_INCREMENT))
            } />
            <button className={clsx(basicColoredButtonClass, 'px-2 mx-2 mt-3 rounded-lg')} onClick={onHFlip}>
                Horizontal Flip
            </button>
            <button className={clsx(basicColoredButtonClass, 'px-2 mx-2 mt-2 mb-3 rounded-lg')} onClick={onVFlip}>
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