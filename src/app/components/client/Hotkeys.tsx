import React from 'react';

import { DEFAULT_TRANSLATION_LOG_INCREMENT, MAX_GROUP_LEVEL } from '@/app/Constants';
import { MAX_LINEWIDTH } from '@/app/components/client/items/Node';

export const pasi = (s: string) => {
    return <span className='pasi text-base'>{s}</span>;
};

interface HotkeyInfo {
    key: string;
    keys: string;
    rep: string[];
    descr: JSX.Element;
    descrDark?: JSX.Element;
}

const transformHotkeyDescrRump = (
    s1: string,
    s2: string,
    units: string,
    addExplanation: boolean,
    darkMode: boolean
): JSX.Element => (
    <>
        {s1} selection {s2} by 10
        <span className='text-xs align-top'>
            <i>n</i>
        </span>{' '}
        {units}, where <i>n</i>&thinsp; ranges from -1 to 2 (default: {DEFAULT_TRANSLATION_LOG_INCREMENT}
        ).&nbsp;
        {addExplanation ? (
            <>
                The value of <i>n</i>&thinsp; can be set by using the keys &thinsp;
                {darkMode ? (
                    <>
                        <span className='font-mono'>{1}</span>&ndash;<span className='font-mono'>{4}</span>
                    </>
                ) : (
                    <>
                        <kbd>1</kbd>&thinsp;&ndash;&thinsp;<kbd>4</kbd>&thinsp;
                    </>
                )}
                .
            </>
        ) : null}
    </>
);

const scaleDownHotkeyDescr = (darkMode: boolean): JSX.Element => (
    <>
        Decrease {transformHotkeyDescrRump('the scaling of the', '', 'percentage points', false, darkMode)}{' '}
        The value of 100% corresponds to the size of the selection&mdash;as measured by the distances between
        selected nodes&mdash;at the time it was initiated. Scaling is affected by the relevant options listed
        in the &lsquo;Transform&rsquo; tab.
    </>
);

const scaleUpHotkeyDescr = (darkMode: boolean): JSX.Element => (
    <>Increase {transformHotkeyDescrRump('the scaling of the', '', 'percentage points', true, darkMode)}</>
);

export const hotkeys: HotkeyInfo[] = [
    { key: 'add nodes', keys: 'n', rep: ['N'], descr: <>Add entity nodes at selected locations.</> },
    { key: 'add contours', keys: 'm', rep: ['M'], descr: <>Add contours at selected locations.</> },
    {
        key: 'abstract',
        keys: 'x',
        rep: ['X'],
        descr: (
            <>
                Create <i>abstractions</i> of selected nodes: &lsquo;ghost nodes&rsquo; that will transfer
                their own features onto any nodes they&rsquo;re dragged onto.
            </>
        ),
    },
    {
        key: 'copy',
        keys: 'c',
        rep: ['C'],
        descr: (
            <>
                Create copies of selected items. (This works not just with nodes, but also with labels.) Add
                new members to an existing group by copying individual members.
            </>
        ),
    },
    { key: 'add labels', keys: 'l', rep: ['L'], descr: <>Attach a label to each selected node.</> },
    {
        key: 'create',
        keys: 'space',
        rep: ['Space'],
        descr: (
            <>
                Create one or more &lsquo;dependent items&rsquo;, such as labels or arrows, attached to the
                currently selected nodes. (Equivalent to clicking the {pasi('Create')} button.)
            </>
        ),
    },
    { key: 'undo', keys: 'z', rep: ['Z'], descr: <>Undo.</> },
    { key: 'redo', keys: 'y', rep: ['Y'], descr: <>Redo.</> },
    { key: 'move up', keys: 'w, up', rep: ['W', '↑'], descr: <>Move selection upwards.</> },
    { key: 'move left', keys: 'a, left', rep: ['A', '←'], descr: <>Move selection to the left.</> },
    { key: 'move down', keys: 's, down', rep: ['S', '↓'], descr: <>Move selection downwards.</> },
    { key: 'move right', keys: 'd, right', rep: ['D', '→'], descr: <>Move selection to the right.</> },
    {
        key: 'set increment to 0.1px',
        keys: '1',
        rep: ['1'],
        descr: <>Set movement distance to 0.1 pixels.</>,
    },
    { key: 'set increment to 1px', keys: '2', rep: ['2'], descr: <>Set movement distance to 1 pixel.</> },
    { key: 'set increment to 10px', keys: '3', rep: ['3'], descr: <>Set movement distance to 10 pixels.</> },
    {
        key: 'set increment to 100px',
        keys: '4',
        rep: ['4'],
        descr: <>Set movement distance to 100 pixels.</>,
    },
    { key: 'dec sh', keys: '5', rep: ['5'], descr: <>Decrease shading by 0.1.</> },
    { key: 'inc sh', keys: '6', rep: ['6'], descr: <>Increase shading by 0.1 (maximum: 1).</> },
    { key: 'sh 0', keys: '7', rep: ['7'], descr: <>Set shading to 0.</> },
    { key: 'sh 1', keys: 'shift+7', rep: ['Shift+7'], descr: <>Set shading to 1.</> },
    { key: 'dec lw', keys: '8', rep: ['8'], descr: <>Decrease linewidth by 0.1 pixels.</> },
    {
        key: 'inc lw',
        keys: '9',
        rep: ['9'],
        descr: <>Increase linewidth by 0.1 pixels (maximum: {MAX_LINEWIDTH} pixels).</>,
    },
    { key: 'lw 0', keys: '0', rep: ['0'], descr: <>Set linewidth to 0.</> },
    { key: 'lw 1', keys: 'shift+0', rep: ['Shift+0'], descr: <>Set linewidth to 1 pixel.</> },
    { key: 'hflip', keys: 'f', rep: ['F'], descr: <>Flip selection horizontally.</> },
    { key: 'vflip', keys: 'v', rep: ['V'], descr: <>Flip selection vertically.</> },
    { key: 'polygons', keys: 'p', rep: ['P'], descr: <>Turn selected contours into regular polygons.</> },
    {
        key: 'rotate by 45° counter-clockwise',
        keys: 'q',
        rep: ['Q'],
        descr: <>Rotate selection counter-clockwise by 45 degrees.</>,
    },
    {
        key: 'rotate counter-clockwise',
        keys: 'shift+q',
        rep: ['Shift+Q'],
        descr: <>{transformHotkeyDescrRump('Rotate', 'counter-clockwise', 'degrees', true, false)}</>,
        descrDark: <>{transformHotkeyDescrRump('Rotate', 'counter-clockwise', 'degrees', true, true)}</>,
    },
    {
        key: 'rotate by 45° clockwise',
        keys: 'e',
        rep: ['E'],
        descr: <>Rotate selection clockwise by 45 degrees.</>,
    },
    {
        key: 'rotate clockwise',
        keys: 'shift+e',
        rep: ['Shift+E'],
        descr: <>{transformHotkeyDescrRump('Rotate', 'clockwise', 'degrees', true, false)}</>,
        descrDark: <>{transformHotkeyDescrRump('Rotate', 'clockwise', 'degrees', true, true)}</>,
    },
    {
        key: 'rotate by 180/n deg',
        keys: 'r',
        rep: ['R'],
        descr: (
            <>
                Rotate selected contours clockwise by 180 / <i>n</i> degrees, where <i>n</i>&thinsp; is the
                number of nodes in the respective contour. (E.g., a contour with six nodes is rotated by 30
                degrees.)
            </>
        ),
    },
    {
        key: 'scale down',
        keys: 'u',
        rep: ['U'],
        descr: scaleDownHotkeyDescr(false),
        descrDark: scaleDownHotkeyDescr(true),
    },
    {
        key: 'scale up',
        keys: 'i',
        rep: ['I'],
        descr: scaleUpHotkeyDescr(false),
        descrDark: scaleUpHotkeyDescr(true),
    },
    {
        key: 'round',
        keys: 't',
        rep: ['T'],
        descr: <>Round the location of each selected node to the nearest pixel.</>,
    },
    {
        key: 'create group',
        keys: 'g',
        rep: ['G'],
        descr: (
            <>
                Create a group that contains, for each selected item, either the item itself or the highest
                group among those with which the item is connected by a chain of active membership and that
                are such that all their &lsquo;leaf members&rsquo; are among the selected items. (Maximum
                group level: {MAX_GROUP_LEVEL}.)
            </>
        ),
    },
    {
        key: 'leave',
        keys: 'h',
        rep: ['H'],
        descr: (
            <>
                Deactivate the membership of each selected item or its second-highest &lsquo;active&rsquo;
                group (where applicable) in its currently highest active group.
            </>
        ),
    },
    {
        key: 'rejoin',
        keys: 'j',
        rep: ['J'],
        descr: (
            <>
                Reactivate the membership of each selected item or (where applicable) its highest active group
                in the next-lowest group.
            </>
        ),
    },
    {
        key: 'restore',
        keys: 'k',
        rep: ['K'],
        descr: (
            <>Reactivate the membership of each member of each selected item&rsquo;s highest active group.</>
        ),
    },
    {
        key: 'adding',
        keys: 'comma',
        rep: [','],
        descr: (
            <>
                Turn on &lsquo;adding&rsquo;. In this mode, selecting an item will add it (or its highest
                active group, where applicable) to the highest active group of the currently focused item.
                (This mode can be turned off by clicking on the canvas or by turning on
                &lsquo;dissolve-adding&rsquo;.)
            </>
        ),
    },
    {
        key: 'dissolve-adding',
        keys: '.',
        rep: ['.'],
        descr: (
            <>
                Turn on &lsquo;dissolve-adding&rsquo;. In this mode, selecting a item will add <em>all</em>{' '}
                members of its highest active group (or the item itself, if there is no such group) to the
                highest active group of the currently focused item.
            </>
        ),
    },
    {
        key: 'delete',
        keys: 'delete, backspace',
        rep: ['Delete', 'Backspace'],
        descr: <>Delete all selected items.</>,
    },
    {
        key: 'clear points',
        keys: 'shift+space',
        rep: ['Shift+Space'],
        descr: <>Deselect any currently selected locations on the canvas.</>,
    },
    {
        key: 'generate code',
        keys: 'shift+enter',
        rep: ['Shift+Enter'],
        descr: (
            <>
                Generate the <i>TeXdraw</i>&thinsp; code for the current diagram and display it in the text
                area below the canvas.
            </>
        ),
    },
    {
        key: 'load diagram',
        keys: 'mod+enter',
        rep: ['Ctrl+Enter'],
        descr: (
            <>
                (Re)load diagram from the <i>TeXdraw</i> code shown in the text area below the canvas.
            </>
        ),
    },
];

export const hotkeyMap: Record<string, string> = hotkeys.reduce(
    (acc, info) => {
        acc[info.key] = info.keys;
        return acc;
    },
    {} as Record<string, string>
);

const hotkeyRepMap: Record<string, string[]> = hotkeys.reduce(
    (acc, info) => {
        acc[info.key] = info.rep;
        return acc;
    },
    {} as Record<string, string[]>
);

interface HotkeyCompProps {
    mapKey: string;
}

export const HotkeyComp = ({ mapKey }: HotkeyCompProps) => {
    let result: React.ReactNode | null = null;
    if (mapKey in hotkeyRepMap) {
        const keyReps = hotkeyRepMap[mapKey];
        const n = keyReps.length;
        if (n > 0) {
            result = (
                <>
                    <br />
                    {n > 1 ? 'Hotkeys' : 'Hotkey'}
                    :&nbsp;
                    {keyReps.map((s, i) => (
                        <React.Fragment key={i}>
                            <kbd>{s}</kbd>
                            {i < n - 1 && <>,&nbsp;</>}
                        </React.Fragment>
                    ))}
                </>
            );
        }
    }
    return result;
};
