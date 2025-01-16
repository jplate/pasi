import react from 'react';
import clsx from 'clsx/lite';
import { Placement } from 'tippy.js';
import { BasicColoredButton } from './Button.tsx';
import {
    CheckBoxField,
    MenuField,
    GlossField,
    InputField,
    LabelField,
    Textarea,
    Width,
    validInt,
} from './EditorComponents.tsx';
import { MIN_TRANSLATION_LOG_INCREMENT, MAX_TRANSLATION_LOG_INCREMENT } from '../../Constants';
import Item from './items/Item';
import ENode from './items/ENode';
import CNode from './items/CNode';
import CNodeGroup from './CNodeGroup';

export const MAX_ROTATION_INPUT = 9999;

/**
 * Returns a function that moves the ENodes and CNodeGroups in the array that is supplied to that function up or down in that same array.
 * To be called by implementations of Item.handleEditing().
 */
export const getRankMover =
    (val: string, selection: Item[]) => (item: Item, array: (ENode | CNodeGroup)[]) => {
        const n = array.length;
        const selectedListMembers = selection
            .reduce(
                (acc: (ENode | CNodeGroup)[], it) =>
                    it instanceof ENode
                        ? [...acc, it]
                        : it instanceof CNode
                          ? [...acc, it.group as CNodeGroup]
                          : acc,
                []
            )
            .filter((it, i, arr) => i === arr.indexOf(it));
        const currentPositions: [ENode | CNodeGroup, number][] = selectedListMembers.map((m) => [
            m,
            array.indexOf(m),
        ]);
        const currentPosMap = new Map<ENode | CNodeGroup, number>(currentPositions);
        const focusPos =
            item instanceof ENode
                ? currentPosMap.get(item)
                : item instanceof CNode
                  ? currentPosMap.get(item.group as CNodeGroup)
                  : null;
        let result = array;
        if (typeof focusPos === 'number') {
            const newPos = parseInt(val);
            let incr = 0;
            if (newPos > focusPos && currentPositions.every(([, pos]) => pos + 1 < n)) {
                // move the item up in the Z-order (i.e., towards the end of the array), but only by one
                incr = 1;
            } else if (newPos < focusPos && currentPositions.every(([, pos]) => pos > 0)) {
                // move the item down in the Z-order, but only by one
                incr = -1;
            }
            if (incr !== 0) {
                const newPosMap = new Map<number, ENode | CNodeGroup>(
                    currentPositions.map(([it, pos]) => [pos + incr, it])
                );
                const unselectedListMembers = array.filter((it) => !currentPosMap.has(it));
                result = new Array<ENode | CNodeGroup>(n);
                for (let i = 0, j = 0; i < n; i++) {
                    if (newPosMap.has(i)) {
                        const it = newPosMap.get(i);
                        if (it) result[i] = it;
                    } else {
                        result[i] = unselectedListMembers[j++];
                    }
                }
            }
        }
        return result;
    };

type Type =
    | 'label'
    | 'gloss'
    | 'checkbox'
    | 'number input'
    | 'string input'
    | 'button'
    | 'logIncrement'
    | 'textarea'
    | 'menu';

export type Entry = {
    type: Type;
    text?: react.ReactNode;
    key?: string;
    value?: any;
    step?: number;
    min?: number;
    max?: number;
    style?: string;
    disabled?: boolean;
    tooltip?: react.ReactNode;
    tooltipPlacement?: Placement;
    values?: react.ReactNode[]; // the values of a menu
    width?: Width;
    negativeTopMargin?: boolean;
    lowTopMargin?: boolean;
    extraBottomMargin?: boolean;
    onMenuChange?: (index: number) => void; // callback for menu change
    fullHeight?: boolean;
};

interface ItemEditorProps {
    info: Entry[];
    logIncrement: number;
    onIncrementChange: (val: number) => void;
    onChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | number | null,
        key: string
    ) => void;
}

const ItemEditor = ({ info, logIncrement, onIncrementChange, onChange }: ItemEditorProps) => {
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | number | null,
        key: string
    ) => {
        // console.log(`change event: ${e?.nativeEvent}`);
        onChange(e, key);
    };

    return (
        <div className='flex flex-col h-full'>
            {info.map((entry, i) => {
                switch (entry.type) {
                    case 'label':
                        return <LabelField key={i} label={entry.text ?? ''} style={entry.style} />;
                    case 'gloss':
                        return <GlossField key={i} label={entry.text ?? ''} style={entry.style} />;
                    case 'checkbox':
                        return (
                            <CheckBoxField
                                key={i}
                                label={entry.text ?? ''}
                                style={entry.style}
                                value={entry.value}
                                extraBottomMargin={entry.extraBottomMargin}
                                tooltip={entry.tooltip}
                                tooltipPlacement={entry.tooltipPlacement}
                                disabled={entry.disabled}
                                onChange={() => handleChange(null, entry.key ?? '')}
                            />
                        );
                    case 'number input':
                        return (
                            <InputField
                                key={i}
                                label={entry.text ?? ''}
                                width={entry.width}
                                value={entry.value}
                                min={entry.min}
                                max={entry.max}
                                step={entry.step}
                                lowTopMargin={entry.lowTopMargin}
                                negativeTopMargin={entry.negativeTopMargin}
                                extraBottomMargin={entry.extraBottomMargin}
                                tooltip={entry.tooltip}
                                tooltipPlacement={entry.tooltipPlacement}
                                disabled={entry.disabled}
                                onChange={(e) => handleChange(e, entry.key ?? '')}
                            />
                        );
                    case 'string input':
                        return (
                            <InputField
                                key={i}
                                type='string'
                                label={entry.text ?? ''}
                                width={entry.width}
                                value={entry.value}
                                lowTopMargin={entry.lowTopMargin}
                                negativeTopMargin={entry.negativeTopMargin}
                                extraBottomMargin={entry.extraBottomMargin}
                                tooltip={entry.tooltip}
                                tooltipPlacement={entry.tooltipPlacement}
                                disabled={entry.disabled}
                                onChange={(e) => handleChange(e, entry.key ?? '')}
                            />
                        );
                    case 'button':
                        return (
                            <BasicColoredButton
                                key={i}
                                id={`${i}`}
                                label={entry.text}
                                style={clsx(
                                    'mx-2 rounded-lg text-sm',
                                    entry.extraBottomMargin ? 'mb-4' : 'mb-2',
                                    entry.style
                                )}
                                disabled={!!entry.disabled}
                                tooltip={entry.tooltip}
                                tooltipPlacement={entry.tooltipPlacement}
                                onClick={() => handleChange(null, entry.key ?? '')}
                            />
                        );
                    case 'logIncrement':
                        return (
                            <InputField
                                key={i}
                                type='number'
                                label={'log Increment'}
                                width={'short'}
                                value={logIncrement}
                                min={MIN_TRANSLATION_LOG_INCREMENT}
                                max={MAX_TRANSLATION_LOG_INCREMENT}
                                step={1}
                                extraBottomMargin={entry.extraBottomMargin}
                                tooltip={entry.tooltip}
                                tooltipPlacement={entry.tooltipPlacement}
                                onChange={(e) => {
                                    if (e) {
                                        const val = validInt(
                                            e.target.value,
                                            MIN_TRANSLATION_LOG_INCREMENT,
                                            MAX_TRANSLATION_LOG_INCREMENT
                                        );
                                        onIncrementChange(val);
                                    }
                                }}
                            />
                        );
                    case 'textarea':
                        return (
                            <Textarea
                                key={i}
                                fullHeight={entry.fullHeight}
                                value={entry.value}
                                onChange={(e) => handleChange(e, entry.key ?? '')}
                            />
                        );
                    case 'menu':
                        return (
                            <MenuField
                                key={i}
                                label={entry.text ?? ''}
                                values={entry.values ?? []}
                                value={entry.value}
                                lowTopMargin={entry.lowTopMargin}
                                extraBottomMargin={entry.extraBottomMargin}
                                tooltip={entry.tooltip}
                                tooltipPlacement={entry.tooltipPlacement}
                                onChange={(e: number) => handleChange(e, entry.key ?? '')}
                            />
                        );
                    default:
                        return null;
                }
            })}
        </div>
    );
};

export default ItemEditor;
