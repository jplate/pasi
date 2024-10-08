import React, { useState, useRef, useEffect, useMemo, useCallback, createContext } from 'react'
import Modal from 'react-modal'
import { useHotkeys } from 'react-hotkeys-hook'
import { Tab, TabGroup, TabList, TabPanel, TabPanels, Menu, MenuButton, MenuItem } from '@headlessui/react'
import NextImage, { StaticImageData } from 'next/image'
import clsx from 'clsx/lite'

import Item from './items/Item.tsx'
import Node, { MAX_LINEWIDTH, MAX_DASH_VALUE, MAX_NUMBER_OF_ORNAMENTS, DEFAULT_HSL_LIGHT_MODE, DEFAULT_HSL_DARK_MODE } from './items/Node.tsx'
import { BasicButton, BasicColoredButton, CopyToClipboardButton } from './Button.tsx'
import { CheckBoxField, MenuItemList, ChevronSVG, menuButtonClassName, menuItemButtonClassName, validFloat } from './EditorComponents.tsx'
import CanvasEditor from './CanvasEditor.tsx'
import ItemEditor from './ItemEditor.tsx'
import TransformTab, { MIN_ROTATION_LOG_INCREMENT } from './TransformTab.tsx'
import GroupTab from './GroupTab.tsx'
import ENode, { ENodeComp, MAX_RADIUS } from './items/ENode.tsx'
import Point, { PointComp } from './Point.tsx'
import Group, { GroupMember, StandardGroup, getGroups, getLeafMembers, depth, MAX_GROUP_LEVEL } from './Group.tsx'
import CNode, { DEFAULT_DISTANCE  } from './items/CNode.tsx'
import CNodeGroup, { MAX_CNODEGROUP_SIZE, CNodeGroupComp } from './CNodeGroup.tsx'
import { round, rotatePoint, scalePoint, getCyclicValue } from '../../util/MathTools'
import copy from './Copying'
import { getCode, load } from '../../codec/Codec1.tsx'
import { useThrottle } from '../../util/Misc'
import Ornament from './items/Ornament.tsx'
import Label from './items/Label.tsx'

import lblSrc from '../../../icons/lbl.png'
import adjSrc from '../../../icons/adj.png'
import cntSrc from '../../../icons/cnt.png'
import entSrc from '../../../icons/ent.png'
import exsSrc from '../../../icons/exs.png'
import idtSrc from '../../../icons/idt.png'
import incSrc from '../../../icons/inc.png'
import insSrc from '../../../icons/ins.png'
import negSrc from '../../../icons/neg.png'
import orpSrc from '../../../icons/orp.png'
import prdSrc from '../../../icons/prd.png'
import ptrSrc from '../../../icons/ptr.png'
import rstSrc from '../../../icons/rst.png'
import trnSrc from '../../../icons/trn.png'
import unvSrc from '../../../icons/unv.png'

export const H = 650; // the height of the canvas; needed to convert screen coordinates to Tex coordinates
const CANVAS_WIDTH_BASE = 850; // the 'standard' width of the canvas
const CANVAS_WIDTH_LARGE = 1000; // the width of the canvas for larger screens
export const MAX_X = 32*CANVAS_WIDTH_BASE-1 // the highest possible X coordinate for an Item
export const MIN_X = 0 // the lowest possible X coordinate for an Item
export const MIN_Y = -16*H+1 // the lowest possible Y coordinate for an Item 
export const MAX_Y = 16*H-1 // the highest possible Y coordinate for an Item 
export const MARGIN = 0; // the width of the 'margin' at right and bottom edges of the canvas

const MAX_LIST_SIZE = 1000 // maximal size of the list of ENodes and CNodeGroups

export const MARK_COLOR0_LIGHT_MODE = '#8877bb'
export const MARK_COLOR0_DARK_MODE = '#462d0c'
export const MARK_COLOR1_LIGHT_MODE = '#b0251a'
export const MARK_COLOR1_DARK_MODE = '#5b0b00'
export const MARK_LINEWIDTH = 1.0
export const LASSO_COLOR_LIGHT_MODE = 'rgba(136, 119, 187, 200)'
export const LASSO_COLOR_DARK_MODE = 'rgba(100, 50, 0, 200)'
export const LASSO_DASH = '2'

export const DEFAULT_HGAP = 10
export const DEFAULT_VGAP = 10
export const MIN_GAP = 1
export const MAX_GAP = 200
export const DEFAULT_HSHIFT = 0
export const DEFAULT_VSHIFT = 0
export const MIN_SHIFT = 0
export const MAX_SHIFT = 200
export const DEFAULT_HDISPLACEMENT = 50
export const DEFAULT_VDISPLACEMENT = 0
export const MIN_DISPLACEMENT = -9999
export const MAX_DISPLACEMENT = 9999
export const MIN_TRANSLATION_LOG_INCREMENT = -3
export const MAX_TRANSLATION_LOG_INCREMENT = 2
const DEFAULT_TRANSLATION_LOG_INCREMENT = 0
const DEFAULT_ROTATION_LOG_INCREMENT = 1
const DEFAULT_SCALING_LOG_INCREMENT = 1
const MIN_UNITSCALE = 0.1
const MAX_UNITSCALE = 99
const DEFAULT_UNITSCALE = 0.75
const MIN_DISPLAY_FONT_FACTOR = 0.1
const MAX_DISPLAY_FONT_FACTOR = 100
const DEFAULT_DISPLAY_FONT_FACTOR = 0.8
export const ROUNDING_DIGITS = 3 // used for rounding values resulting from rotations of points, etc.

export const MAX_SCALING = 1E6
export const MIN_ROTATION = -180

const CONTOUR_CENTER_SNAP_RADIUS = 10 // radius around contour centers where snapping ignores grid points
const CONTOUR_NODE_SNAP_RADIUS = 15 // radius around contour nodes where snapping ignores grid points

const CANVAS_CLICK_THRESHOLD = 4 // For determining when a mouseUp is a mouseClick
const SCROLL_X_OFFSET = 20 // How close to the left edge of the viewport the limit point may be before we resize the canvas
const SCROLL_Y_OFFSET = 20 // How close to the top edge of the viewport the limit point may be before we resize the canvas
const CANVAS_HSL_LIGHT_MODE = {hue: 0, sat: 0, lgt: 100} // to be passed to ENodes
const CANVAS_HSL_DARK_MODE = {hue: 29.2, sat: 78.6, lgt: 47.65} 
const BLACK = {hue: 0, sat: 0, lgt: 0}
const LASSO_DESELECT_LIGHT_MODE = 'rgba(255, 255, 255, 0.5)'
const LASSO_DESELECT_DARK_MODE = 'rgba(0, 0, 0, 0.1)'

interface HotkeyInfo {
    key: string
    keys: string
    rep: string[]
    descr: JSX.Element
    descrDark?: JSX.Element
}

const transformHotkeyDescrRump = (s1: string, s2: string, units: string, addExplanation: boolean, darkMode: boolean): JSX.Element => (
    <>
        {s1} selection {s2} by 10<span className='text-xs align-top'><i>n</i></span> {units}, where <i>n</i>&thinsp; ranges from -1 to 2 {' '}
        (default: {DEFAULT_TRANSLATION_LOG_INCREMENT}).&nbsp; 
        {addExplanation? <>The value of <i>n</i>&thinsp; can be set by using the keys &thinsp;
            {darkMode? 
                <><span className='font-mono'>{1}</span>&ndash;<span className='font-mono'>{4}</span></>: 
                <><kbd>1</kbd>&thinsp;&ndash;&thinsp;<kbd>4</kbd>&thinsp;</>
            }.</>:
            null
        }
    </>
);

const scaleDownHotkeyDescr = (darkMode: boolean): JSX.Element => (
    <>Decrease {transformHotkeyDescrRump('the scaling of the', '', 'percentage points', false, darkMode)} {' '}
    The value of 100% corresponds to the size of the selection&mdash;as measured by the distances between selected nodes&mdash;at the time it was initiated. {' '}
    Scaling is affected by the relevant options listed in the &lsquo;Transform&rsquo; tab.</>
);

const scaleUpHotkeyDescr = (darkMode: boolean): JSX.Element => (
    <>Increase {transformHotkeyDescrRump('the scaling of the', '', 'percentage points', true, darkMode)}</>
);

export const hotkeys: HotkeyInfo[] = [
    { key: 'add nodes', keys: 'n', rep: ['N'], descr: <>Add entity nodes at selected locations.</> },
    { key: 'add contours', keys: 'm', rep: ['M'], descr: <>Add contours at selected locations.</> },
    { key: 'add labels', keys: 'l', rep: ['L'], descr: <>Add a label to each selected node.</> },
    { key: 'copy', keys: 'c', rep: ['C'], descr: <>Copy selection. (Tip: by copying individual members of a group, new members can be added to that group.)</> },
    { key: 'move up', keys: 'w, up', rep: ['W', '↑'], descr: <>Move selection upwards.</> },
    { key: 'move left', keys: 'a, left', rep: ['A', '←'], descr: <>Move selection to the left.</> },
    { key: 'move down', keys: 's, down', rep: ['S', '↓'], descr: <>Move selection downwards.</> },
    { key: 'move right', keys: 'd, right', rep: ['D', '→'], descr: <>Move selection to the right.</> },
    { key: 'set increment to 0.1px', keys: '1', rep: ['1'], descr: <>Set movement distance to 0.1 pixels.</> },
    { key: 'set increment to 1px', keys: '2', rep: ['2'], descr: <>Set movement distance to 1 pixel.</> },
    { key: 'set increment to 10px', keys: '3', rep: ['3'], descr: <>Set movement distance to 10 pixels.</> },
    { key: 'set increment to 100px', keys: '4', rep: ['4'], descr: <>Set movement distance to 100 pixels.</> },
    { key: 'dec sh', keys: '5', rep: ['5'], descr: <>Decrease shading by 0.1.</> },
    { key: 'inc sh', keys: '6', rep: ['6'], descr: <>Increase shading by 0.1 (maximum: 1).</> },
    { key: 'sh 0', keys: '7', rep: ['7'], descr: <>Set shading to 0.</> },
    { key: 'sh 1', keys: 'shift+7', rep: ['Shift+7'], descr: <>Set shading to 1.</> },
    { key: 'dec lw', keys: '8', rep: ['8'], descr: <>Decrease linewidth by 0.1 pixels.</> },
    { key: 'inc lw', keys: '9', rep: ['9'], descr: <>Increase linewidth by 0.1 pixels (maximum: {MAX_LINEWIDTH} pixels).</> },
    { key: 'lw 0', keys: '0', rep: ['0'], descr: <>Set linewidth to 0.</> },
    { key: 'lw 1', keys: 'shift+0', rep: ['Shift+0'], descr: <>Set linewidth to 1 pixel.</> },
    { key: 'hflip', keys: 'f', rep: ['F'], descr: <>Flip selection horizontally.</> },
    { key: 'vflip', keys: 'v', rep: ['V'], descr: <>Flip selection vertically.</> },
    { key: 'polygons', keys: 'p', rep: ['P'], descr: <>Turn selected contours into regular polygons.</> },
    { key: 'rotate by 45° counter-clockwise', keys: 'q', rep: ['Q'], descr: <>Rotate selection counter-clockwise by 45 degrees.</> },
    { key: 'rotate counter-clockwise', keys: 'shift+q', rep: ['Shift+Q'], 
        descr: <>{transformHotkeyDescrRump('Rotate', 'counter-clockwise', 'degrees', true, false)}</>,
        descrDark: <>{transformHotkeyDescrRump('Rotate', 'counter-clockwise', 'degrees', true, true)}</> },
    { key: 'rotate by 45° clockwise', keys: 'e', rep: ['E'], descr: <>Rotate selection clockwise by 45 degrees.</> },
    { key: 'rotate clockwise', keys: 'shift+e', rep: ['Shift+E'], 
        descr: <>{transformHotkeyDescrRump('Rotate', 'clockwise', 'degrees', true, false)}</>,
        descrDark: <>{transformHotkeyDescrRump('Rotate', 'clockwise', 'degrees', true, true)}</> },
    { key: 'rotate by 180/n deg', keys: 'r', rep: ['R'], descr: <>Rotate selected contours clockwise by 180 / <i>n</i> degrees, where{' '}
        <i>n</i>&thinsp; is the number of nodes in the respective contour. (E.g., a contour with six nodes is rotated by 30 degrees.)</> },
    { key: 'scale down', keys: 'u', rep: ['U'], descr: scaleDownHotkeyDescr(false), descrDark: scaleDownHotkeyDescr(true) },
    { key: 'scale up', keys: 'i', rep: ['I'], descr: scaleUpHotkeyDescr(false), descrDark: scaleUpHotkeyDescr(true) },
    { key: 'round', keys: 't', rep: ['T'], descr: <>Round the location of each selected node to the nearest pixel.</> },
    { key: 'create group', keys: 'g', rep: ['G'], descr: <>Create a group that contains, for each selected item, either the item itself or {' '}
        the highest group among those with which the item is connected by a chain of active membership and that are such that all their &lsquo;leaf {' '}
        members&rsquo; are among the selected items. (Maximum group level: {MAX_GROUP_LEVEL}.)</> },
    { key: 'leave', keys: 'h', rep: ['H'], descr: <>Deactivate the membership of each selected item or its second-highest &lsquo;active&rsquo; group {' '}
        (where applicable) in its currently highest active group.</> },
    { key: 'rejoin', keys: 'j', rep: ['J'], descr: <>Reactivate the membership of each selected item or (where applicable) its highest active group {' '}
         in the next-lowest group.</> },
    { key: 'restore', keys: 'k', rep: ['K'], descr: <>Reactivate the membership of each member of each selected item&rsquo;s highest active group.</> },
    { key: 'adding', keys: 'comma', rep: [','], descr: <>Turn on &lsquo;adding&rsquo;. In this mode, selecting an item will add it (or its highest active group, where applicable){' '}
        to the highest active group of the currently focused item. (This mode can be turned off by clicking on the canvas or by turning on &lsquo;dissolve-adding&rsquo;.)</> },
    { key: 'dissolve-adding', keys: '.', rep: ['.'], descr: <>Turn on &lsquo;dissolve-adding&rsquo;. In this mode, selecting a item will add <em>all</em>{' '}
        members of its highest active group (or the item itself, if there is no such group) to the highest active group of the currently focused item.</> },
    { key: 'delete', keys: 'delete, backspace', rep: ['Delete', 'Backspace'], descr: <>Delete all selected items.</> },
    { key: 'clear points', keys: 'space', rep: ['Space'], descr: <>Deselect any currently selected locations on the canvas.</> },
    { key: 'generate code', keys: 'enter', rep: ['Enter'], descr: <>Generate the <i>texdraw</i>&thinsp; code for the current diagram and display {' '}
        it in the text area below the canvas.</> },
    { key: 'load diagram', keys: 'mod+enter', rep: ['Ctrl+Enter'], descr: <>(Re)load diagram from the <i>texdraw</i> code shown in the text area below the canvas.</> }
  ];

const hotkeyMap: Record<string, string> = hotkeys.reduce((acc, info) => {
    acc[info.key] = info.keys;
    return acc;
}, {} as Record<string, string>);

const hotkeyRepMap: Record<string, string[]> = hotkeys.reduce((acc, info) => {
    acc[info.key] = info.rep;
    return acc;
}, {} as Record<string, string[]>);

interface HotkeyCompProps {
    mapKey: string
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
                    {n>1? 'Hotkeys': 'Hotkey'}
                    :&nbsp;
                    {keyReps.map((s, i) => 
                        <React.Fragment key={i}>
                            <kbd>{s}</kbd>
                            {i < n - 1 && <>,&nbsp;</>}
                        </React.Fragment>
                    )}
                </>
            );
        }
    }
    return result;
}


export const DarkModeContext = createContext(false);

export type Grid = {
    hGap: number,
    vGap: number,
    hShift: number,
    vShift: number,
    snapToContourCenters: boolean,
    snapToNodes: boolean
}

const createGrid = (hGap: number = DEFAULT_HGAP, 
        vGap: number = DEFAULT_VGAP, 
        hShift: number = DEFAULT_HSHIFT, 
        vShift: number = DEFAULT_VSHIFT, 
        snapToContourCenters: boolean = true, 
        snapToNodes: boolean = true): Grid => {
    return {hGap, vGap, hShift, vShift, snapToContourCenters, snapToNodes};
};

const nearestGridPoint = (x: number, y: number, grid: Grid) => {
    return [x + grid.hGap/2 - ((x + grid.hGap/2 - grid.hShift) % grid.hGap), 
            y + grid.vGap/2 - ((y + grid.vGap/2 - grid.vShift) % grid.vGap)]
}

/**
 * Returns the point to 'snap' to from the supplied coordinates, given the supplied grid, list, and selection. Since this is called from within a mouseMove handler while
 * dragging, members of the selection (which is being dragged) have to be ignored. Same for the center and members of any CNodeGroup containing the focusItem.
 */
const getSnapPoint = (x: number, y: number, grid: Grid, 
        list: (Node | CNodeGroup)[], 
        focus: Item, 
        selectedNodes: Node[],
        dccDx: number | undefined, // The X-coordinate of the center of the contour group (if any) that contains the focusItem
        dccDy: number | undefined // The Y-coordinate of the center of the contour group (if any) that contains the focusItem
) => {
    let [rx, ry] = nearestGridPoint(x, y, grid),
        d = Math.sqrt(Math.pow(x-rx, 2) + Math.pow(y-ry, 2)),
        snappingToGrid = true;
    if (grid.snapToContourCenters || grid.snapToNodes) {
        for (const it of list) {
            if (it instanceof CNodeGroup && (!(focus instanceof CNode) || !focus.fixedAngles || !it.members.includes(focus))) {
                const overlap = it.members.filter(m => selectedNodes.includes(m));
                if (grid.snapToContourCenters && overlap.length==0) {
                    const c = it.getNodalCenter();
                    const dc = Math.sqrt(Math.pow(x-c.x, 2) + Math.pow(y-c.y, 2));
                    if (dc<d || (snappingToGrid && dc<CONTOUR_CENTER_SNAP_RADIUS)) {
                        snappingToGrid = false;
                        rx = c.x;
                        ry = c.y;
                        d = dc;
                    }
                    if (dccDx!==undefined && dccDy!==undefined) { // If we're dragging a contour, its center should snap to the centers of other contours.
                        const dx = x + dccDx - c.x;
                        const dy = y + dccDy - c.y;
                        const ddc = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
                        if (ddc<d || (snappingToGrid && ddc<CONTOUR_CENTER_SNAP_RADIUS)) {
                            snappingToGrid = false;
                            rx = x - dx;
                            ry = y - dy;
                            d = ddc;
                        }
                    }
                }
                if (grid.snapToNodes) {
                    for (const node of it.members) {
                        const dn = Math.sqrt(Math.pow(x-node.x, 2) + Math.pow(y-node.y, 2));
                        if (!overlap.includes(node) && (dn<d || (snappingToGrid && dn<CONTOUR_NODE_SNAP_RADIUS))) {
                            snappingToGrid = false;
                            rx = node.x;
                            ry = node.y;
                            d = dn;
                        }
                    }
                }
            }
        }
    }
    return [rx, ry]
}

class Lasso {
    constructor(public x0: number, public y0: number, public x1: number, public y1: number, public deselect: boolean) {
    }
    contains(item: Item, yOffset: number): boolean {
        const { bottom, left } = item.getBottomLeftCorner();
        return left >= this.x0 && 
            left + item.getWidth() <= this.x1 && 
            H + yOffset - bottom <= this.y1 && 
            H + yOffset - (bottom + item.getHeight()) >= this.y0;  
    }
}

class DepItemInfo {       
    constructor(
        public label: string, 
        public key: DepItemKey, 
        public src: StaticImageData, 
        public alt: string, 
        public min: number // minimum number of selected nodes required for creating Item
    ) {}    

    getImageComp(dark: boolean): React.ReactNode {
        return <NextImage src={this.src} alt={this.alt} width={28} 
            className={clsx('inline object-contain', (dark? 'filter invert sepia': ''))} />;    
    }
}

type DepItemKey = 'trn' | 'neg' | 'ptr' | 'exs' | 'ins' | 'ent' | 'adj' | 'lbl' | 'inc' | 'cnt' | 'idt' | 'unv' | 'rst' | 'prd' | 'orp';

const depItemInfos = [
    new DepItemInfo('Broad tip', 'trn', trnSrc, 'An arrow that has as its tip a closed, reflectionally symmetric figure', 2),
    new DepItemInfo('Broken line', 'neg', negSrc, 'A line that is broken in the middle', 2),
    new DepItemInfo('Chevron', 'ptr', ptrSrc, 'A chevron-shaped ornament attached to a node', 1),
    new DepItemInfo('Dot', 'exs', exsSrc, 'A square-shaped ornament attached to a node', 1),
    new DepItemInfo('Double hook, circular', 'ins', insSrc, 'An arrow with two curved hooks, each being a segment of a circle', 2),
    new DepItemInfo('Double hook, curved', 'ent', entSrc, 'An arrow with two curved hooks (cubic)', 2),
    new DepItemInfo('Double hook, straight', 'adj', adjSrc, 'An arrow with two straight hooks', 2),
    new DepItemInfo('Harpoon', 'inc', incSrc, 'An arrow with an asymmetric, harpoonlike tip', 2),
    new DepItemInfo('Label', 'lbl', lblSrc, 'A label attached to a node', 1),
    new DepItemInfo('Round tip', 'cnt', cntSrc, 'A round-tipped arrow', 2),
    new DepItemInfo('Simple line', 'idt', idtSrc, 'A simple line', 2),
    new DepItemInfo('Single hook, circular', 'unv', unvSrc, 'An arrow with a single hook that is a segment of a circle', 2),
    new DepItemInfo('Single hook, composite', 'rst', rstSrc, 'An arrow with a single hook that is made up of a cubic curve followed by a straight line', 2),
    new DepItemInfo('Single hook, curved', 'prd', prdSrc, 'An arrow with a single curved hook (cubic)', 2),
    new DepItemInfo('Single hook, straight', 'orp', orpSrc, 'An arrow with a single straight hook', 2),
];

const depItemKeys = depItemInfos.map(dl => dl.key);


const highestActive = (item: Item): Item | Group<any> => {
    const groups = getGroups(item)
    return groups[1]>-1? groups[0][groups[1]]: item
}

/**
 * Used for computing the X coordinate of the limit component.
 */
const limitCompX = (limitX: number, canvas: HTMLDivElement | null, canvasWidth: number) => {
    if (canvas) {
        const { scrollLeft } = canvas;
        const x = Math.min(Math.ceil(limitX / canvasWidth) * canvasWidth, MAX_X);
        return x <= canvasWidth || x<scrollLeft+SCROLL_X_OFFSET? x: Math.max(x, scrollLeft + canvasWidth) + 
            (limitX > canvasWidth? MARGIN: -40)  // The extra term is to provide a bit of margin and to avoid an unnecessary scroll bar.
    } 
    else {
        return 0;
    }
}

/**
 * Used for computing the Y coordinate of the limit component.
 */
const limitCompY = (limitY: number, canvas: HTMLDivElement | null) => {
    if (canvas) {
        const { scrollTop } = canvas;
        const y = Math.max(Math.floor(limitY/H)*H, MIN_Y);
        return y>=0 || y>H-scrollTop-SCROLL_Y_OFFSET? y: Math.min(y, -scrollTop) + 
            (limitY<0? -MARGIN: 40) // The extra term is to provide a bit of margin and to avoid an unnecessary scroll bar.
    } 
    else {
        return 0;
    }
}

/** 
 * Returns an array of the highest-level Groups (or Items) that would need to be copied, based on the supplied selection.
 */
const getTopToBeCopied = (selection: Item[]) => {
    const result: (Item | Group<any>)[] = [];
    const ntbcContaining = new Set<Group<any>>(); // already-visited groups containing not-to-be copied items
    const nonNtbcContaining = new Set<Group<any>>(); // already-visited groups that do NOT contain any not-to-be-copied items
    selection.forEach(item => {
        const [groups, actIndex] = getGroups(item);
        let j = -1, // The index of that group, if some such group exists; -1 otherwise.
            visited = false;
        for (let i = 0; i<=actIndex; i++) { // We are looking for the lowest active group that has both item and a not-to-be-copied node among its leaf members.
            if (ntbcContaining.has(groups[i]) || nonNtbcContaining.has(groups[i])) {
                visited = true;
                break;
            }
            const lm = getLeafMembers(groups[i]) as Set<Item>;
            let containsNtbc = false;
            for (const m of lm) {
                if (!selection.includes(m)) {
                    containsNtbc = true;
                    break;
                }
            }
            if (containsNtbc) {
                j = i;
                ntbcContaining.add(groups[i]);
                break;
            }
            nonNtbcContaining.add(groups[i]);
        }
        if (j<0 && !visited && actIndex>=0) { 
            // item has an active group, and no active group in its hierarchy contains not-to-be-copied items.
            result.push(groups[actIndex]);
        }
        else if (actIndex<0 || (j<1 && ntbcContaining.has(groups[0]))) {
            // Either item has no active group, or the group of which it is a direct member also contains a not-to-be-copied node.
            result.push(item); 
        }
        else if (!visited && j>0) {
            // groups[j-1] is one level below the lowest active group in item's hierarchy that contains not-to-be-copied items.
            result.push(groups[j-1]);
        }
    });
    return result;
}

/**
 * Returns an array of all ENodes in the specified list, as well as any CNodes in any CNodeGroups in that same list, and, if the supplied boolean is false,
 * also all Ornaments attached to any such nodes, that meet the specified test condition (or *any* condition if none is specified).
 */
export const getItems = (
    list: (ENode | CNodeGroup)[], 
    onlyNodes: boolean = false, 
    test: (it: Item) => boolean = it => true
): Item[] => 
list.flatMap((it: ENode | CNodeGroup) => {
    let result: Item[];
    if (it instanceof ENode) { 
        const orn = onlyNodes? []: it.ornaments.filter(test);         
        result = test(it)? [it, ...orn]: orn;
    }
    else {
        result = it.members.flatMap(cn => {
            const orn = onlyNodes? []: cn.ornaments.filter(test);
            return test(cn)? [cn, ...orn]: orn;
        });
    }
    return result;
});


/**
 * Returns an array of CNodeGroups that are contained (directly or indirectly) in the supplied array of Nodes and Groups.
 */
const getCNodeGroups = (array: (Item | Group<any>)[]): CNodeGroup[] => 
array.reduce((acc: CNodeGroup[], it) => 
    it instanceof Item? acc: 
    it instanceof CNodeGroup? [...acc, it]:
    [...acc, ...getCNodeGroups(it.members)], 
[]);

/**
 * Returns a function that moves the ENodes and CNodeGroups in the array that is supplied to that function up or down in that same array.
 * To be called by implementations of Item.handleEditing().
 */
export const getRankMover = (val: string, selection: Item[]) => (item: Item, array: (ENode | CNodeGroup)[]) => {                        
    const n = array.length;
    const selectedListMembers = selection.reduce((acc: (ENode | CNodeGroup)[], it) => 
        it instanceof ENode? [...acc, it]:
        it instanceof CNode? [...acc, it.group as CNodeGroup]:
        acc, 
    []).filter((it, i, arr) => i===arr.indexOf(it));
    const currentPositions: [ENode | CNodeGroup, number][] = selectedListMembers.map(m => [m, array.indexOf(m)]);
    const currentPosMap = new Map<ENode | CNodeGroup, number>(currentPositions);
    const focusPos = item instanceof ENode? currentPosMap.get(item): item instanceof CNode? currentPosMap.get(item.group as CNodeGroup): null;
    let result = array;
    if (typeof focusPos === 'number') {
        const newPos = parseInt(val);
        let incr = 0;
        if(newPos > focusPos && currentPositions.every(([, pos]) => pos + 1 < n)) { 
            // move the item up in the Z-order (i.e., towards the end of the array), but only by one
            incr = 1;
        } 
        else if(newPos < focusPos && currentPositions.every(([, pos]) => pos > 0)) { 
            // move the item down in the Z-order, but only by one
            incr = -1;
        }
        if (incr!==0) {
            const newPosMap = new Map<number, ENode | CNodeGroup>(currentPositions.map(([it, pos]) => [pos + incr, it]));
            const unselectedListMembers = array.filter(it => !currentPosMap.has(it));
            result = new Array<ENode | CNodeGroup>(n);
            for (let i = 0, j = 0; i < n; i++) {
                if (newPosMap.has(i)) {
                    const it = newPosMap.get(i);
                    if (it) result[i] = it;
                }
                else {
                    result[i] = unselectedListMembers[j++];
                }                                    
            }
        }
    }
    return result
}

/**
 * A function to be called on groups that have just been emptied of all their members. The second argument is the list of items to be displayed
 * on the canvas. Returns a new, 'purged' list.
 */
const purge = (group: Group<any>, list: (ENode | CNodeGroup)[]): (ENode | CNodeGroup)[] => {
    let newList = list;
    if (group instanceof CNodeGroup) {
        // If group is a NodeGroup, we delete it from the list:
        newList = list.filter(it => it!==group);
    }
    if (group.group) {
        // An empty group is just useless baggage, so we also delete it from its own group:
        group.group.members = group.group.members.filter(m => m!==group);  
    }
    return newList;
}

interface DialogConfig {
    contentLabel?: string
    title?: string
    content?: React.ReactNode
    extraWide?: boolean
}


interface MainPanelProps {
    dark: boolean
    toggleTrueBlack: () => void
}

const MainPanel = ({ dark, toggleTrueBlack }: MainPanelProps) => {

    const canvasRef = useRef<HTMLDivElement>(null)
    const codeRef = useRef<HTMLTextAreaElement>(null);
    const [depItemIndex, setDepItemIndex] = useState(depItemKeys.indexOf('lbl'))
    const [unitscale, setUnitscale] = useState(DEFAULT_UNITSCALE)
    const [displayFontFactor, setDisplayFontFactor] = useState(DEFAULT_DISPLAY_FONT_FACTOR);
    const [replace, setReplace] = useState(true)
    const [points, setPoints] = useState<Point[]>([])
    const [itemsMoved, setItemsMoved] = useState([]); // used to signal to the updaters of, e.g., canCopy that the positions of items may have changed.
    const [, setItemsDragged] = useState([]); // used to force a re-render without updating any constants.
    const [list, setList] = useState<(ENode | CNodeGroup)[]>([])
    const [eNodeCounter, setENodeCounter] = useState(0) // used for generating keys
    const [cngCounter, setCNGCounter] = useState(0) // used for generating keys
    const [sgCounter, setSGCounter] = useState(0); // used for generating ids of StandardGroups, which are used in copying
    const [selection, setSelection] = useState<Item[]>([]);// list of selected items; multiple occurrences are allowed    
    const [focusItem, setFocusItem] = useState<Item | null>(null) // the item that carries the 'focus', relevant for the editor pane
    const [yOffset, setYOffset] = useState(0);
    const [limit, setLimit] = useState<Point>(new Point(0,H)) // the current bottom-right corner of the 'occupied' area of the canvas (which can be adjusted by the user moving items around)
    const [canvasWidth, setCanvasWidth] = useState(CANVAS_WIDTH_BASE);

    const [grid, setGrid] = useState(createGrid())
    const [hDisplacement, setHDisplacement] = useState(DEFAULT_HDISPLACEMENT)
    const [vDisplacement, setVDisplacement] = useState(DEFAULT_VDISPLACEMENT)

    const [lasso, setLasso] = useState<Lasso | null>(null)
    const [dragging, setDragging] = useState(false)
    const [preselection1, setPreselection1] = useState<Item[]>([]) // In the current implementation, this array only ever contains at most one item. It's meant to contain
        // those items that are 'directly' preselected, either because they're hovered over by the mouse or (at least in an earlier implementation) because they're included 
        // in the lasso; and the items that are 'secondarily preselected' are those that are preselected because they share a group-membership with those contained in the 
        // primary preselection. However, as far as items preselected with the lasso are concerned, it seems more intuitive to ignore shared group-membership.
    const [preselection2, setPreselection2] = useState<Item[]>([])
    const preselection2Ref = useRef<Item[]>([])
    preselection2Ref.current = preselection2

    const [userSelectedTabIndex, setUserSelectedTabIndex] = useState(0) // canvas editor is default
    const [logIncrement, setLogIncrement] = useState(DEFAULT_TRANSLATION_LOG_INCREMENT) // for itemEditor
    const [rotation, setRotation] = useState(0)
    const [scaling, setScaling] = useState(100) // default is 100%
    const [origin, ] = useState({x: 0, y: 0}) // the point around which to rotate and from which to scale
    const [logIncrements, ] = useState({rotate: DEFAULT_ROTATION_LOG_INCREMENT, scale: DEFAULT_SCALING_LOG_INCREMENT}) // for the transform tab
    const [transformFlags, ] = useState({scaleArrowheads: false, scaleENodes: false, scaleDash: false, scaleLinewidths: false, flipArrowheads: false})
    const [trueBlack, setTrueBlack] = useState(false); // indicates whether entity nodes and contours should use black as their primary and (when shading is set to 1) 
        // background color.

    const [adding, setAdding] = useState(false)
    const [dissolveAdding, setDissolveAdding] = useState(false)

    const [code, setCode] = useState<string>(''); // the texdraw code to be displayed in the code area.

    const [modalShown, setModalShown] = useState(false)
    const [dialog, setDialog] = useState<DialogConfig>({}) 
    const okButtonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        const element = document.getElementById('content');
        if(element) Modal.setAppElement(element)
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1536) {
                setCanvasWidth(CANVAS_WIDTH_BASE);
            }
            else {
                setCanvasWidth(CANVAS_WIDTH_LARGE);
            }
        };    
        window.addEventListener('resize', handleResize);    
        handleResize();    
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const deduplicatedSelection = useMemo(() => 
        selection.filter((item, i) => i===selection.indexOf(item)), 
        [selection]
    );

    const selectedNodes = useMemo(() => 
        deduplicatedSelection.filter(item => item instanceof Node) as Node[], 
        [deduplicatedSelection]
    );

    const leftMostSelected = useMemo(() => 
        selectedNodes.reduce((min, item) => itemsMoved && (min<item.x)? min: item.x, Infinity), // added 'itemsMoved &&' to suppress a warning about 'unnecessary dependencies'
        [selectedNodes, itemsMoved]
    );

    const topMostSelected = useMemo(() => 
        selectedNodes.reduce((max, item) => itemsMoved && (max>item.y)? max: item.y, -Infinity),
        [selectedNodes, itemsMoved]
    );

    const rightMostSelected = useMemo(() => 
        selectedNodes.reduce((max, item) => itemsMoved && (max>item.x)? max: item.x, -Infinity),
        [selectedNodes, itemsMoved]
    );

    const bottomMostSelected = useMemo(() => 
        selectedNodes.reduce((min, item) => itemsMoved && (min<item.y)? min: item.y, Infinity),
        [selectedNodes, itemsMoved]
    );

    const allItems = useMemo(() => getItems(list) as Item[], [list]); // an array of all Items, including Ornaments.

    const toBeGrouped: (Item | Group<any>)[] = useMemo(() => 
        getTopToBeCopied(deduplicatedSelection),
        [deduplicatedSelection]
    ); 

    const toBeCopied = useMemo(() => deduplicatedSelection.flatMap(it => it instanceof Node? [it, ...it.ornaments]: [it])
        .filter((it, i, arr) => i===arr.indexOf(it)), 
        [deduplicatedSelection]
    );

    // The highest-level Items/Groups that would need to be copied if the user clicks on 'Copy Selection'. This includes any Ornaments attached to 
    // selected Nodes.
    const topTbc: (Item | Group<any>)[] = useMemo(() => 
        getTopToBeCopied(toBeCopied),
        [toBeCopied]
    ); 


    /**
     * Sets the origin point for transformations. This function should be called whenever we've changed the points, the selection, or the focusItem.
     * The first parameter indicates whether the transformation should be reset.
     */
    const setOrigin = useCallback((
            resetTransform: boolean, 
            pts: Point[] = points, 
            focus: Item | null = focusItem, 
            sel: Item[] = selection,
            li: (ENode | CNodeGroup)[] = list
        ) => {
            // Compute new origin:
            const selectedNodes = sel.filter(item => item instanceof Node) as Node[];
            const {x, y} = pts.length > 0? pts[pts.length-1]: (focus instanceof Node? focus: 
                ((selectedNodes.length>0)? selectedNodes[selectedNodes.length-1]: {x: 0, y: 0}))
            
            const originChanged = origin.x!==x || origin.y!==y;
            origin.x = x;
            origin.y = y;

            if(resetTransform && originChanged) {
                setRotation(0);
                setScaling(100);
                li.forEach(it => { // resetting the items for new scaling 
                    if (it instanceof CNodeGroup) {
                        it.linewidth100 = it.linewidth;
                        it.dash100 = it.dash;
                    }
                    (it instanceof CNodeGroup? it.members: [it]).forEach(node => {
                        node.x100 = node.x;
                        node.y100 = node.y;
                        if (node instanceof ENode) {
                            node.radius100 = node.radius;
                            node.linewidth100 = node.linewidth;
                            node.dash100 = node.dash;
                            node.ornaments.forEach(o => {
                                o.gap100 = o.gap;
                            });
                        }
                        else if (node instanceof CNode) {
                            node.dist0_100 = node.dist0;
                            node.dist1_100 = node.dist1;
                        }
                        node.ornaments.forEach(o => {
                            o.gap100 = o.gap;
                        });
                    });
                });
            }
        }, [points, focusItem, selection, list, origin] // origin has no setter, so is not included.
    );
    
    /**
     * This function should be called whenever items have moved or new items have been added to the canvas. It adjusts both the yOffset state
     * and updates the coordinates stored in the limit object.
     */
    const adjustLimit = useCallback((items: Item[] = allItems) => {
            let top = 0,
                right = 0,
                bottom = H;
            items.forEach(item => {
                const w = item.getWidth();
                const h = item.getHeight();
                const { bottom: iBottom, left: iLeft } = item.getBottomLeftCorner();
                const iTop = iBottom + h;
                const iRight = iLeft + w;
                if(iTop > top) {
                    top = iTop;
                }
                if(iRight > right) {
                    right = iRight;
                }
                if(iBottom < bottom) {
                    bottom = iBottom;
                }
            });
            const canvas = canvasRef.current;
            if (canvas) {
                const { scrollTop } = canvas;
                const delta1 = Math.max(0, top - H) - yOffset;
                const delta2 = Math.ceil((delta1%H===0? delta1-1: delta1) / H) * H;
                const adjust = top<H? -yOffset: (yOffset + delta2 < scrollTop - SCROLL_Y_OFFSET || delta2>0)? delta2: Math.max(-scrollTop, delta2);
                if (adjust !== 0) {
                    setYOffset(yOffset + adjust);
                    setTimeout(() => {
                        canvas.scrollBy(0, adjust);
                    }, 0);
                }
            }
            if (limit.x!==right || limit.y!==bottom) {
                setLimit(prev => new Point(right, bottom)); // set the new bottom-right limit
            }
        }, [allItems, yOffset, limit]
    );

    /**
     * Scrolls to the center point of the specified item.
     */
    const scrollTo = useCallback((item: Item) => {
        const canvas = canvasRef.current;
        if (canvas) { 
            const w = item.getWidth();
            const h = item.getHeight();
            const { bottom, left } = item.getBottomLeftCorner();
            const icx = left + w/2; // item center X
            const icy = bottom + h/2; // item center Y
            const dx = icx - canvas.scrollLeft;
            const scrollRight = Math.floor((dx % canvasWidth===0? dx-1: dx) / canvasWidth) * canvasWidth;
            const dy = canvas.scrollTop + icy - yOffset;
            const scrollDown = -Math.floor((dy % H===0? dy+1: dy) / H) * H;
            setTimeout(() => {
                canvas.scrollBy(scrollRight, scrollDown);
            }, 0);
        }
    }, [yOffset, canvasWidth]);


    const updateSecondaryPreselection = useCallback((
            prim: Item[] = preselection1
        ) => {
            const lm = new Set<GroupMember>();
            for (let item of prim) {
                const ha = highestActive(item);
                if (ha instanceof Item) {
                    lm.add(ha);
                }
                else { 
                    const halm = getLeafMembers(ha, true)
                    for (let it of halm) {
                        lm.add(it);
                    }
                }
            }
            const addition = allItems.filter(item => !prim.includes(item) && lm.has(item));
            setPreselection2(prev => [...prim, ...addition]);
        }, [preselection1, allItems]
    );


    const deselect = useCallback((item: Item) => {
        const index = selection.lastIndexOf(item);
        let newFocus = focusItem;
        setSelection(prev => {
            const newSelection = prev.filter((it, i) => i!==index);
            if(focusItem && !newSelection.includes(focusItem)) {
                newFocus = null;
                setFocusItem(null);
            }
            return newSelection;
        });
        setOrigin(true, points, newFocus, deduplicatedSelection, list);
        return item;
    }, [selection, focusItem, points, deduplicatedSelection, list, setOrigin]);


    /**
     * Mouse down handler for items on the canvas.
     */
    const itemMouseDown = useCallback((
            item: Item, 
            e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>, 
            clearPreselection: boolean = true
        ) => { 
            e.preventDefault(); // This will prevent material outside of the canvas from being highlighted every time the user drags something outside of the visible 
                // portion.
            e.stopPropagation();
            const canvas = canvasRef.current;
            if (canvas) {
                const element = document.activeElement as HTMLElement;
                element.blur();
                canvas.focus();
            }
            if(e.ctrlKey && !e.shiftKey && deduplicatedSelection.includes(item)) {
                deselect(item);
            } 
            else {
                let newPoints = points,
                    newList = list,
                    newSelection = selection;

                if (focusItem && (adding || dissolveAdding)) {
                    newPoints = [];
                    const itemToAdd = e.ctrlKey? item: highestActive(item);
                    const group = highestActive(focusItem);
                    if (!(group instanceof Item) && (group instanceof CNodeGroup || (group!==itemToAdd && !group.members.includes(itemToAdd)))) {
                        if (itemToAdd instanceof Item) {
                            newSelection=[...selection, itemToAdd];
                        }
                        else {
                            const lm = getLeafMembers(itemToAdd);
                            newSelection=[...selection, item, ...allItems.filter(it => it!==item && !selection.includes(it) && lm.has(it))];
                        }
                        if (group!==itemToAdd && !group.members.includes(itemToAdd)) {
                            if (adding || itemToAdd instanceof Item) {
                                if (group instanceof CNodeGroup && !(itemToAdd instanceof CNode)) {
                                    showModal('Invalid target', 'A contour node group can only have contour nodes as members.');
                                    return;
                                }
                                else if (group instanceof CNodeGroup && group.members.length>=MAX_CNODEGROUP_SIZE) {
                                    showModal('Hungry Caterpillar Alert', `The maximum size of a contour node group is ${MAX_CNODEGROUP_SIZE} nodes.🐛`);
                                    return;
                                }
                                else if (group instanceof StandardGroup && itemToAdd instanceof CNode) {
                                    showModal('Invalid target', 'A contour node can only be a member of a contour node group.');
                                    return;
                                }
                                else {
                                    if (focusItem instanceof CNode && group instanceof CNodeGroup) {
                                        const i = group.members.indexOf(focusItem);
                                        group.members.splice(i+1, 0, itemToAdd as CNode);
                                    }
                                    else {
                                        group.members.push(itemToAdd);
                                    }
                                    const oldGroup = itemToAdd.group;
                                    itemToAdd.group = group;
                                    itemToAdd.isActiveMember = true;
                                    if (oldGroup) {
                                        oldGroup.members = oldGroup.members.filter(m => m!==itemToAdd);
                                        if (oldGroup.members.length==0) newList = purge(oldGroup, newList);
                                    }
                                }
                            }
                            else { // dissolve adding                            
                                if (group instanceof CNodeGroup && !(itemToAdd instanceof CNodeGroup)) {
                                    showModal('Invalid target', 'A contour node group can only have contour nodes as members.');
                                    return;
                                }
                                else if (group instanceof CNodeGroup && group.members.length + itemToAdd.members.length>MAX_CNODEGROUP_SIZE) {
                                    showModal('Hungry Caterpillar Alert', `The maximum size of a contour node group is ${MAX_CNODEGROUP_SIZE} nodes.🐛`);
                                    return;
                                }
                                else if (group instanceof StandardGroup && itemToAdd instanceof CNodeGroup) {
                                    showModal('Invalid target', 'A contour node can only be a member of a contour node group.');
                                    return;
                                }
                                else {
                                    if (focusItem instanceof CNode && group instanceof CNodeGroup) {
                                        const i = group.members.indexOf(focusItem); // the index after which to insert
                                        const j = itemToAdd.members.indexOf(item); // indicates the first node to be inserted
                                        const nodes = (itemToAdd as CNodeGroup).members.slice(j).concat(itemToAdd.members.slice(0,j));
                                        group.members.splice(i+1, 0, ...nodes);
                                    }
                                    else {
                                        group.members.push(...itemToAdd.members);
                                    }
                                    itemToAdd.members.forEach(m => {m.group = group; m.isActiveMember = true});
                                    itemToAdd.members = [];
                                    if (itemToAdd instanceof CNodeGroup) {
                                        // Since itemToAdd is now an empty NodeGroup, we delete it from the list:
                                        newList = purge(itemToAdd, newList);
                                    }
                                    if (itemToAdd.group) {
                                        itemToAdd.group.members = itemToAdd.group.members.filter(m => m!==itemToAdd);  
                                    }
                                }
                            }
                        }
                        else if (group instanceof CNodeGroup) { // In this case, item must already be a member of group, just like focusItem.
                            let i = group.members.indexOf(focusItem as CNode),
                                j = group.members.indexOf(item as CNode),
                                newMembers: CNode[];
                            if (i<0 || j<0) {
                                console.warn('Unexpectedly missing CNode');
                                return;
                            }
                            if (i!==j && newList.length<MAX_LIST_SIZE && (i+1<j || (j<i && (j>0 || i<group.members.length-1)))) { 
                                // We're splitting group into two parts:
                                if (i+1<j) {
                                    newMembers = group.members.splice(i+1, j-i-1);                                        
                                } 
                                else {
                                    newMembers = [...group.members.slice(0, j), ...group.members.slice(i+1)];
                                    group.members = group.members.slice(j, i+1);
                                }
                                const newGroup = new CNodeGroup(cngCounter);
                                newGroup.copyNonMemberValuesFrom(group);
                                newGroup.members = newMembers;
                                setCNGCounter(prev => prev+1);
                                newMembers.forEach(node => node.group = newGroup);   
                                newList = [...newList, newGroup];
                            }
                        }
                    }
                }
                else {
                    const pres = preselection2Ref.current; // This may be empty if we've just selected the same item (due to the clearing of the preselection at the end of this function).
                    if (e.shiftKey) { // increase selection
                        if (e.ctrlKey || pres.length===0) { 
                            if (item instanceof ENode || !deduplicatedSelection.includes(item)) { // If item is a CNode, we don't add it twice. 
                                newSelection = [...selection, item];
                            }
                        }
                        else {               
                            newSelection = [...selection, ...pres.filter(it => (it instanceof ENode && it===item) || !deduplicatedSelection.includes(it))]; // If the user
                                // shift-clicks on an item, she'll usually only want to add that item to the selection, together with any other items in the preselection
                                // that have not yet been selected.
                        }
                    }
                    else { // replace selection
                        if (e.ctrlKey || pres.length===0) {
                            newSelection = [item];
                            // If ctrl was not pressed, then, for the case that the user clicks on this item again, we prepare the selection not just of item itself but of all 
                            // members of its highest active group:
                            if (!e.ctrlKey) {
                                updateSecondaryPreselection([item]);
                                clearPreselection = false;
                            }
                        }
                        else { // The 'normal' case: we select the preselection.
                            newSelection = pres;
                        }
                        newPoints = [];
                    }
                }
                if (item instanceof Node) {
                    // Handle dragging:
                    setDragging(true);
                    const selectedNodes = newSelection.filter((item, i) => item instanceof Node && i===newSelection.indexOf(item)) as Node[];
                    const contourDragged = item.group instanceof CNodeGroup && item.group.members.every(m => selectedNodes.includes(m));
                    
                    // If we're dragging a contour, we need to determine the location of its center, which is then (in handleMouseMove) passed on to getSnapPoint.
                    let dccDx: number | undefined, 
                        dccDy: number | undefined; // distances (horizontal and vertical) to the center of the drgged contour (if there is one)
                    if (contourDragged && item.group instanceof CNodeGroup) { // The second conjunct should be unnecessary, but Typescript insists.
                        const { x, y } = item.group.getNodalCenter();
                        dccDx = x - item.x;
                        dccDy = y - item.y;
                    }
                    const startX = e.clientX - item.x;
                    const startY = e.clientY - (H + yOffset - item.y);
                    const xMinD = item.x - selectedNodes.reduce((min, it) => it.x<min? it.x: min, item.x); // x-distance to the left-most selected item

                    
                    const handleMouseMove = (e: MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // First, we take into account the grid:
                        const [snapX, snapY] = getSnapPoint(e.clientX - startX, H + yOffset - e.clientY + startY, grid, newList, item, 
                            selectedNodes, dccDx, dccDy);
                        // Next, we have to prevent the enode, as well as the left-most selected item, from being dragged outside the 
                        // canvas to the left (from where they couldn't be recovered), and also respect the lmits of MAX_X, MAX_Y, and MIN_Y:
                        const x = Math.min(Math.max(snapX, xMinD), MAX_X);
                        const y = Math.min(Math.max(snapY, MIN_Y), MAX_Y);
                        const dx = x - item.x;
                        const dy = y - item.y;
                        // Finally, we move each item in the selection, if necessary:
                        if(dx!==0 || dy!==0) {
                            const nodeGroups: CNodeGroup[] = []; // To keep track of the node groups whose members we've already moved.
                            selectedNodes.forEach(item => {
                                // console.log(`moving: ${item.id}`);
                                if (item.group instanceof CNodeGroup) {
                                    if (!nodeGroups.includes(item.group)) {
                                        nodeGroups.push(item.group);
                                        const members = item.group.members;
                                        (item.group as CNodeGroup).groupMove(
                                            selectedNodes.filter(m => m instanceof CNode && members.includes(m)) as CNode[], 
                                            dx, 
                                            dy
                                        );
                                    }
                                }
                                else if (item instanceof Node) {
                                    item.move(dx, dy)
                                }
                            });
                            setItemsDragged(prev=> [...prev]);  // to trigger a re-render 
                        }
                    };            

                    const handleMouseUp = () => {
                        window.removeEventListener('mousemove', handleMouseMove);
                        window.removeEventListener('mouseup', handleMouseUp);
                        setDragging(false);
                        adjustLimit();
                        setOrigin(item!==focusItem && newPoints.length==0, newPoints, item, newSelection);
                        // If the focusItem is still the same or points is non-empty, then don't reset the transform (even if the origin has changed). However, if points is non-empty,
                        // then we have to 'renormalize' the new selection, since the nodes might have been dragged around the origin (given by the last element of the points array):
                        if(newPoints.length>0) newSelection.forEach(item => {
                            if (item instanceof Node) { 
                                item.x100 = origin.x + (item.x - origin.x) * 100/scaling;
                                item.y100 = origin.y + (item.y - origin.y) * 100/scaling;
                            }
                        });
                        // We also apply round() to get rid of tiny errors that might have been introduced during dragging.
                        newSelection.forEach(item => {
                            if (item instanceof Node) {
                            item.x = item.x100 = round(item.x, ROUNDING_DIGITS);
                            item.y = item.y100 = round(item.y, ROUNDING_DIGITS);
                            }
                        });
                        setItemsMoved(prev => [...prev]); // to signal to the updaters of, e.g., canCopy that the positions of items may have changed.
                    }
                
                    window.addEventListener('mousemove', handleMouseMove);
                    window.addEventListener('mouseup', handleMouseUp);
                }

                setFocusItem(item);
                setList(newList);
                setPoints(newPoints);
                if (clearPreselection) {
                    setPreselection1([]);
                    setPreselection2([]);
                }
                setSelection(newSelection);
            }           
        }, 
        [
            allItems, deduplicatedSelection, selection, points, list, adding, dissolveAdding, focusItem, yOffset, scaling, adjustLimit, 
            cngCounter, deselect, grid, origin.x, origin.y, setOrigin, updateSecondaryPreselection
        ]
    );

    /**
     * Mouse down handler for contour center divs.
     */
    const groupMouseDown = (group: CNodeGroup, e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>) => { 
        if (group.members.length>0) {
            itemMouseDown(group.members[group.members.length-1], e, false); // the 'false' parameter prevents the preselection from being cleared after selecting,
                // which means that the whole current preselection will again be selected if the user clicks on the center div again.
        }
    }

    /**
     * Mouse enter handler for items on the canvas
     */
    const itemMouseEnter = useCallback((
            item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>
        ) => { 
            if(!dragging) {
                setPreselection1(prev => [item]); 
                if (e.ctrlKey) {
                    setPreselection2(prev => [item]); // if Ctrl is pressed, only add item by itself
                }
                else {
                    updateSecondaryPreselection([item]); // otherwise add all the leaf members of its highest active group
                }
            }
        }, [dragging, updateSecondaryPreselection]
    );

    /**
     * Mouse enter handler for the contour center divs.
     */
    const groupMouseEnter = useCallback((
            group: CNodeGroup, 
            e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>
        ) => { 
            if(!dragging) {
                setPreselection1(prev => group.members); 
                if (e.ctrlKey) {
                    setPreselection2(prev => group.members); // if Ctrl is pressed, only add group members by themselves
                }
                else {
                    updateSecondaryPreselection(group.members); // otherwise add all the leaf members of their highest active group
                }
            }
        }, [dragging, updateSecondaryPreselection]
    );

    /**
     * Mouse leave handler for ENodes, CNodes, and contour center divs.
     */
    const mouseLeft = useCallback(() => {
        if(!dragging) {
            setPreselection1(prev => []); 
            updateSecondaryPreselection([]);
        }
    }, [dragging, updateSecondaryPreselection]);

    /**
     * Mouse down handler for the canvas. Adds and removes Points and creates a lasso.
     */
    const canvasMouseDown = useCallback((
            e: React.MouseEvent<HTMLDivElement, MouseEvent>
        ) => { 
            e.preventDefault();
            e.stopPropagation();
            const canvas = canvasRef.current;
            if (canvas) {
                const element = document.activeElement as HTMLElement;
                element.blur();
                canvas.focus();
            }
            const {left, top} = canvas?.getBoundingClientRect()?? {left: 0, top: 0};
            const {scrollLeft, scrollTop, clientWidth, clientHeight} = canvas?? {scrollLeft: 0, scrollTop:0, clientWidth: 0, clientHeight: 0};

            if (e.clientX - left >= clientWidth || e.clientY - top > clientHeight) { // ignore interactions with the scrollbars
                return;
            }

            setDragging(true);
            const x = e.clientX - left + scrollLeft;
            const y = e.clientY - top + scrollTop;
            const deselect = e.ctrlKey && !e.shiftKey && selection.length>0;
            let newPoints = e.shiftKey? points: [];

            const handleMouseMove = (mme: MouseEvent) => {
                const dx = mme.clientX - e.clientX;
                const dy = mme.clientY - e.clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist >= CANVAS_CLICK_THRESHOLD) { // Only in this case do we create a Lasso.
                    setPoints(newPoints);
                    const lasso = new Lasso(Math.min(x, x+dx), Math.min(y, y+dy), Math.max(x, x+dx), Math.max(y, y+dy), deselect);
                    const pres = preselection2Ref.current;
                    let changed = false;
                    const newPres = [
                        ...pres.filter(item => {
                            const result = lasso.contains(item, yOffset);
                            changed = changed || !result;
                            return result
                        }),
                        ...allItems.filter(item => {
                            const result = lasso.contains(item, yOffset) && !pres.includes(item) && (!deselect || selection.includes(item));
                            changed = changed || result;
                            return result
                        })];
                    if (changed) {
                        setPreselection2(prev => newPres);
                    }
                    setLasso(prevLasso => lasso);;
                }
            }

            const handleMouseUp = (mue: MouseEvent) => {
                canvasRef.current?.removeEventListener('mouseup', handleMouseUp);
                canvasRef.current?.removeEventListener('mousemove', handleMouseMove);
                setDragging(false)
                let newFocus = focusItem;
                let newSelection = selection;

                const dx = mue.clientX - e.clientX;
                const dy = mue.clientY - e.clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if(dist < CANVAS_CLICK_THRESHOLD) { // Only in this case, the mouseUp event should be interpreted as a click event.
                    const [gx, gy] = nearestGridPoint(x, H + yOffset - y, grid);
                    const newPoint = new Point(gx, gy);
                    if (!e.shiftKey) {
                        newPoints = [newPoint];
                        newSelection = [];
                        newFocus = null;
                    } 
                    else {
                        const included = points.some(p => newPoint.id==p.id);
                        if (!included) newPoints = [...points, newPoint];
                    }
                } 
                else { // In this case, we need to take care of the lasso, and either select or deselect items.
                    const pres = preselection2Ref.current;
                    if (deselect) {
                        const toDeselect = pres.reduce((acc: number[], item: Item) => [...acc, selection.lastIndexOf(item)], []);
                        newSelection = selection.filter((item, index) => !toDeselect.includes(index));
                    } 
                    else if (e.shiftKey) { // increase selection                    
                        newSelection = [...selection, ...pres];
                        pres.forEach(item => { // 'renormalize' the nodes to be added to the selection:
                            if (item instanceof Node) {
                                item.x100 = origin.x + (item.x - origin.x) * 100/scaling;
                                item.y100 = origin.y + (item.y - origin.y) * 100/scaling;
                            }
                        });
                    }
                    else {
                        newSelection = pres;
                    }
                    if (newSelection.length>0 && (!focusItem || !deselect)) {
                        newFocus = newSelection[newSelection.length-1]
                    } 
                    else if (newSelection.length==0 || (focusItem && !newSelection.includes(focusItem))) {
                        newFocus = null;
                    }
                }            
                setFocusItem(newFocus);
                setLasso(null);
                setOrigin(true, newPoints, newFocus, newSelection);
                setPoints(newPoints);
                setPreselection1([]);
                setPreselection2([]);
                setSelection(newSelection);
            }
    
            canvasRef.current?.addEventListener('mousemove', handleMouseMove);
            canvasRef.current?.addEventListener('mouseup', handleMouseUp);

            setAdding(false);
            setDissolveAdding(false);
        }, [allItems, selection, yOffset, focusItem, points, origin, scaling, grid, setOrigin]
    );

    /**
     *  OnClick handler for the 'Node' button.
     */
    const addEntityNodes = useCallback(() => {
        if (points.length>0) {
            let counter = eNodeCounter;
            const nodes = points.map((point, i) => new ENode(counter++, point.x, point.y));
            const newList = [...list, ...nodes];
            setENodeCounter(counter);
            setList(list => newList);
            const newFocus = nodes[nodes.length-1];
            setPoints([]);
            setSelection(nodes);
            setFocusItem(newFocus);
            setOrigin(true, [], newFocus, nodes);
            // No need to call adjustLimit, since we're basically just replacing the points with nodes.
        }
    }, [points, eNodeCounter, list, setOrigin]);

    /**
     *  OnClick handler for the 'Contour' button.
     */
    const addContours = useCallback(() => { 
        if (points.length>0) {
            let counter = cngCounter;
            const newCNodeGroups = points.map((point, i) => new CNodeGroup(counter++, point.x, point.y));
            const newList = [...list, ...newCNodeGroups];
            setCNGCounter(counter);
            setList(list => newList);
            const nodes = getItems(newCNodeGroups, true);
            const newFocus = nodes[nodes.length-1];
            setPoints([]);
            setSelection(nodes);
            setFocusItem(newFocus);
            setOrigin(true, [], newFocus, nodes);
            adjustLimit(getItems(newList)); 
        }
    }, [points, cngCounter, list, adjustLimit, setOrigin]);

    const sorry = useCallback(() => {showModal('Apology', 'Sorry, this feature has not yet been implemented!', false, '');}, []);

    /** 
     * OnClick handler for the 'Create' button.
     */
    const createDepItem = useCallback((index: number) => {
        if (selectedNodes.length > 0 && index >= 0 && index < depItemKeys.length) {
            let newSelection: Item[] = [];
            const key = depItemKeys[index];
            switch (key) {
                case 'lbl':         
                    newSelection = selectedNodes.map(node => {
                        const label = new Label(node);
                        label.text = 'a';
                        label.updateLines(unitscale, displayFontFactor);
                        return label;
                    });
                    break;
                default: 
                    sorry();
                    return;
            }
            const newFocus = newSelection[newSelection.length - 1];
            setPoints([]);
            setList(prev => [...prev]); // This will update allItems.
            setSelection(prev => newSelection);
            setFocusItem(newFocus);
            setOrigin(true, [], newFocus, newSelection);
            // Not really any need to call adjustLimit(), since the new Items will be created close to existing nodes.
        }
    }, [selectedNodes, unitscale, displayFontFactor, setOrigin, sorry]);

    /**
     * An array of the highest-level Groups and Items that will need to be copied if the 'Copy Selection' button is pressed. The same array is also used for 
     * the purposes of the 'Create Group' button in the GroupTab.
     */
    const copySelection = useCallback(() => {
        if (topTbc.length>0) {
            const copies = new Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>(); // This will store the keys of the copied Items, 
                // CNodeGroups, and StandardGroups, mapped to their respective copies.
            const [newENodeCounter, newCNGCounter, newSGCounter] = copy(topTbc, deduplicatedSelection, hDisplacement, vDisplacement, 
                copies, eNodeCounter, cngCounter, sgCounter);
            const copiedList = list.reduce((acc: (ENode | CNodeGroup)[], it) => { // an array that holds the copied nodes or node groups in the same 
                // order as list holds the nodes or node groups that they're copies of
                const id = it.id.toString();
                if (copies.has(id)) {
                    const copy = copies.get(id) as ENode | CNodeGroup;
                    if (copy) acc.push(copy);
                }
                return acc;
            }, []);
            const newSelection = selection.reduce((acc: Item[], item) => {
                const id: string = item.id;
                const copy = copies.get(id);
                if (!(copy instanceof Item)) { // If this happens, then either topTbc hasn't been set properly or something has gone wrong with the Item IDs.
                    if (!copy) {
                        console.warn(`Copying: no copy found of ${id}.`);
                    }
                    else {
                        console.warn(`Copying: ID '${id}' mapped to non-item.`);
                    }
                    return acc;
                }
                else {
                    acc.push(copy);
                    return acc;
                }
            }, []);
            for (let it of copies.values()) {
                if (it instanceof Label) {
                    it.updateLines(unitscale, displayFontFactor);
                }
            }
            const newList = [...list, ...copiedList];
            const newFocus = focusItem && (copies.get(focusItem.id) || null) as Item | null;
            setENodeCounter(newENodeCounter);
            setCNGCounter(newCNGCounter);
            setSGCounter(newSGCounter);
            setList(newList);
            setFocusItem(prev => newFocus);
            setOrigin(true, points, newFocus, newSelection); 
            adjustLimit(getItems(newList));
            setSelection(newSelection);
            if (newFocus) {
                scrollTo(newFocus);
            }
        }
    }, [topTbc, deduplicatedSelection, points, list, hDisplacement, vDisplacement, eNodeCounter, cngCounter, sgCounter, selection, focusItem, 
        unitscale, displayFontFactor, adjustLimit, setOrigin, scrollTo
    ]);


    /**
     * OnClick handler for the delete button.
     */
    const deleteSelection = useCallback(() => { 
        if (deduplicatedSelection.length>0) {
            const newList: (ENode | CNodeGroup)[]  = [];
            for (let it of list) {
                if (it instanceof ENode) {
                    if (!deduplicatedSelection.includes(it)) {
                        newList.push(it);
                        // Remove to-be-deleted ornaments:  
                        it.ornaments = it.ornaments.filter(o => !deduplicatedSelection.includes(o));
                    }
                }
                else if (it instanceof CNodeGroup) {
                    const newMembers = it.members.filter(node => !deduplicatedSelection.includes(node));
                    if (newMembers.length>0) {
                        it.members = newMembers;
                        newList.push(it);
                        newMembers.forEach(m => { // Remove to-be-deleted ornaments:                                                
                            m.ornaments = m.ornaments.filter(o => !deduplicatedSelection.includes(o));
                        });
                    }
                }
            }
            const whitelist = new Set<Group<Node | Group<any>>>();
            newList.forEach(it => { // Whitelist each group that contains (directly or indirectly) a not-to-be-deleted item.
                if (it instanceof ENode) {
                    getGroups(it)[0].forEach(g => whitelist.add(g));
                }
                if (it instanceof CNodeGroup) { 
                    whitelist.add(it); // A NodeGroup is in newList only if it contains at least one not-to-be-deleted node. So we whitelist it.
                    it.members.forEach(m => {
                        m.ornaments.forEach(o => {
                            getGroups(o)[0].forEach(g => whitelist.add(g));
                        });
                    });
                }
            });
            whitelist.forEach(g => { // For each of those Groups that is not a CNodeGroup, filter out all the members that are not either (a) not-to-be-deleted 
                    // ENodes or (b) ornaments attached to such ENodes or to CNodes of not-to-be-deleted (and accordingly whitelisted) CNodeGroups or (c) 
                    // whitelisted Groups.
                if (!(g instanceof CNodeGroup)) { 
                    g.members = g.members.filter(m => 
                            (m instanceof ENode && newList.includes(m)) || 
                            (m instanceof Ornament && 
                                (m.node instanceof ENode && newList.includes(m.node) || 
                                (m.node.group instanceof CNodeGroup && whitelist.has(m.node.group)))) ||
                            (!(m instanceof Item) && whitelist.has(m)));
                }
            });
            setList(newList);
            setSelection([]);
            setPreselection1([]);
            setPreselection2([]);
            setFocusItem(null);
            adjustLimit(getItems(newList));
            setOrigin(true, points, null, []);
        }
    }, [deduplicatedSelection, points, list, adjustLimit, setOrigin]);


    /**
     * The callback function for the ItemEditor. Only needed if focusItem is not null. The ItemEditor will use this in constructing change handlers 
     * for its various child components. In particular, these handlers will call itemChange with an input element (or null) and a key that is obtained 
     * from the focusItem through Item.getInfo().
     */
    const itemChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | number | null, key: string) => {
        if (focusItem) {
            const [edit, range] = focusItem.handleEditing(e, logIncrement, deduplicatedSelection, unitscale, displayFontFactor, key);
            const nodeGroups: Set<CNodeGroup> | null = range==='ENodesAndCNodeGroups'? new Set<CNodeGroup>(): null;
            const nodes = range=='onlyThis'? 
                edit(focusItem, list):
                deduplicatedSelection.reduce((acc: (ENode | CNodeGroup)[], item: Item) => {
                        //console.log(`Editing item ${item.key}`);
                        if (item instanceof CNode && nodeGroups) {
                            if (nodeGroups.has(item.group as CNodeGroup)) return acc;
                            else {
                                nodeGroups.add(item.group as CNodeGroup);
                            }
                        }
                        return edit(item, acc) as (ENode | CNodeGroup)[]
                }, list);
            setList(prev => nodes); // for some reason, the setter function is called twice here.
            setOrigin(false, points, focusItem, selection, list);
            if (focusItem instanceof Node) { 
                scrollTo(focusItem);
            }
            adjustLimit();
            setItemsMoved(prev => [...prev]); 
        }
    }, [focusItem, logIncrement, deduplicatedSelection, selection, points, list, unitscale, displayFontFactor, 
        adjustLimit, setOrigin, scrollTo
    ]);  

    const adjustSelection = useCallback((item: Item) => {
        const ha = highestActive(item);
        if (ha instanceof Item) {
            setSelection([ha]);
        }
        else {
            const lm = getLeafMembers(ha, true);
            setSelection([item, ...allItems.filter(it => it!==item && lm.has(it))]);
        }
    }, [allItems]);

    /**
     * Moves the selection in one of the four cardinal directions, by an amount determined by itemEditorConfig.logIncrement.
     * To be called from hotkey handlers.
     */
    const moveSelection = useCallback((dirX: number, dirY: number) => {
        const inc = 10 ** logIncrement;
        selectedNodes.forEach(node => {
            if (dirX!==0) node.x = node.x100 = round(node.x + dirX * inc, ROUNDING_DIGITS);
            if (dirY!==0) node.y = node.y100 = round(node.y + dirY * inc, ROUNDING_DIGITS);
        });
        adjustLimit();
        setOrigin(false, points, focusItem, selection, list);
        if (focusItem instanceof Node) {
            scrollTo(focusItem);
        }
        setItemsMoved(prev => [...prev]);
    }, [logIncrement, selectedNodes, focusItem, list, points, selection, adjustLimit, setOrigin, scrollTo]);

    const changeUnitscale = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (isFinite(val)) {
            const newVal = Math.min(Math.max(MIN_UNITSCALE, val), MAX_UNITSCALE);
            setUnitscale(prev => newVal); 
            allItems.forEach(it => {
                if (it instanceof Label) {
                    it.updateLines(newVal, displayFontFactor);
                }
            });
            adjustLimit();
        }
    }, [allItems, displayFontFactor, adjustLimit]);

    const changeDisplayFontFactor = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        if (isFinite(val)) {
            const newVal = Math.min(Math.max(MIN_DISPLAY_FONT_FACTOR, val), MAX_DISPLAY_FONT_FACTOR);
            setDisplayFontFactor(prev => newVal);
            allItems.forEach(it => {
                if (it instanceof Label) {
                    it.updateLines(unitscale, newVal);
                }
            });
            adjustLimit();
        }
    }, [allItems, unitscale, adjustLimit]);

    /**
     * Returns true if the rotation of the selection by the specified angle is within bounds.
     */
    const testRotation = useCallback((angle: number) => {
        for(const node of selectedNodes) {
            const {x, y} = rotatePoint(node.x, node.y, origin.x, origin.y, angle, ROUNDING_DIGITS);
            if (x<0 || x>MAX_X) return false;
            if (y<MIN_Y || y>MAX_Y) return false;
        }
        return itemsMoved!==null; // We use 'itemsMoved!==null' instead of 'true' to suppress a warning about an 'unnecessary dependency'
    }, [selectedNodes, origin.x, origin.y, itemsMoved]);

    /**
     * Returns true if setting the scaling of the selection to the specified angle doesn't violate any constraints on the placement, radius, etc. of nodes.
     * May display error messages.
     */
    const testScaling = useCallback((val: number) => {
        for (const node of selectedNodes) {
            const {x, y} = scalePoint(node.x100, node.y100, origin.x, origin.y, val/100)
            if (!isFinite(x) || !isFinite(y)) {
                showModal('Buzz Lightyear Alert', 
                    `Nodes cannot be sent to ${x==-Infinity || y==-Infinity? '(negative) ':''}infinity, or beyond.`);
            }
            if (x<0 || x>MAX_X) return false;
            if (y<MIN_Y || y>MAX_Y) return false;
            if (transformFlags.scaleENodes && node instanceof ENode) {
                const v = node.radius100 * val/100;
                if(v<0 || v>MAX_RADIUS) return false;
            }
            if (transformFlags.scaleLinewidths) {
                const v = node.linewidth100 * val/100;
                if(v<0 || v>MAX_LINEWIDTH) return false;
            }
            if (transformFlags.scaleDash && node.dash100.some(l => {
                const v = l * val/100;
                return v<0 || v>MAX_DASH_VALUE;
            })) return false;
        }
        return true
    }, [selectedNodes, origin, transformFlags.scaleDash, transformFlags.scaleENodes, transformFlags.scaleLinewidths]);    

    /**
     * Rotates the selection by the specified angle (in degrees).
     */
    const rotateSelection = useCallback((angle: number) => {
        selectedNodes.forEach(node => {
            ({x: node.x, y: node.y} = rotatePoint(node.x, node.y, origin.x, origin.y, angle, ROUNDING_DIGITS));
            ({x: node.x100, y: node.y100} = rotatePoint(node.x100, node.y100, origin.x, origin.y, angle, ROUNDING_DIGITS))                              
        });
        adjustLimit();
        setRotation(prev => round(getCyclicValue(prev+angle, MIN_ROTATION, 360, 10 ** Math.max(0, -MIN_ROTATION_LOG_INCREMENT)), ROUNDING_DIGITS));
        setItemsMoved(prev => [...prev]);                                     
    }, [selectedNodes, origin, adjustLimit]);

    /**
     * Sets the scaling of the current selection to the indicated value, as a percentage of the respective 'original' size of the selected items.
     */
    const scaleSelection = useCallback((newValue: number) => {
        if (testScaling(newValue)) {
            selectedNodes.forEach(node => {
                ({x: node.x, y: node.y} = scalePoint(node.x100, node.y100, origin.x, origin.y, newValue/100));
                if (node instanceof CNode) {
                    node.dist0 = round(node.dist0_100 * newValue/100, ROUNDING_DIGITS);
                    node.dist1 = round(node.dist1_100 * newValue/100, ROUNDING_DIGITS);
                }
                else if (node instanceof ENode) {
                    if (transformFlags.scaleENodes) {
                        node.radius = node.radius100 * newValue/100;
                        node.ornaments.forEach(o => {
                            o.gap = o.gap100 * newValue/100;
                        });
                    }
                    if (transformFlags.scaleLinewidths) node.linewidth = node.linewidth100 * newValue/100;
                    if (transformFlags.scaleDash) node.dash = node.dash100.map(l => l * newValue/100);
                }
            }); 
            const affectedNodeGroups: CNodeGroup[] = deduplicatedSelection.filter(it => it instanceof CNode)
                .map(node => node.group) // An array of those NodeGroups that have members included in selection.  
                .filter((g, i, arr) => i===arr.indexOf(g)) as CNodeGroup[]; 
            affectedNodeGroups.forEach(group => {
                if (group) {
                    if (transformFlags.scaleLinewidths) group.linewidth = group.linewidth100 * newValue/100;
                    if (transformFlags.scaleDash) group.dash = group.dash100.map(l => l * newValue/100);
                }
            });
            adjustLimit();
            setScaling(newValue);
            setItemsMoved(prev => [...prev]);
        }
    }, [selectedNodes, origin, adjustLimit, testScaling, deduplicatedSelection, transformFlags.scaleDash, transformFlags.scaleENodes, transformFlags.scaleLinewidths]);

    /**
     * Rounds the location of each selected item to the nearest pixel.
     */
    const roundLocations = useCallback(() => {
        selectedNodes.forEach(node => {
            node.x = node.x100 = Math.round(node.x);
            node.y = node.y100 = Math.round(node.y);            
        });
        setOrigin(false, points, focusItem, selection, list);
        setItemsMoved(prev => [...prev]);
    }, [selectedNodes, selection, points, focusItem, list, setOrigin]);

    const hFlip = useCallback(() => {
        selectedNodes.forEach(node => {
            node.x = 2*origin.x - node.x;
            node.x100 = 2*origin.x - node.x100;
            if (node instanceof CNode) {
                node.angle0 = -node.angle0;
                node.angle1 = -node.angle1;
            }
        });
        adjustLimit();
        setItemsMoved(prev => [...prev]);                                     
    }, [selectedNodes, origin, adjustLimit]);

    const vFlip = useCallback(() => {
        selectedNodes.forEach(node => {
            node.y = 2*origin.y - node.y;
            node.y100 = 2*origin.y - node.y100;
            if (node instanceof CNode) {
                node.angle0 = -node.angle0;
                node.angle1 = -node.angle1;
            }
        });
        adjustLimit();
        setItemsMoved(prev => [...prev]);                                     
    }, [selectedNodes, origin, adjustLimit]);

    /**
     * Turn all contours that have members in the supplied array into regular polygons.
     */
    const turnIntoRegularPolygons = useCallback((selection: Node[]) => {
        (selection.map(it => {
                if (it instanceof CNode) {
                    it.angle0 = it.angle1 = 0;
                    it.dist0 = it.dist0_100 = it.dist1 = it.dist1_100 = DEFAULT_DISTANCE;
                    return it.group;
                } 
                else return null;
            }).filter((g, i, arr) => g instanceof CNodeGroup && i===arr.indexOf(g)) as CNodeGroup[]
        ).forEach(g => {
            g.equalizeCentralAngles(g.members[0]);
            g.equalizeDistancesFromCenter(g.members[0]);
        });
        adjustLimit();
        setItemsMoved(prev => [...prev]);
    }, [adjustLimit]);

    /**
     * Rotate all contours that have members in the supplied array by -180/n degrees, where n is the number of nodes in the respective contour.
     */
    const rotatePolygons = useCallback((selection: Node[]) => {
        (selection.map(it => it instanceof CNode? it.group: null)
            .filter((g, i, arr) => g instanceof CNodeGroup && i===arr.indexOf(g)) as CNodeGroup[]
        ).forEach(g => {
            const c = g.getNodalCenter();
            const angle = -180 / g.members.length;
            g.members.forEach(node => {
                ({x: node.x, y: node.y} = rotatePoint(node.x, node.y, c.x, c.y, angle, ROUNDING_DIGITS));
                ({x: node.x100, y: node.y100} = rotatePoint(node.x100, node.y100, c.x, c.y, angle, ROUNDING_DIGITS));
            });
        });
        adjustLimit();
        setItemsMoved(prev => [...prev]);
    }, [adjustLimit]);

    /**
     * Either sets or increases/decreases the shading of the selected nodes, depending on whether the third argument is true.
     */
    const setShading = useCallback((selection: Node[], val: number, inc: boolean = false) => {
        selection.map(it => it.group instanceof CNodeGroup? it.group: it)
        .filter((it, i, arr) => i===arr.indexOf(it))
        .forEach(obj => {
            const newVal = Math.min(Math.max(inc? round(obj.shading + val, ROUNDING_DIGITS): val, 0), 1);
            obj.shading = newVal;
        });
        setPoints(prev => [...prev]); // to trigger a re-render
    }, []);

    /**
     * Either sets or increases/decreases the linewidth of the selected nodes, depending on whether the third argument is true.
     */
    const setLinewidth = useCallback((selection: Node[], val: number, inc: boolean = false) => {
        selection.map(it => it.group instanceof CNodeGroup? it.group: it)
        .filter((it, i, arr) => i===arr.indexOf(it))
        .forEach(obj => {
            const newLw = Math.min(Math.max(inc? round(obj.linewidth + val, ROUNDING_DIGITS): val, 0), MAX_LINEWIDTH);
            obj.linewidth = obj.linewidth100 = newLw;
        });
        setPoints(prev => [...prev]); // to trigger a re-render
    }, []);


    /**
     * Creates a group of the currently selected nodes or (where applicable) their respective highest active groups.
     */
    const createGroup = useCallback(() => {
        const newMembers = toBeGrouped; 
        const createCNG = newMembers.every(m => m instanceof CNode);
        const createSG = newMembers.every(m => !(m instanceof CNode));

        if (!createCNG && !createSG) {
            showModal('Invalid group composition', `Cannot create a group that contains both contour nodes and entity nodes or groups.`);
            return;
        }
        if (createCNG && newMembers.length > MAX_CNODEGROUP_SIZE) {
            showModal('Too damn high!', `The maximum size of a contour node group is ${MAX_CNODEGROUP_SIZE} nodes.`);
            return;
        }
        if (createCNG && list.length===MAX_LIST_SIZE) { // Here we check whether creating the new CNodeGroup would lead to the deletion of at least one existing CNodeGroup:
            const affectedGroups = newMembers.map(item => item.group).filter((g, i, arr) => g && i===arr.indexOf(g)) as CNodeGroup[];
            if (!affectedGroups.some(g => g.members.every(m => newMembers.includes(m)))) {
                showModal('Sorry!', `Creating this new group would push our list size over the limit.`);
                return;    
            }
        }
        if (createSG) {
            const maxDepth = newMembers.reduce((acc, it) => {
                const d = depth(it);
                return acc>d? acc: d;
            }, 0);
            if (maxDepth >= MAX_GROUP_LEVEL) {
                showModal('Too damn high!', `The maximum group level is ${MAX_GROUP_LEVEL}.`);
                return;    
            }
        }

        const oldGroups = newMembers.map(m => m.group).filter((g, i, arr) => g && i===arr.indexOf(g));
        let newList = list,
            group: Group<any>;
        if (createCNG) {
            group = new CNodeGroup(cngCounter);
            group.members = newMembers;
            (group as CNodeGroup).copyNonMemberValuesFrom(...oldGroups as CNodeGroup[]);
            newList = [...newList, group as CNodeGroup];
            setCNGCounter(prev => prev + 1);
        }                                                
        else {
            group = new StandardGroup<Item | Group<any>>(sgCounter, newMembers);
            setSGCounter(prev => prev + 1);
        }
        oldGroups.forEach(g => {
            if (g) {
                g.members = g.members.filter(m => !newMembers.includes(m));
                if (g.members.length==0) {
                    newList = purge(g, newList);
                }
            }
        });
        newMembers.forEach(member => {
            member.group = group;
            member.isActiveMember = true;
        });
        setList(prev => newList); 
        if (focusItem) adjustSelection(focusItem);
    }, [toBeGrouped, list, cngCounter, sgCounter, focusItem, adjustSelection]);


    const leaveGroup = useCallback(() => {
        const affected = deduplicatedSelection.map(item => {
            const groups = getGroups(item);
            return groups[1]>0? groups[0][groups[1] - 1]: item;
        }).filter((item, i, arr) => i===arr.indexOf(item));
        affected.forEach(m => m.isActiveMember = false);
        if (affected instanceof Item) {
            setAdding(prev => false);
            setDissolveAdding(prev => false);
        }
        if (focusItem) adjustSelection(focusItem);
    }, [deduplicatedSelection, focusItem, adjustSelection]);

    const rejoinGroup = useCallback(() => {
        const affected = deduplicatedSelection.map(item => highestActive(item))
        .filter((item, i, arr) => item.group && i===arr.indexOf(item));
        affected.forEach(item => {
            item.isActiveMember = true;
        });
        if (focusItem) adjustSelection(focusItem);                                 
    }, [deduplicatedSelection, focusItem, adjustSelection]);

    const restoreGroup = useCallback(() => {
        const affected = deduplicatedSelection.map(item => highestActive(item))
        .filter((item, i, arr) => !(item instanceof Item) && i===arr.indexOf(item)) as Group<any>[];
        affected.forEach(g => {
            g.members.forEach(m => m.isActiveMember=true);
        });
        if (focusItem) adjustSelection(focusItem);                                 
    }, [deduplicatedSelection, focusItem, adjustSelection]);


    const displayCode = useCallback((pixel: number) => {
        setCode(prev => getCode(list, pixel))
    }, [list]);


    const loadDiagram = useCallback((code: string, replace: boolean) => {

        if (false) { // for debugging purposes
            load(code, unitscale, displayFontFactor, 0, 0, 0); 
            console.log('Success!');
            return;
        }
        let newList: (ENode | CNodeGroup)[] = [], 
            newPixel = 0, 
            newENodeCounter = 0, 
            newCNGCounter = 0,
            newSGCounter = 0;
        try {
            [newList, newPixel, newENodeCounter, newCNGCounter, newSGCounter] = replace? 
                load(code, undefined, displayFontFactor, 0, 0, 0): 
                load(code, unitscale, displayFontFactor, eNodeCounter, cngCounter, sgCounter);
            if (replace) {
                setUnitscale(prev => newPixel);
                setPreselection1([]);
                setPreselection2([]);
                setSelection([]);
                setFocusItem(null);
                setOrigin(true, points, null, [], newList);
            }
            else {
                newList = [...list, ...newList];
            }
            setList(prev => newList);
            setENodeCounter(prev => newENodeCounter);
            setCNGCounter(prev => newCNGCounter);
            setSGCounter(prev => newSGCounter);            
            adjustLimit(getItems(newList));
        } 
        catch (e: any) {
            if (e.msg) {
                showModal('Parsing failed', e.msg, e.extraWide);
            }
            else {
                console.error('Parsing failed:', e.message, e.stack);
            }
        }
    }, [list, eNodeCounter, cngCounter, sgCounter, points, unitscale, displayFontFactor, adjustLimit, setOrigin]);


    const numberOfTbcENodes = useMemo(() => deduplicatedSelection.reduce((acc, m) => m instanceof ENode? acc + 1: acc, 0), [deduplicatedSelection]);

    const numberOfTbcCNGs = useMemo(() => getCNodeGroups(topTbc).length, [topTbc]);

    const copyingWouldConflictWithMaxCNGSize = useMemo(() => {
        const tbcContainingCNGs = topTbc.filter(it => it instanceof CNode).map(node => node.group);
        const dedupTbcContainingCNGs = tbcContainingCNGs.filter((g, i, arr) => i===arr.indexOf(g));
        return dedupTbcContainingCNGs.some(group => group && 
            group.members.length + tbcContainingCNGs.reduce((acc, g) => g===group? acc + 1: acc, 0) > MAX_CNODEGROUP_SIZE)
    }, [topTbc]);

    const copyingWouldConflictWithMaxNumberOfOrnaments = useMemo(() => {
        const nonTbcNodesWithTbcOrnaments = topTbc.filter(it => it instanceof Ornament || it instanceof StandardGroup).flatMap(it => {
            if (it instanceof Ornament) {
                return deduplicatedSelection.includes(it.node)? []: [it.node];
            }
            else if (it instanceof StandardGroup) {
                const lm = getLeafMembers(it);
                return Array.from(lm).filter(m => m instanceof Ornament && !deduplicatedSelection.includes(m.node)).map(o => (o as Ornament).node);
            }
        });
        const dedupNonTbcNodesWithTbcOrnaments = nonTbcNodesWithTbcOrnaments.filter((g, i, arr) => i===arr.indexOf(g));
        return dedupNonTbcNodesWithTbcOrnaments.some(node => node && 
            node.ornaments.length + nonTbcNodesWithTbcOrnaments.reduce((acc, n) => n===node? acc + 1: acc, 0) > MAX_NUMBER_OF_ORNAMENTS);
    }, [topTbc, deduplicatedSelection]);

    const canCopy: boolean = useMemo(() => (
        deduplicatedSelection.length > 0 &&
        list.length + numberOfTbcENodes + numberOfTbcCNGs <= MAX_LIST_SIZE &&
        !copyingWouldConflictWithMaxCNGSize &&
        !copyingWouldConflictWithMaxNumberOfOrnaments &&
        (hDisplacement >= 0 || leftMostSelected + hDisplacement >= 0) &&
        (vDisplacement <= 0 || topMostSelected + vDisplacement <= MAX_Y) &&
        (hDisplacement <= 0 || rightMostSelected + hDisplacement <= MAX_X) &&
        (vDisplacement >= 0 || bottomMostSelected + vDisplacement >= MIN_Y)
    ), [
        deduplicatedSelection, list, numberOfTbcENodes, numberOfTbcCNGs, copyingWouldConflictWithMaxCNGSize, copyingWouldConflictWithMaxNumberOfOrnaments, 
        hDisplacement, vDisplacement, leftMostSelected, rightMostSelected, topMostSelected, bottomMostSelected
    ]);

    const canDelete: boolean = selection.length > 0;

    const canAddENodes: boolean = points.length>0 && list.length < MAX_LIST_SIZE;

    const canAddContours: boolean = points.length>0 && list.length < MAX_LIST_SIZE;

    const canAddOrnaments: boolean = useMemo(() => 
        selectedNodes.length > 0 && 
        deduplicatedSelection.every(it => !(it instanceof Node) || it.ornaments.length <= MAX_NUMBER_OF_ORNAMENTS), 
        [selectedNodes, deduplicatedSelection]
    );

    const canCreateDepItem: boolean = useMemo(() => {
        const info = depItemInfos[depItemIndex]
        return selectedNodes.length >= info.min && (
            (info.min===1 && canAddOrnaments) || // If info.min===1, we are going to add Ornaments, and otherwise ENodes.
            (info.min > 1) && list.length + selectedNodes.length < MAX_LIST_SIZE
        )
    }, [list, selectedNodes, depItemIndex, canAddOrnaments]);

    const canMoveLeft: boolean = leftMostSelected - 10 ** logIncrement >= 0;

    const canMoveRight: boolean = rightMostSelected + 10 ** logIncrement <= MAX_X;

    const canMoveUp: boolean = topMostSelected + 10 ** logIncrement <= MAX_Y;

    const canMoveDown: boolean = bottomMostSelected - 10 ** logIncrement >= MIN_Y;

    const canHFlip: boolean = useMemo(() => !selectedNodes.some(item => {
        const x = 2*origin.x - item.x; // simulate hFlip on item
        return itemsMoved && (x<0 || x>MAX_X); // 'itemsMoved &&' added to suppress a warning about an 'unnecessary dependency'
    }), [selectedNodes, origin, itemsMoved]);

    const canVFlip: boolean = useMemo(() => !selectedNodes.some(item => {
        const y = 2*origin.y - item.y; // simulate vFlip on item
        return itemsMoved && (y<MIN_Y || y>MAX_Y);
    }), [selectedNodes, origin, itemsMoved]);

    const canRotateCWBy45Deg: boolean = useMemo(() => testRotation(-45), [testRotation]);

    const canRotateCCWBy45Deg: boolean = useMemo(() => testRotation(45), [testRotation]);

    const canRotateCW: boolean = useMemo(() => testRotation(-(10**logIncrement)), [logIncrement, testRotation]);

    const canRotateCCW: boolean = useMemo(() => testRotation(10**logIncrement), [logIncrement, testRotation]);
    
    useHotkeys(hotkeyMap['copy'], copySelection, 
        { enabled: canCopy && !modalShown });
    useHotkeys(hotkeyMap['delete'], deleteSelection, 
        { enabled: canDelete && !modalShown });
    useHotkeys(hotkeyMap['clear points'], () => {setPoints(prev => []); setOrigin(true, []);}, 
        { enabled: !modalShown, preventDefault: true });
    useHotkeys(hotkeyMap['add nodes'], addEntityNodes, 
        { enabled: canAddENodes && !modalShown });
    useHotkeys(hotkeyMap['add contours'], addContours, 
        { enabled: canAddContours && !modalShown });
    useHotkeys(hotkeyMap['add labels'], () => createDepItem(depItemKeys.indexOf('lbl')),
        { enabled: canAddOrnaments && !modalShown });
    useHotkeys(hotkeyMap['move up'], () => moveSelection(0, 1), 
        { enabled: canMoveUp && !modalShown && focusItem!==null && (document.activeElement as HTMLElement).closest('.pasi')!==null, preventDefault: true });
    useHotkeys(hotkeyMap['move left'], () => moveSelection(-1, 0), 
        { enabled: canMoveLeft && !modalShown && focusItem!==null && (document.activeElement as HTMLElement).closest('.pasi')!==null, preventDefault: true });
    useHotkeys(hotkeyMap['move down'], () => moveSelection(0, -1), 
        { enabled: canMoveDown && !modalShown && focusItem!==null && (document.activeElement as HTMLElement).closest('.pasi')!==null, preventDefault: true });
    useHotkeys(hotkeyMap['move right'], () => moveSelection(1, 0), 
        { enabled: canMoveRight && !modalShown && focusItem!==null && (document.activeElement as HTMLElement).closest('.pasi')!==null, preventDefault: true });
    useHotkeys(hotkeyMap['set increment to 0.1px'], () => setLogIncrement(-1), 
        { enabled: !modalShown });
    useHotkeys(hotkeyMap['set increment to 1px'], () => setLogIncrement(0), 
        { enabled: !modalShown });
    useHotkeys(hotkeyMap['set increment to 10px'], () => setLogIncrement(1), 
        { enabled: !modalShown });
    useHotkeys(hotkeyMap['set increment to 100px'], () => setLogIncrement(2), 
        { enabled: !modalShown });
    useHotkeys(hotkeyMap['dec sh'], () => setShading(selectedNodes, -0.1, true), 
        { enabled: selectedNodes.length>0 && !modalShown });
    useHotkeys(hotkeyMap['inc sh'], () => setShading(selectedNodes, 0.1, true), 
        { enabled: selectedNodes.length>0 && !modalShown });
    useHotkeys(hotkeyMap['sh 0'], () => setShading(selectedNodes, 0), 
        { enabled: selectedNodes.length>0 && !modalShown });
    useHotkeys(hotkeyMap['sh 1'], () => setShading(selectedNodes, 1), 
        { enabled: selectedNodes.length>0 && !modalShown });
    useHotkeys(hotkeyMap['dec lw'], () => setLinewidth(selectedNodes, -0.1, true), 
        { enabled: selectedNodes.length>0 && !modalShown });
    useHotkeys(hotkeyMap['inc lw'], () => setLinewidth(selectedNodes, 0.1, true), 
        { enabled: selectedNodes.length>0 && !modalShown });
    useHotkeys(hotkeyMap['lw 0'], () => setLinewidth(selectedNodes, 0), 
        { enabled: selectedNodes.length>0 && !modalShown });
    useHotkeys(hotkeyMap['lw 1'], () => setLinewidth(selectedNodes, 1), 
        { enabled: selectedNodes.length>0 && !modalShown });
    useHotkeys(hotkeyMap['rotate by 45° counter-clockwise'], () => rotateSelection(45), 
        { enabled: canRotateCCWBy45Deg && !modalShown });
    useHotkeys(hotkeyMap['rotate by 45° clockwise'], () => rotateSelection(-45), 
        { enabled: canRotateCWBy45Deg && !modalShown });
    useHotkeys(hotkeyMap['rotate counter-clockwise'], () => rotateSelection(10 ** logIncrement), 
        { enabled: canRotateCCW && !modalShown });
    useHotkeys(hotkeyMap['rotate clockwise'], () => rotateSelection(-(10 ** logIncrement)), 
        { enabled: canRotateCW && !modalShown });
    useHotkeys(hotkeyMap['scale down'], () => scaleSelection(Math.max(0, scaling - 10 ** logIncrement)), 
        { enabled: !modalShown });
    useHotkeys(hotkeyMap['round'], roundLocations, 
        { enabled: selectedNodes.length>0 && !modalShown });
    useHotkeys(hotkeyMap['scale up'], () => scaleSelection(Math.min(MAX_SCALING, scaling + 10 ** logIncrement)), 
        { enabled: !modalShown });
    useHotkeys(hotkeyMap['hflip'], hFlip, 
        { enabled: canHFlip && !modalShown });
    useHotkeys(hotkeyMap['vflip'], vFlip, 
        { enabled: canVFlip && !modalShown });
    useHotkeys(hotkeyMap['polygons'], () => turnIntoRegularPolygons(selectedNodes), 
        { enabled: selectedNodes.some(i => i instanceof CNode) && !modalShown });
    useHotkeys(hotkeyMap['rotate by 180/n deg'], () => rotatePolygons(selectedNodes), 
        { enabled: selectedNodes.some(i => i instanceof CNode) && !modalShown });
    useHotkeys(hotkeyMap['create group'], createGroup, 
        { enabled: !modalShown });
    useHotkeys(hotkeyMap['leave'], leaveGroup, 
        { enabled: focusItem!==null && !modalShown });
    useHotkeys(hotkeyMap['rejoin'], rejoinGroup, 
        { enabled: focusItem!==null && !modalShown });
    useHotkeys(hotkeyMap['restore'], restoreGroup, 
        { enabled: !modalShown });
    useHotkeys(hotkeyMap['adding'], () => { setAdding(prev => true); setDissolveAdding(prev => false);}, 
        { enabled: focusItem!==null&& !modalShown });
    useHotkeys(hotkeyMap['dissolve-adding'], () => { setDissolveAdding(prev => true); setAdding(prev => false);}, 
        { enabled: focusItem!==null&& !modalShown });
    useHotkeys(hotkeyMap['generate code'], useThrottle(() => displayCode(unitscale), 500), 
        { enabled: () =>  !(document.activeElement instanceof HTMLButtonElement)&& !modalShown });
    useHotkeys(hotkeyMap['load diagram'], useThrottle(() => loadDiagram(code, replace), 500), 
        { enableOnFormTags: ['textarea'], preventDefault: true, enabled: !modalShown } );
    // 'Secret' hotkey:
    useHotkeys('mod+b', useThrottle(() => {setTrueBlack(prev => !trueBlack); toggleTrueBlack()}, 100));

    const showModal = (contentLabel: string, content: React.ReactNode, extraWide: boolean = false, title: string = contentLabel, ) => {
        setDialog(prev => ({ contentLabel, title, content, extraWide }));
        setModalShown(true);
    }

    const transformTabDisabled = selectedNodes.length===0;

    const groupTabDisabled = !focusItem;    
    
    const tabIndex = (userSelectedTabIndex===1 && transformTabDisabled) || (userSelectedTabIndex===2 && groupTabDisabled)? 0: userSelectedTabIndex;

     // The delete button gets some special colors:
    const deleteButtonStyle = clsx('rounded-xl', 
        (dark? 'bg-[#4a3228]/85 text-red-700 border-btnborder/50 enabled:hover:text-btnhovercolor enabled:hover:bg-btnhoverbg enabled:active:bg-btnactivebg enabled:active:text-black focus:ring-btnfocusring':
            'bg-pink-50/85 text-pink-600 border-pink-600/50 enabled:hover:text-pink-600 enabled:hover:bg-pink-200 enabled:active:bg-red-400 enabled:active:text-white focus:ring-pink-400'));

    const tabClassName = clsx('py-1 px-2 text-sm/6 bg-btnbg/85 text-btncolor border border-t-0 border-btnborder/50 data-[selected]:border-b-0 disabled:opacity-50 tracking-wider', 
        'focus:outline-none data-[selected]:bg-transparent data-[selected]:font-semibold data-[hover]:bg-btnhoverbg data-[hover]:text-btnhovercolor data-[hover]:font-semibold',
        'data-[selected]:data-[hover]:text-btncolor');

    console.log(clsx(`Rendering... listLength=${list.length}  focusItem=${focusItem && focusItem.id} (${focusItem instanceof Node && focusItem.x},`+
        `${focusItem instanceof Node && focusItem.y}) ha=${focusItem && highestActive(focusItem).getString()}`));
    //console.log(`Rendering... preselected=[${preselection.map(item => item.id).join(', ')}]`);

    return ( 
        <DarkModeContext.Provider value={dark}>
            <div id='main-panel' className='pasi flex my-8 p-6'> {/* We give this div the 'pasi' class to prevent certain css styles from taking effect. */}
                <div id='canvas-and-code' className='flex flex-col flex-grow scrollbox'
                        style={{minWidth: canvasWidth}}>
                    <div id='canvas' ref={canvasRef} className='canvas bg-canvasbg border-canvasborder h-[650px] relative overflow-auto border focus:outline-none'
                            tabIndex={0} // This makes the canvas focusable; and that's all the focus management we need to do.
                            onMouseDown={canvasMouseDown} >
                        {list.map((it, i) => 
                            it instanceof ENode?
                            <ENodeComp key={it.id} id={it.id} enode={it} 
                                yOffset={yOffset} 
                                unitscale={unitscale}
                                displayFontFactor={displayFontFactor}
                                bg={dark? CANVAS_HSL_DARK_MODE: CANVAS_HSL_LIGHT_MODE}
                                primaryColor={trueBlack? BLACK: dark? DEFAULT_HSL_DARK_MODE: DEFAULT_HSL_LIGHT_MODE}
                                markColor0={dark? MARK_COLOR0_DARK_MODE: MARK_COLOR0_LIGHT_MODE}
                                markColor1={dark? MARK_COLOR1_DARK_MODE: MARK_COLOR1_LIGHT_MODE}
                                titleColor={dark? MARK_COLOR1_DARK_MODE: MARK_COLOR1_LIGHT_MODE}  
                                focusItem={focusItem} 
                                selection={selection} 
                                preselection={preselection2}
                                onMouseDown={itemMouseDown}
                                onMouseEnter={itemMouseEnter} 
                                onMouseLeave={(item, e) => mouseLeft()} />:
                            it instanceof CNodeGroup? 
                            <CNodeGroupComp key={it.id} id={it.id} nodeGroup={it} 
                                focusItem={focusItem} 
                                preselection={preselection2}
                                selection={deduplicatedSelection}
                                allItems={allItems}
                                yOffset={yOffset} 
                                unitscale={unitscale}
                                displayFontFactor={displayFontFactor}
                                bg={dark? CANVAS_HSL_DARK_MODE: CANVAS_HSL_LIGHT_MODE}
                                primaryColor={trueBlack? BLACK: dark? DEFAULT_HSL_DARK_MODE: DEFAULT_HSL_LIGHT_MODE}
                                markColor={dark? MARK_COLOR0_DARK_MODE: MARK_COLOR0_LIGHT_MODE}
                                itemMouseDown={itemMouseDown}
                                itemMouseEnter={itemMouseEnter}
                                groupMouseDown={groupMouseDown}
                                groupMouseEnter={groupMouseEnter}
                                mouseLeft={mouseLeft}
                            />: 
                            null as never
                        )}
                        {points.map(point => 
                            <PointComp key={point.id} x={point.x} y={point.y - yOffset} 
                                primaryColor={dark? DEFAULT_HSL_DARK_MODE: DEFAULT_HSL_LIGHT_MODE}
                                markColor={dark? MARK_COLOR0_DARK_MODE: MARK_COLOR0_LIGHT_MODE} />
                        )}
                        <style> {/* We're using polylines for the 'mark borders' of items. Here is where we're animating them: */}
                            @keyframes oscillate {'{'} 0% {'{'} opacity: 1; {'}'} 50% {'{'} opacity: 0.1; {'}'} 100% {'{'} opacity: 1; {'}}'}
                            polyline {'{'} stroke-width: {`${MARK_LINEWIDTH}px`}; {'}'} 
                            .focused polyline {'{'} opacity: 1; animation: oscillate 1s infinite {'}'}
                            .selected polyline {'{'} opacity: 1; {'}'}
                            .preselected polyline {'{'} opacity: 0.65; transition: 0.15s; {'}'}
                            .unselected polyline {'{'} opacity: 0; {'}'}
                        </style>
                        {lasso && 
                            <svg width={lasso.x1 - lasso.x0 + MARK_LINEWIDTH * 2} height={lasso.y1 - lasso.y0 + MARK_LINEWIDTH * 2} 
                                    style={{position: 'absolute', 
                                        left: lasso.x0 - MARK_LINEWIDTH, 
                                        top: lasso.y0 - MARK_LINEWIDTH, marginTop: '-1px', marginLeft: '-1px'}}>
                                <rect x='1' y='1' width={lasso.x1 - lasso.x0} height={lasso.y1 - lasso.y0} 
                                    fill={lasso.deselect? (dark? LASSO_DESELECT_DARK_MODE: LASSO_DESELECT_LIGHT_MODE): 'none'}
                                    stroke={dark? LASSO_COLOR_DARK_MODE: LASSO_COLOR_LIGHT_MODE} strokeWidth = {MARK_LINEWIDTH} strokeDasharray={LASSO_DASH} />
                            </svg>
                        }
                        {/* Finally we add an invisible bottom-right 'limit point', which is needed to block automatic adjustment of canvas scrollbars during dragging: */}
                        {(yOffset!==0 || limit.x >= canvasWidth || limit.y <= 0) &&
                            <PointComp key={limit.id} 
                                x={limitCompX(limit.x, canvasRef.current, canvasWidth)} 
                                y={limitCompY(Math.min(0, limit.y) - yOffset, canvasRef.current)} 
                                primaryColor={DEFAULT_HSL_LIGHT_MODE}
                                markColor='red' visible={false} /> 
                        }
                    </div>
                    <canvas id='real-canvas' className='w-72 h-24 hidden'> 
                        {/* This canvas element helps Label components determine the 'true' height of a given piece of text. */}                    
                    </canvas>
                    <div id='code-panel' className='relative mt-[25px] h-[190px]' style={{minWidth: canvasWidth}}> 
                        <textarea 
                            className='codepanel w-full h-full p-2 shadow-inner text-sm focus:outline-none resize-none'
                            ref={codeRef}
                            value={code}
                            spellCheck={false}
                            onChange={(e) => setCode(e.target.value)} />
                        <CopyToClipboardButton id='copy-button' iconSize={6} textareaRef={codeRef} />
                    </div>
                </div>

                <div id='button-panels' className={clsx('flex-grow min-w-[315px] max-w-[380px] select-none')}>
                    <div id='button-panel-1' className='flex flex-col ml-[25px] h-[650px]'>
                        <div id='add-panel' className='grid grid-cols-2 mb-3'>
                            <BasicColoredButton id='node-button' label='Node' style='rounded-xl mr-1.5' 
                                tooltip={<>Create entity nodes at the selected locations.<HotkeyComp mapKey='add nodes' /></>}
                                tooltipPlacement='top'
                                disabled={!canAddENodes} onClick={addEntityNodes} />
                            <BasicColoredButton id='contour-button' label='Contour' style='rounded-xl' 
                                tooltip={<>Create contours at the selected locations.<HotkeyComp mapKey='add contours' /></>}
                                tooltipPlacement='top'
                                disabled={!canAddContours} onClick={addContours} />  
                        </div> 
                        <div id='di-panel' className='grid justify-items-stretch border border-btnborder/50 p-2 mb-3 rounded-xl'>
                            <Menu>
                                <MenuButton className={clsx('py-1.5', menuButtonClassName)}>
                                    <div className='flex-none mx-2'>
                                        {depItemInfos[depItemIndex].getImageComp(dark)}
                                    </div>
                                    <div className='flex-1'>
                                        {depItemInfos[depItemIndex].label}
                                    </div>
                                    <div className='flex-none w-[28px] mx-2'>
                                        <ChevronSVG />
                                    </div>
                                </MenuButton>
                                <MenuItemList>
                                    {depItemInfos.map((label, index) => 
                                        <MenuItem key={'di-'+index}>
                                            <button className={menuItemButtonClassName}
                                                    onClick={() => setDepItemIndex(index)}>
                                                <div className='inline mr-2'>
                                                    {label.getImageComp(dark)}
                                                </div>
                                                {label.label}
                                            </button>
                                        </MenuItem>
                                    )}
                                </MenuItemList>
                            </Menu>                
                            <BasicColoredButton id='create-button' label='Create' style='mt-2 rounded-md' 
                                disabled={!canCreateDepItem}
                                onClick={() => createDepItem(depItemIndex)} /> 
                        </div>
                        <BasicColoredButton id='combi-button' label='Copy selection' style='rounded-xl mb-4' 
                            tooltip={<>Copy selection.<HotkeyComp mapKey='copy' /></>}
                            tooltipPlacement='right'
                            disabled={!canCopy} onClick={copySelection} /> 
                        <TabGroup className='flex-1 w-full h-[402px] bg-btnbg/5 shadow-sm border border-btnborder/50 rounded-xl mb-3.5' 
                                selectedIndex={tabIndex} onChange={setUserSelectedTabIndex}>
                            <TabList className='grid grid-cols-10 mb-0.5'>
                                <Tab key='editor-tab'className={clsx(tabClassName, 'col-span-3 border-l-0 rounded-tl-xl data-[selected]:border-r-0', 
                                        tabIndex===1 && 'rounded-br-xl', tabIndex===2 && 'border-r-0')}>
                                    Editor
                                </Tab>
                                <Tab key='transform-tab' className={clsx(tabClassName, 'col-span-4 data-[selected]:border-x-0', 
                                            tabIndex===0 && 'border-l-[1px] rounded-bl-xl border-l-0', tabIndex==2 && 'border-r-[1px] rounded-br-xl border-r-0')} 
                                        disabled={transformTabDisabled}>
                                    Transform
                                </Tab>
                                <Tab key='group-tab' className={clsx(tabClassName, 'col-span-3 border-r-0 rounded-tr-xl data-[selected]:border-l-0', 
                                            tabIndex===0 && 'border-l-0', tabIndex===1 && 'rounded-bl-xl')} 
                                        disabled={groupTabDisabled}>
                                    Groups
                                </Tab>
                            </TabList>
                            <TabPanels className='flex-1 h-[364px] overflow-auto scrollbox'>
                                <TabPanel key='editor-panel' className='rounded-xl px-2 py-2 h-full'>
                                    {focusItem && itemChange?
                                        <ItemEditor info={focusItem.getInfo(list)} 
                                            logIncrement={logIncrement}
                                            onIncrementChange={(val) => setLogIncrement(val)}
                                            onChange={itemChange} />:
                                        <CanvasEditor grid={grid} hDisp={hDisplacement} vDisp={vDisplacement} displayFontFactor={displayFontFactor}
                                            changeHGap={(e) => setGrid(prevGrid => ({...prevGrid, hGap: validFloat(e.target.value, MIN_GAP, MAX_GAP)}))} 
                                            changeVGap={(e) => setGrid(prevGrid => ({...prevGrid, vGap: validFloat(e.target.value, MIN_GAP, MAX_GAP)}))} 
                                            changeHShift={(e) => setGrid(prevGrid => ({...prevGrid, hShift: validFloat(e.target.value, MIN_SHIFT, MAX_SHIFT)}))} 
                                            changeVShift={(e) => setGrid(prevGrid => ({...prevGrid, vShift: validFloat(e.target.value, MIN_SHIFT, MAX_SHIFT)}))} 
                                            changeSnapToNode={() => setGrid(prevGrid => ({...prevGrid, snapToNodes: !prevGrid.snapToNodes}))} 
                                            changeSnapToCC={() => setGrid(prevGrid => ({...prevGrid, snapToContourCenters: !prevGrid.snapToContourCenters}))} 
                                            changeHDisp={(e) => setHDisplacement(validFloat(e.target.value, MIN_DISPLACEMENT, MAX_DISPLACEMENT))} 
                                            changeVDisp={(e) => setVDisplacement(validFloat(e.target.value, MIN_DISPLACEMENT, MAX_DISPLACEMENT))} 
                                            changeDFF={changeDisplayFontFactor}
                                            reset={() => {
                                                setGrid(createGrid());
                                                setHDisplacement(DEFAULT_HDISPLACEMENT);
                                                setVDisplacement(DEFAULT_VDISPLACEMENT);
                                            }} />
                                    }
                                </TabPanel>
                                <TabPanel key='transform-panel' className='rounded-xl px-2 py-2'>
                                    <TransformTab rotation={rotation} scaling={scaling} 
                                        hFlipPossible={canHFlip} vFlipPossible={canVFlip} 
                                        logIncrements={logIncrements} transformFlags={transformFlags}
                                        testRotation={testRotation}
                                        rotate={rotateSelection}
                                        testScaling={testScaling}
                                        scale={scaleSelection}
                                        hFlip={hFlip}
                                        vFlip={vFlip} />
                                </TabPanel>
                                <TabPanel key='groups-panel' className="rounded-xl px-3 pt-3 pb-1">
                                    {focusItem &&
                                        <GroupTab item={focusItem} adding={adding} dissolveAdding={dissolveAdding} 
                                            create={createGroup} 
                                            leave={leaveGroup}
                                            rejoin={rejoinGroup}
                                            restore={restoreGroup}
                                            changeAdding={() => {
                                                const add = !adding;
                                                setAdding(add);
                                                if (add) setDissolveAdding(!add);
                                            }}
                                            changeDissolveAdding={() => {
                                                const add = !dissolveAdding;
                                                setDissolveAdding(add);
                                                if (add) setAdding(!add);
                                            }} />
                                    }
                                </TabPanel>
                            </TabPanels>
                        </TabGroup>
                        <div id='undo-panel' className='grid grid-cols-3'>
                            <BasicColoredButton id='undo-button' label='Undo' style='rounded-xl mr-1.5' tooltip='Undo'
                                disabled={false}
                                onClick={sorry} 
                                icon={ // source: https://heroicons.com/
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto">
                                        <g transform="rotate(-45 12 12)">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                                        </g>
                                    </svg>} />
                            <BasicColoredButton id='redo-button' label='Redo' style='rounded-xl mr-1.5' tooltip='Redo'
                                disabled={false}
                                onClick={sorry} 
                                icon={ // source: https://heroicons.com/
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto">
                                        <g transform="rotate(45 12 12)">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
                                        </g>
                                    </svg>} />
                            <BasicButton id='del-button' label='Delete' style={deleteButtonStyle} tooltip='Delete'
                                disabled={!canDelete} 
                                onClick={deleteSelection} 
                                icon={ // source: https://heroicons.com/
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>} />
                        </div>
                    </div>

                    <div id='button-panel-2' className='grid justify-items-stretch mt-[25px] ml-[25px]'>
                        <BasicColoredButton id='generate-button' label='Generate' style='rounded-xl mb-2 py-2' disabled={false} 
                            tooltip={<>Generate and display <i>texdraw</i> code.<HotkeyComp mapKey='generate code' /></>}
                            tooltipPlacement='right'
                            onClick={() => displayCode(unitscale)} />
                        <div className='flex items-center justify-end mb-4 px-4 py-1 text-sm'>
                            1 px = 
                            <input className='w-16 ml-1 pl-2 py-0.5 mr-1 text-right border border-btnborder rounded-md focus:outline-none bg-textfieldbg text-textfieldcolor'
                                type='number' min={MIN_UNITSCALE} step={0.01} value={unitscale}
                                onChange={changeUnitscale}/>
                            pt
                        </div>
                        <BasicColoredButton id='load-btton' label='Load' style='rounded-xl mb-2 py-2' disabled={false} 
                            tooltip={<>Load diagram from <i>texdraw</i> code.<HotkeyComp mapKey='load diagram' /></>}
                            tooltipPlacement='right'
                            onClick={() => loadDiagram(code, replace)} /> 
                        <CheckBoxField label='Replace current diagram' value={replace} onChange={()=>{setReplace(!replace)}} />
                    </div>

                    <Modal isOpen={modalShown} closeTimeoutMS={750}
                            onAfterOpen={() => setTimeout(() => okButtonRef.current?.focus(), 500)}
                            style={{
                                content: {                                    
                                    top: '50%',
                                    left: '50%',
                                    width: dialog.extraWide? '60rem': '40rem', // We use wider boxes to display more complex content.
                                    right: 'auto',
                                    bottom: 'auto',
                                    marginRight: '-50%',
                                    transform: 'translate(-50%, -50%)',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    padding: 'none'
                                  },
                            }}
                            overlayClassName={clsx('fixed inset-0', dark? 'bg-black/70':  'bg-gray-900/70')} 
                            contentLabel={dialog.contentLabel}
                            onRequestClose={() => {
                                document.body.classList.add('modal-closing');
                                setModalShown(false)
                            }}
                            onAfterClose={() => {
                                document.body.classList.remove('modal-closing')
                            }}>
                        <div className={clsx('prose prose-lg', dark? 'prose-dark': 'prose-light',
                                    dialog.extraWide? 'min-w-[60rem]': 'min-w-[40rem]',
                                    'grid justify-items-center bg-modalbg px-8 py-4 border border-btnfocusring rounded-2xl')}
                                onClick={(e) => okButtonRef.current?.focus()}>
                            {dialog.title && 
                                <div className='w-full text-center mb-4'>
                                    <h2 className='text-lg font-semibold mt-2 mb-0 py-2'>{dialog.title}</h2>
                                </div>
                            }
                            <div className='grid w-full justify-items-center text-center'>
                                {dialog.content}
                                <style>
                                    pre {'{'} text-align: left; {'}'}
                                </style>
                            </div>
                            <BasicColoredButton id='ok-button' ref={okButtonRef} label='OK' 
                                style={clsx('w-20 rounded-xl', dialog.title? 'mt-6 mb-4': 'mt-4 mb-2')} 
                                disabled={false}                              
                                onClick={() => {
                                    document.body.classList.add('modal-closing'); // This will tell any anchor elements visible under the Overlay to return to 
                                        // their original color.
                                    setModalShown(false)}
                                 } />
                        </div>
                    </Modal>
                </div>
            </div>
        </DarkModeContext.Provider>
    );
};

export default MainPanel;