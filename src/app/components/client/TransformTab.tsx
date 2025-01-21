import React, { useState } from 'react';
import {
    InputField,
    CheckBoxField,
    parseInputValue,
    parseCyclicInputValue,
    validInt,
} from './EditorComponents.tsx';
import { BasicColoredButton } from './Button.tsx';
import { MAX_SCALING, MIN_ROTATION, HotkeyComp } from './MainPanel';
import {
    MIN_ROTATION_LOG_INCREMENT,
    MAX_ROTATION_LOG_INCREMENT,
    MIN_SCALING_LOG_INCREMENT,
    MAX_SCALING_LOG_INCREMENT,
    MAX_ROTATION_INPUT,
} from '../../Constants';

interface TransformTabProps {
    rotation: number;
    scaling: number;
    hFlipPossible: boolean;
    vFlipPossible: boolean;
    transformFlags: {
        scaleENodes: boolean;
        scaleConnectors: boolean;
        scaleArrowheads: boolean;
        scaleDash: boolean;
        scaleLinewidths: boolean;
        flipArrowheads: boolean;
    };
    logIncrements: {
        rotate: number;
        scale: number;
    };
    testRotation: (increment: number) => boolean; // The increment is how much the selection needs to be rotated by; the newAngle is the...
    rotate: (increment: number) => void; // ...new value to be shown in the input field.
    testScaling: (newScaling: number) => boolean;
    scale: (newScaling: number) => void;
    hFlip: () => void;
    vFlip: () => void;
}

const TransformTab = ({
    rotation,
    scaling,
    hFlipPossible,
    vFlipPossible,
    logIncrements,
    transformFlags,
    testRotation,
    rotate,
    testScaling,
    scale,
    hFlip,
    vFlip,
}: TransformTabProps) => {
    const [, setRotationIncrement] = useState(logIncrements.rotate);
    const [, setScalingIncrement] = useState(logIncrements.scale);
    const [scaleENodes, setScaleENodes] = useState(transformFlags.scaleENodes);
    const [scaleConnectors, setScaleConnectors] = useState(transformFlags.scaleConnectors);
    const [scaleArrowheads, setScaleArrowheads] = useState(transformFlags.scaleArrowheads);
    const [scaleLinewidths, setScaleLinewidths] = useState(transformFlags.scaleLinewidths);
    const [scaleDash, setScaleDash] = useState(transformFlags.scaleDash);
    const [flipArrowheads, setFlipArrowheads] = useState(transformFlags.flipArrowheads);

    const originDescription = (
        <>
            <i>either</i>&thinsp; the last-selected location on the canvas <i>or</i>&thinsp; (if no location
            is selected) the center of either the currently focused node or (if no node is focused) the
            last-selected node
        </>
    );

    return (
        <div className='flex flex-col h-full'>
            <InputField
                label='Rotate'
                tooltip={<>Rotate the selected nodes around {originDescription}.</>}
                tooltipPlacement='right'
                value={rotation}
                min={-MAX_ROTATION_INPUT}
                max={MAX_ROTATION_INPUT}
                step={0}
                width={'long'}
                onChange={(e) => {
                    const [val, delta] = parseCyclicInputValue(
                        e.target.value,
                        rotation,
                        logIncrements.rotate,
                        MIN_ROTATION,
                        360,
                        Math.max(0, -MIN_ROTATION_LOG_INCREMENT)
                    );
                    if (!isNaN(val) && val !== rotation && testRotation(delta)) rotate(delta);
                }}
            />
            <InputField
                label='log Increment'
                value={logIncrements.rotate}
                min={MIN_ROTATION_LOG_INCREMENT}
                max={MAX_ROTATION_LOG_INCREMENT}
                step={1}
                width={'short'}
                lowTopMargin={true}
                onChange={(e) =>
                    setRotationIncrement(
                        (logIncrements.rotate = validInt(
                            e.target.value,
                            MIN_ROTATION_LOG_INCREMENT,
                            MAX_ROTATION_LOG_INCREMENT
                        ))
                    )
                }
            />
            <InputField
                label='Scale %'
                tooltip={
                    <>
                        Scale the selected nodes, using as origin {originDescription}. By default, scaling
                        does not affect the sizes of the selected nodes but only their distances to each
                        other. This can be changed by selecting the relevant option below.
                    </>
                }
                tooltipPlacement='right'
                value={scaling}
                min={0}
                max={MAX_SCALING}
                step={0}
                width={'long'}
                onChange={(e) => {
                    const val = parseInputValue(
                        e.target.value,
                        0,
                        MAX_SCALING,
                        scaling,
                        logIncrements.scale,
                        Math.max(0, -MIN_SCALING_LOG_INCREMENT)
                    );
                    if (!isNaN(val) && val !== scaling && testScaling(val)) scale(val);
                }}
            />
            <InputField
                label='log Increment'
                value={logIncrements.scale}
                min={MIN_SCALING_LOG_INCREMENT}
                max={MAX_SCALING_LOG_INCREMENT}
                step={1}
                width={'short'}
                lowTopMargin={true}
                onChange={(e) =>
                    setScalingIncrement(
                        (logIncrements.scale = validInt(
                            e.target.value,
                            MIN_SCALING_LOG_INCREMENT,
                            MAX_SCALING_LOG_INCREMENT
                        ))
                    )
                }
            />
            <div className='grid grid-cols-2 mx-1.5 my-4'>
                <BasicColoredButton
                    id='hflip-button'
                    label='Horiz. flip'
                    style='px-2 mr-1.5 rounded-lg text-sm'
                    tooltip={
                        <>
                            Flips the selected independent nodes horizontally, using an axis that runs vertically
                            through {originDescription}.<HotkeyComp mapKey='hflip' />
                        </>
                    }
                    tooltipPlacement='left'
                    disabled={!hFlipPossible}
                    onClick={hFlip}
                />
                <BasicColoredButton
                    id='vflip-button'
                    label='Vert. flip'
                    style='px-2 rounded-lg text-sm'
                    tooltip={
                        <>
                            Flips the selected independent nodes vertically, using an axis that runs horizontally
                            through {originDescription}.<HotkeyComp mapKey='vflip' />
                        </>
                    }
                    tooltipPlacement='right'
                    disabled={!vFlipPossible}
                    onClick={vFlip}
                />
            </div>
            <CheckBoxField
                label='Scale entity nodes'
                value={scaleENodes}
                onChange={() => setScaleENodes((prev) => (transformFlags.scaleENodes = !prev))}
            />
            <CheckBoxField
                label='Scale connectors'
                value={scaleConnectors}
                onChange={() => setScaleConnectors((prev) => (transformFlags.scaleConnectors = !prev))}
            />
            <CheckBoxField
                label='Scale arrowheads'
                value={scaleArrowheads}
                onChange={() => setScaleArrowheads((prev) => (transformFlags.scaleArrowheads = !prev))}
            />
            <CheckBoxField
                label='Scale linewidths'
                value={scaleLinewidths}
                onChange={() => setScaleLinewidths((prev) => (transformFlags.scaleLinewidths = !prev))}
            />
            <CheckBoxField
                label='Scale stroke patterns'
                value={scaleDash}
                onChange={() => setScaleDash((prev) => (transformFlags.scaleDash = !prev))}
            />
            <CheckBoxField
                label='Flip arrowheads'
                value={flipArrowheads}
                onChange={() => setFlipArrowheads((prev) => (transformFlags.flipArrowheads = !prev))}
            />
        </div>
    );
};

export default TransformTab;
