import React, { useState, useCallback } from 'react';
import {
    InputField,
    CheckBoxField,
    parseInputValue,
    parseCyclicInputValue,
    validInt,
} from './EditorComponents.tsx';
import { BasicColoredButton } from './Button.tsx';
import { MAX_SCALING, MIN_ROTATION } from './MainPanel';
import { HotkeyComp } from './Hotkeys';
import {
    MIN_ROTATION_LOG_INCREMENT,
    MAX_ROTATION_LOG_INCREMENT,
    MIN_SCALING_LOG_INCREMENT,
    MAX_SCALING_LOG_INCREMENT,
    MAX_ROTATION_INPUT,
} from '../../Constants.ts';

const slwTooltip = (
    <>
        This option affects the linewidths of contours, as well as&mdash;provided that the corresponding
        options (&lsquo;Scale entity nodes&rsquo;, etc.) have been selected&mdash;the linewidths of entity
        nodes, connectors, and arrowheads.
    </>
);

const sspTooltip = (
    <>
        This option affects the stroke patterns of contours, as well as&mdash;provided that the corresponding
        options (&lsquo;Scale entity nodes&rsquo;, etc.) have been selected&mdash;the stroke patterns of
        entity nodes, connectors, and arrowheads.
    </>
);

const originDescription = (
    <>
        <i>either</i>&thinsp; the last-selected location on the canvas <i>or</i>&thinsp; (if no location is
        selected) the center of either the currently focused node or (if no node is focused) the last-selected
        node
    </>
);

const rotateTooltip = <>Rotate the selected nodes around {originDescription}.</>;

const scaleTooltip = (
    <>
        Scale the selected nodes, using as origin {originDescription}. By default, scaling does not affect the
        sizes of the selected nodes but only their distances to each other.
    </>
);

const hFlipTooltip = (
    <>
        Flips the selected independent nodes horizontally, using an axis that runs vertically through{' '}
        {originDescription}.<HotkeyComp mapKey='hflip' />
    </>
);

const vFlipTooltip = (
    <>
        Flips the selected independent nodes vertically, using an axis that runs horizontally through{' '}
        {originDescription}.<HotkeyComp mapKey='vflip' />
    </>
);

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

    const handleRotation = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const [val, delta] = parseCyclicInputValue(
                e.target.value,
                rotation,
                logIncrements.rotate,
                MIN_ROTATION,
                360,
                Math.max(0, -MIN_ROTATION_LOG_INCREMENT)
            );
            if (!isNaN(val) && val !== rotation && testRotation(delta)) rotate(delta);
        },
        [rotation, logIncrements.rotate, testRotation, rotate]
    );

    const handleChangeRotationIncrement = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) =>
            setRotationIncrement(
                (logIncrements.rotate = validInt(
                    e.target.value,
                    MIN_ROTATION_LOG_INCREMENT,
                    MAX_ROTATION_LOG_INCREMENT
                ))
            ),
        [logIncrements, setRotationIncrement]
    );

    const handleScaling = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = parseInputValue(
                e.target.value,
                0,
                MAX_SCALING,
                scaling,
                logIncrements.scale,
                Math.max(0, -MIN_SCALING_LOG_INCREMENT)
            );
            if (!isNaN(val) && val !== scaling && testScaling(val)) scale(val);
        },
        [scaling, logIncrements.scale, testScaling, scale]
    );

    const handleChangeScalingIncrement = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) =>
            setScalingIncrement(
                (logIncrements.scale = validInt(
                    e.target.value,
                    MIN_SCALING_LOG_INCREMENT,
                    MAX_SCALING_LOG_INCREMENT
                ))
            ),
        [logIncrements, setScalingIncrement]
    );

    const handleScENodeChange = useCallback(
        () => setScaleENodes((prev) => (transformFlags.scaleENodes = !prev)),
        [setScaleENodes, transformFlags]
    );

    const handleScConChange = useCallback(
        () => setScaleConnectors((prev) => (transformFlags.scaleConnectors = !prev)),
        [setScaleConnectors, transformFlags]
    );

    const handleScAhChange = useCallback(
        () => setScaleArrowheads((prev) => (transformFlags.scaleArrowheads = !prev)),
        [setScaleArrowheads, transformFlags]
    );

    const handleScLwChange = useCallback(
        () => setScaleLinewidths((prev) => (transformFlags.scaleLinewidths = !prev)),
        [setScaleLinewidths, transformFlags]
    );

    const handleScDashChange = useCallback(
        () => setScaleDash((prev) => (transformFlags.scaleDash = !prev)),
        [setScaleDash, transformFlags]
    );

    const handleFlipAhChange = useCallback(
        () => setFlipArrowheads((prev) => (transformFlags.flipArrowheads = !prev)),
        [setFlipArrowheads, transformFlags]
    );

    return (
        <div className='flex flex-col h-full'>
            <InputField
                label='Rotate'
                tooltip={rotateTooltip}
                tooltipPlacement='left'
                value={rotation}
                min={-MAX_ROTATION_INPUT}
                max={MAX_ROTATION_INPUT}
                step={0}
                width={'long'}
                onChange={handleRotation}
            />
            <InputField
                label='log Increment'
                value={logIncrements.rotate}
                min={MIN_ROTATION_LOG_INCREMENT}
                max={MAX_ROTATION_LOG_INCREMENT}
                step={1}
                width={'short'}
                lowTopMargin={true}
                onChange={handleChangeRotationIncrement}
            />
            <InputField
                label='Scale %'
                tooltip={scaleTooltip}
                tooltipPlacement='left'
                value={scaling}
                min={0}
                max={MAX_SCALING}
                step={0}
                width={'long'}
                onChange={handleScaling}
            />
            <InputField
                label='log Increment'
                value={logIncrements.scale}
                min={MIN_SCALING_LOG_INCREMENT}
                max={MAX_SCALING_LOG_INCREMENT}
                step={1}
                width={'short'}
                lowTopMargin={true}
                onChange={handleChangeScalingIncrement}
            />
            <div className='grid grid-cols-2 mx-1.5 my-4'>
                <BasicColoredButton
                    id='hflip-button'
                    label='Horiz. flip'
                    style='px-2 mr-1.5 rounded-lg text-sm'
                    tooltip={hFlipTooltip}
                    tooltipPlacement='left'
                    disabled={!hFlipPossible}
                    onClick={hFlip}
                />
                <BasicColoredButton
                    id='vflip-button'
                    label='Vert. flip'
                    style='px-2 rounded-lg text-sm'
                    tooltip={vFlipTooltip}
                    tooltipPlacement='right'
                    disabled={!vFlipPossible}
                    onClick={vFlip}
                />
            </div>
            <CheckBoxField label='Scale entity nodes' value={scaleENodes} onChange={handleScENodeChange} />
            <CheckBoxField label='Scale connectors' value={scaleConnectors} onChange={handleScConChange} />
            <CheckBoxField label='Scale arrowheads' value={scaleArrowheads} onChange={handleScAhChange} />
            <CheckBoxField
                label='Scale linewidths'
                value={scaleLinewidths}
                tooltip={slwTooltip}
                tooltipPlacement='left'
                onChange={handleScLwChange}
            />
            <CheckBoxField
                label='Scale stroke patterns'
                value={scaleDash}
                tooltip={sspTooltip}
                tooltipPlacement='left'
                onChange={handleScDashChange}
            />
            <CheckBoxField label='Flip arrowheads' value={flipArrowheads} onChange={handleFlipAhChange} />
        </div>
    );
};

export default TransformTab;
