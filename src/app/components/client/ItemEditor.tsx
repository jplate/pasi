import React, { useRef } from 'react';
import clsx from 'clsx';
import { Placement } from './EditorComponents';
import { BasicColoredButton } from './Button';
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
import { MIN_TRANSLATION_LOG_INCREMENT, MAX_TRANSLATION_LOG_INCREMENT } from '../../Constants.ts';
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
    text?: React.ReactNode;
    key?: string;
    value?: any;
    step?: number;
    min?: number;
    max?: number;
    style?: string;
    disabled?: boolean;
    tooltip?: React.ReactNode;
    tooltipPlacement?: Placement;
    values?: React.ReactNode[]; // the values of a menu
    width?: Width;
    negativeTopMargin?: boolean;
    lowTopMargin?: boolean;
    extraBottomMargin?: boolean;
    onMenuChange?: (index: number) => void; // callback for menu change
    fullHeight?: boolean;
    readOnly?: boolean;
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

type Handler =
    | null
    | (() => void)
    | ((e: React.ChangeEvent<HTMLInputElement>) => void)
    | ((e: React.ChangeEvent<HTMLTextAreaElement>) => void)
    | ((e: number) => void);

interface HandlerMemo {
    key: string;
    handler: Handler;
}

const ItemEditor = React.memo(({ info, logIncrement, onIncrementChange, onChange }: ItemEditorProps) => {
    // We memoize the onChange function, so as to notice when a new item has been selected, in which case the memoized handlers have to be replaced:
    const onChangeMemo = useRef<
        | ((
              e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | number | null,
              key: string
          ) => void)
        | null
    >(null);

    // We memoize the handlers in order to allow the InputFields etc. to be memoized by React itself:
    const handlerMemos = useRef<HandlerMemo[]>([]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | number | null,
        key: string
    ) => {
        // console.log(`change event: ${e?.nativeEvent}`);
        onChange(e, key);
    };

    const itemChanged = onChange !== onChangeMemo.current;

    onChangeMemo.current = onChange;

    handlerMemos.current = info.map((entry, i) => {
        const key = entry.key ?? '';
        if (itemChanged || handlerMemos.current.length <= i || handlerMemos.current[i].key !== key) {
            // Create a new handler memo:
            let handler = null;
            switch (entry.type) {
                case 'checkbox':
                    handler = () => handleChange(null, key);
                    break;
                case 'number input':
                    handler = (e: React.ChangeEvent<HTMLInputElement>) => handleChange(e, key);
                    break;
                case 'string input':
                    handler = (e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange(e, key);
                    break;
                case 'button':
                    handler = () => handleChange(null, key);
                    break;
                case 'logIncrement':
                    handler = (e: React.ChangeEvent<HTMLInputElement>) => {
                        if (e) {
                            const val = validInt(
                                e.target.value,
                                MIN_TRANSLATION_LOG_INCREMENT,
                                MAX_TRANSLATION_LOG_INCREMENT
                            );
                            onIncrementChange(val);
                        }
                    };
                    break;
                case 'textarea':
                    handler = (e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange(e, key);
                    break;
                case 'menu':
                    handler = (e: number) => handleChange(e, key);
                    break;
                default:
            }
            return { key, handler };
        } else {
            // Use the old memo:
            return handlerMemos.current[i];
        }
    });

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
                                onChange={handlerMemos.current[i].handler as () => void}
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
                                onChange={
                                    handlerMemos.current[i].handler as (
                                        e: React.ChangeEvent<HTMLInputElement>
                                    ) => void
                                }
                                readOnly={entry.readOnly}
                            />
                        );
                    case 'string input':
                        return (
                            <InputField
                                key={i}
                                label={entry.text ?? ''}
                                width={entry.width}
                                value={entry.value}
                                lowTopMargin={entry.lowTopMargin}
                                negativeTopMargin={entry.negativeTopMargin}
                                extraBottomMargin={entry.extraBottomMargin}
                                tooltip={entry.tooltip}
                                tooltipPlacement={entry.tooltipPlacement}
                                disabled={entry.disabled}
                                onChange={
                                    handlerMemos.current[i].handler as (
                                        e: React.ChangeEvent<HTMLInputElement>
                                    ) => void
                                }
                                readOnly={entry.readOnly}
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
                                onClick={handlerMemos.current[i].handler as () => void}
                            />
                        );
                    case 'logIncrement':
                        return (
                            <InputField
                                key={i}
                                label={'log Increment'}
                                width={'short'}
                                value={logIncrement}
                                min={MIN_TRANSLATION_LOG_INCREMENT}
                                max={MAX_TRANSLATION_LOG_INCREMENT}
                                step={1}
                                extraBottomMargin={entry.extraBottomMargin}
                                tooltip={entry.tooltip}
                                tooltipPlacement={entry.tooltipPlacement}
                                onChange={
                                    handlerMemos.current[i].handler as (
                                        e: React.ChangeEvent<HTMLInputElement>
                                    ) => void
                                }
                            />
                        );
                    case 'textarea':
                        return (
                            <Textarea
                                key={i}
                                fullHeight={entry.fullHeight}
                                value={entry.value}
                                onChange={
                                    handlerMemos.current[i].handler as (
                                        e: React.ChangeEvent<HTMLTextAreaElement>
                                    ) => void
                                }
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
                                onChange={handlerMemos.current[i].handler as (e: number) => void}
                            />
                        );
                    default:
                        return null;
                }
            })}
        </div>
    );
});
ItemEditor.displayName = 'ItemEditor';

export default ItemEditor;
