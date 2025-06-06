import React, { useContext, useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { useFloating, shift, offset, Strategy } from '@floating-ui/react-dom';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { getCyclicValue, round } from '../../util/MathTools';
import { TOOLTIP_DELAY, TOOLTIP_OPACITY } from '@/app/Constants';

import { DarkModeContext } from './MainPanel';

const ACCENT_LIGHT = 'accent-slate-50';
const ACCENT_DARK = 'accent-amber-600 dark';

export type Width = 'short' | 'medium' | 'long';
export type Placement = 'top' | 'right' | 'bottom' | 'left';

interface CheckBoxFieldProps {
    label: React.ReactNode;
    style?: string;
    value: boolean;
    extraBottomMargin?: boolean;
    tooltip?: React.ReactNode;
    tooltipPlacement?: Placement;
    disabled?: boolean;
    onChange: () => void;
}

export const CheckBoxField = React.memo(
    ({
        label,
        style = '',
        value,
        extraBottomMargin,
        tooltip,
        tooltipPlacement,
        disabled = false,
        onChange,
    }: CheckBoxFieldProps) => {
        const dark = useContext(DarkModeContext);

        const comp = (
            <label
                className={clsx(
                    'flex ml-4 py-1 text-sm whitespace-nowrap items-center disabled:pointer-events-none', // Sometimes a checkbox label
                    // may overlap the controls of an input field. In that case we need the disabled checkbox label to be transparent to pointer events.
                    style,
                    extraBottomMargin ? 'mb-4' : ''
                )}
            >
                <input
                    type='checkbox'
                    className={clsx('checkbox mr-2 disabled:opacity-50', dark ? ACCENT_DARK : ACCENT_LIGHT)}
                    checked={value}
                    disabled={disabled}
                    onChange={() => {
                        onChange();
                    }}
                />
                <span className={disabled ? 'opacity-50' : ''}>{label}</span>{' '}
                {/* We apply the opacity styling at the level of the child components of the 
                    // label element (rather than to apply it to the label element itself) in order to keep the opacity of the tooltip at 100%. */}
            </label>
        );

        return tooltip ? <WithTooltip comp={comp} tooltip={tooltip} placement={tooltipPlacement} /> : comp;
    }
);
CheckBoxField.displayName = 'CheckBoxField';

type InputType = string | number;

interface InputFieldProps<T extends InputType> {
    label: React.ReactNode;
    value: T;
    step?: number;
    min?: number;
    max?: number;
    width?: Width;
    negativeTopMargin?: boolean;
    lowTopMargin?: boolean;
    extraBottomMargin?: boolean;
    tooltip?: React.ReactNode;
    tooltipPlacement?: Placement;
    disabled?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    readOnly?: boolean;
}

export const InputField = React.memo(
    <T extends InputType>({
        label,
        value,
        min = Number.MIN_SAFE_INTEGER,
        max = Number.MAX_SAFE_INTEGER,
        step = 1,
        width = 'medium',
        lowTopMargin = false,
        negativeTopMargin = false,
        extraBottomMargin = false,
        tooltip,
        tooltipPlacement,
        disabled = false,
        onChange,
        readOnly = false,
    }: InputFieldProps<T>) => {
        const w = width == 'short' ? 'min-w-10 w-10' : width == 'medium' ? 'min-w-16 w-16' : 'min-w-24 w-24';
        const labelComp = (
            <span className={clsx('pointer-events-auto', disabled ? 'opacity-50' : '')}>{label}</span>
        ); // We apply the opacity
        // styling at the level of the child components of the label element, rather than to apply it to the label element itself, in order
        // to keep the opacity of the tooltip at 100%. (Otherwise the tooltip's opacity would be affected by the disabled state.)

        const inputComp = (
            <input
                className={clsx(
                    w,
                    typeof value === 'number' ? 'text-right' : 'pr-2', // string inputs need extra padding on the right;
                    // whereas number inputs have space reserved on the right for the arrow buttons, which is already a sort of padding.
                    'ml-2 pl-2 border border-btnborder rounded-md pointer-events-auto focus:outline-none enabled:bg-textfieldbg enabled:text-textfieldcolor',
                    disabled ? 'opacity-50' : ''
                )}
                value={value}
                type={typeof value}
                step={step === 0 ? 'any' : step}
                min={min}
                max={max}
                style={{ fontVariantLigatures: 'none' }}
                spellCheck={false}
                disabled={disabled}
                onChange={onChange}
                readOnly={readOnly}
            />
        );

        return (
            <label
                className={clsx(
                    'flex items-center justify-end px-2 py-1 text-sm pointer-events-none', // We disable pointer events for the overall component because of
                    // the possibility of overlap with other components in the case of negativeTopMargin being set to true.
                    negativeTopMargin ? 'mt-[-1rem]' : lowTopMargin ? 'mt-[-0.25rem]' : '',
                    extraBottomMargin ? 'mb-4' : ''
                )}
            >
                {tooltip ? (
                    <WithTooltip comp={labelComp} tooltip={tooltip} placement={tooltipPlacement} />
                ) : (
                    labelComp
                )}
                {inputComp}
            </label>
        );
    }
);
InputField.displayName = 'InputField';

interface SliderProps {
    value: number;
    min: number;
    max: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Slider = ({ value, min, max, onChange }: SliderProps) => {
    return <input type='range' value={value} min={min} max={max} onChange={onChange} />;
};

interface TextareaProps {
    value: string;
    fullHeight?: boolean;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const Textarea = React.memo(({ value, fullHeight = false, onChange }: TextareaProps) => {
    return (
        <textarea
            className={clsx(
                'bg-textfieldbg text-textfieldcolor rounded-md p-2 m-2 shadow-inner text-sm focus:outline-none resize-none',
                fullHeight ? 'h-full' : 'h-48'
            )}
            style={{ fontVariantLigatures: 'none' }}
            spellCheck={false}
            value={value}
            onChange={onChange}
        />
    );
});
Textarea.displayName = 'Textarea';

export const menuButtonClassName = clsx(
    'inline-flex items-center gap-2 rounded-md bg-btnbg/85 text-sm text-btncolor shadow-inner',
    'focus:outline-none data-[hover]:bg-btnhoverbg data-[hover]:text-btnhovercolor data-[open]:bg-btnhoverbg data-[open]:text-btnhovercolor',
    'data-[focus]:outline-1 data-[focus]:outline-btnhoverbg'
);

export const menuItemButtonClassName =
    'flex w-full items-center gap-2 rounded-sm px-2 py-1 data-[focus]:bg-btnhoverbg data-[focus]:text-btnhovercolor';

export const ChevronSVG = React.memo(() => (
    <svg
        className='size-4' // source: https://heroicons.com/
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth={1.5}
        stroke='currentColor'
    >
        <path strokeLinecap='round' strokeLinejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' />
    </svg>
));
ChevronSVG.displayName = 'ChevronSVG';

export const MenuItemList = React.memo(({ children }: Readonly<{ children: React.ReactNode }>) => {
    return (
        <Transition
            enter='transition ease-out duration-75'
            enterFrom='opacity-0 scale-95'
            enterTo='opacity-100 scale-100'
            leave='transition ease-in duration-100'
            leaveFrom='opacity-100 scale-100'
            leaveTo='opacity-0 scale-95'
        >
            <MenuItems
                anchor='bottom end'
                className={clsx(
                    'menu w-72 transition origin-top-right rounded-md border border-menuborder bg-btnbg/20 p-1 text-sm text-btncolor',
                    '[--anchor-gap:var(--spacing-1)] focus:outline-none'
                )}
            >
                {children}
            </MenuItems>
        </Transition>
    );
});
MenuItemList.displayName = 'MenuItemList';

interface MenuFieldProps {
    label: React.ReactNode;
    values: React.ReactNode[];
    value: number; // the index of the currently selected value in values
    lowTopMargin?: boolean;
    extraBottomMargin?: boolean;
    tooltip?: React.ReactNode;
    tooltipPlacement?: Placement;
    onChange: (index: number) => void;
}

export const MenuField = React.memo(
    ({
        label,
        value,
        values,
        lowTopMargin = false,
        extraBottomMargin = false,
        tooltip,
        tooltipPlacement,
        onChange,
    }: MenuFieldProps) => {
        const labelComp = <span className='pl-1 mr-2 whitespace-nowrap'>{label}</span>;
        const menuComp = (
            <Menu>
                <MenuButton className={clsx('w-full px-3', menuButtonClassName)}>
                    <div className='flex-1 text-left'>{values[value]}</div>
                    <div className='flex-none'>
                        <ChevronSVG />
                    </div>
                </MenuButton>
                <MenuItemList>
                    {values.map((val, i) => (
                        <MenuItem key={i}>
                            <button className={menuItemButtonClassName} onClick={() => onChange(i)}>
                                {values[i]}
                            </button>
                        </MenuItem>
                    ))}
                </MenuItemList>
            </Menu>
        );
        return (
            <div
                className={clsx(
                    'flex items-center justify-center px-2 py-1 mr-0.5 text-sm',
                    lowTopMargin ? 'mt-[-4px]' : '',
                    extraBottomMargin ? 'mb-4' : ''
                )}
            >
                {tooltip ? (
                    <WithTooltip comp={labelComp} tooltip={tooltip} placement={tooltipPlacement} />
                ) : (
                    labelComp
                )}
                {menuComp}
            </div>
        );
    }
);
MenuField.displayName = 'MenuField';

interface LabelFieldProps {
    label: React.ReactNode;
    style?: string;
}

export const LabelField = React.memo(({ label, style = '' }: LabelFieldProps) => {
    return (
        <div
            className={clsx(
                'block px-2 py-1 text-center text-sm tracking-wider font-variant-ligatures-none',
                style
            )}
        >
            {label}
        </div>
    );
});
LabelField.displayName = 'LabelField';

interface GlossFieldProps {
    label: React.ReactNode;
    style?: string;
}

export const GlossField = React.memo(({ label, style = '' }: GlossFieldProps) => {
    return (
        <div className={clsx('block px-2 py-1', style)}>
            <p className='text-pretty'>{label}</p>
        </div>
    );
});
GlossField.displayName = 'GlossField';

export const validInt = (s: string, min: number, max: number, dflt: number = min) => {
    const val = parseInt(s);
    return isNaN(val) ? dflt : Math.min(Math.max(min, val), max);
};

export const validFloat = (s: string, min: number, max: number, dflt: number = min) => {
    const val = parseFloat(s);
    return isNaN(val) ? dflt : Math.min(Math.max(min, val), max);
};

/**
 *  Computes the new value of an input number field with step 'any', whose stepping controls only increase the value by 1 or -1. The 'intended' increase or decrease is given
 *  by 10 ** logIncrement.
 */
const getRawValue = (prev: number, input: number, logIncrement: number) => {
    const delta = 10 ** logIncrement;
    const stepper: boolean = input == prev + 1 || input == prev - 1; // in this case we assume that the input field's controls were used.
    return stepper ? prev + (input > prev ? 1 : -1) * delta : input;
};

/**
 * Computes and validates the new value of an input number field with step 'any', whose stepping controls only increase the value by 1 or -1. The 'intended' increase or
 *  decrease is given by 10 ** logIncrement.
 *
 * CAUTION: Since this creates a temporary mismatch between the value coming from the input field and the property it represents, care has to be taken that this function
 * be called ONLY ONCE per change event.
 */
export const parseInputValue = (
    input: string,
    min: number,
    max: number,
    oldValue: number,
    logIncrement: number,
    roundingDigits: number
) => {
    const val = parseFloat(input);
    // console.log(`parsing input= ${input}, min= ${min}, max= ${max}, old= ${oldValue} logIncrement= ${logIncrement}`);
    if (isNaN(val)) {
        return NaN;
    } else {
        const raw = getRawValue(oldValue, val, logIncrement);
        const v0 = Math.min(Math.max(min, raw), max);
        const factor = 10 ** roundingDigits;
        const result = round(Math.round(v0 * factor) / factor, roundingDigits);
        //console.log(`v0: ${v0} factor: ${factor} result: ${result}`);
        return result;
    }
};

/**
 *  Computes and validates the new value of a 'cyclic' input number field with step 'any', whose stepping controls only increase the value by 1 or -1. The 'intended' increase or
 *  decrease is given by 10 ** logIncrement. Returns an array consisting of a normalized value (computed with getCyclicValue) and the result of subtracting oldValue from the
 *  'raw' value obtained from input. If the optional parameters are left unspecified, the first element of the returned array will be NaN.
 */
export const parseCyclicInputValue = (
    input: string,
    oldValue: number,
    logIncrement: number,
    min: number = 0,
    base: number = 0,
    roundingDigits: number = 0
): [val: number, delta: number] => {
    const val = parseFloat(input);
    if (isNaN(val)) {
        return [NaN, NaN];
    } else {
        const raw = getRawValue(oldValue, val, logIncrement);
        return [getCyclicValue(raw, min, base, 10 ** roundingDigits), raw - oldValue];
    }
};

export class DashValidator {
    private dottedIndex = -1; // the first index at which we've found a dot (possibly followed by one or more zeros) at the end of a portion of the stroke pattern input. We'll
    // assume that the user is editing at that point, and add the corresponding string - i.e., match - to the string shown in the input field.
    private match = ''; // the 'match' just mentioned
    private trailingSpace = false; // keeps track of whether a space should be added to the stroke pattern in editing

    constructor(
        public maxDashValue: number,
        public maxDashLength: number
    ) {}

    public write = (dash: number[]): string =>
        dash
            .map((n, i) => {
                return i == this.dottedIndex ? n + this.match : n;
            })
            .join(' ') + (this.trailingSpace ? ' ' : '');

    public read = (element: HTMLInputElement): number[] => {
        const { selectionEnd: caret } = element;
        const split = element.value.split(/[^0-9.]+/);
        let found = -1,
            uptoNext = 0,
            deleted = 0;
        for (let i = 0; i < split.length && caret; i++) {
            uptoNext += split[i].length + 1;
            const m0 = split[i].match(/^\d*\.\d*$/); // We're looking for representations of floating point numbers...
            const m1 = split[i].match(/\.0*$|0+$/); // ... that end EITHER with a dot followed by zero or more zeros OR with one or more zeros.
            if (m0 && m1) {
                if (caret < uptoNext) {
                    this.match = m1[0];
                    found = i;
                    break;
                } else deleted += m1[0].length;
            } else {
                // In this case, split[i] contains either no dot or two dots (unless the pattern has been pasted in, in which case split[i] may contain more than
                // two dots -- but we can safely ignore this possibility). So, if split[i] ends in a dot, that will be the SECOND dot, and it will effectively be deleted below,
                // when we're computing item.dash, along with any preceding zeros and possibly the first dot ('effectively' because the deletion is partially due to how
                // string representation of numbers works). We'll add their number to deleted.
                const m2 = split[i].match(/\.0*\.$|0*\.$/);
                if (m2) deleted += m2[0].length;
            }

            if (caret < uptoNext) break;
        }
        this.dottedIndex = found;
        this.trailingSpace = split[split.length - 1] === ''; // the last element of split will be '' iff the user entered a comma or space (or some combination thereof) at the end
        const slice = split.filter((s) => s !== '').slice(0, this.maxDashLength); // shorten the array if too long

        // Now we just have to translate the string array into numbers:
        let substituteZero = false,
            eliminateZero = false;
        const result = slice
            .map((s) => {
                const match = s.match(/^[^.]*\.[^.]*/); // If there is a second dot in s, then match[0] will only include the material up to that second dot (exclusive).
                const trimmed = match ? match[0] : s; // This may still be just a dot, in which case it should be interpreted as a zero.
                if (!substituteZero) substituteZero = trimmed.startsWith('.');
                if (!eliminateZero) eliminateZero = trimmed.match(/^0\d/) !== null;
                return Math.min(trimmed == '.' ? 0 : Number(trimmed), this.maxDashValue);
            })
            .filter((n) => !isNaN(n));
        if (caret)
            setTimeout(() => {
                const extra = eliminateZero ? -1 : substituteZero ? 1 : 0;
                element.setSelectionRange(caret + extra - deleted, caret + extra - deleted);
            }, 0);
        return result;
    };
}

interface WithToolTipProps {
    comp: React.ReactNode;
    tooltip: React.ReactNode;
    placement?: Placement;
    noStretch?: boolean;
}

export const WithTooltip = React.memo(
    ({ comp, tooltip, placement = 'top', noStretch = false }: WithToolTipProps) => {
        const [showTooltip, setShowTooltip] = useState(false);
        const { refs, floatingStyles, strategy } = useFloating({
            placement,
            middleware: [offset(8), shift()],
        });

        const handleMouseEnter = useCallback(() => setShowTooltip(true), [setShowTooltip]);

        const handleMouseLeave = useCallback(() => setShowTooltip(false), [setShowTooltip]);

        return (
            <div>
                <div
                    className={noStretch ? 'max-w-fit' : 'justify-items-stretch'}
                    ref={refs.setReference}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {comp}
                </div>
                {showTooltip && (
                    <Tooltip
                        content={tooltip}
                        ref={refs.setFloating}
                        styles={floatingStyles}
                        strategy={strategy}
                    />
                )}
            </div>
        );
    }
);
WithTooltip.displayName = 'WithTooltip';

interface TooltipProps {
    content: React.ReactNode;
    ref: (node: HTMLElement | null) => void;
    styles: React.CSSProperties;
    strategy: Strategy;
}

export const Tooltip = ({ content, ref, styles, strategy }: TooltipProps) => {
    const [opaque, setOpaque] = useState(false);

    // To keep proper positioning, the tooltip has to be mounted and unmounted every time it appears. To make it ease into view, we let it start
    // with opacity-0 and then change that after mounting:
    useEffect(() => {
        const timeout = setTimeout(() => {
            setOpaque(true);
        }, TOOLTIP_DELAY);

        return () => {
            clearTimeout(timeout);
        };
    }, []);

    return (
        <div
            className={clsx(
                'tooltip px-4 py-2 border-l border-btnborder shadow-lg text-sm hyphens-auto',
                !opaque ? 'opacity-0' : 'opacity-100'
            )}
            ref={ref}
            style={{
                ...styles,
                position: strategy,
                backgroundColor: `rgba(var(--tooltipbg), ${TOOLTIP_OPACITY})`,
                color: 'rgba(var(--btncolor))',
                borderRadius: '4px',
                zIndex: 1000,
                maxWidth: '250px', // Set a max width for the tooltip
            }}
        >
            {content}
        </div>
    );
};
