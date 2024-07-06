import React, { useState, useRef, useEffect, useMemo, useCallback, createContext } from 'react'
import Modal from 'react-modal'
import { useHotkeys } from 'react-hotkeys-hook'
import { Tab, TabGroup, TabList, TabPanel, TabPanels, Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import NextImage, { StaticImageData } from 'next/image'
import clsx from 'clsx/lite'

import Item, { MAX_LINEWIDTH, MAX_DASH_VALUE, DEFAULT_HSL_LIGHT_MODE, DEFAULT_HSL_DARK_MODE } from './Item.tsx'
import { BasicButton, BasicColoredButton } from './Button.tsx'
import { CheckBoxField, validFloat, getCyclicValue } from './EditorComponents.tsx'
import CanvasEditor from './CanvasEditor.tsx'
import ItemEditor from './ItemEditor.tsx'
import TransformTab, { MIN_ROTATION_LOG_INCREMENT } from './TransformTab.tsx'
import GroupTab from './GroupTab.tsx'
import ENode, { ENodeComp, MAX_RADIUS } from './ENode.tsx'
import Point, { PointComp } from './Point.tsx'
import Group, { GroupMember, StandardGroup, getGroups, getLeafMembers, depth, MAX_GROUP_LEVEL } from './Group.tsx'
import CNode, { CNodeComp, MAX_NODEGROUP_SIZE, CNODE_MIN_DISTANCE_TO_NEXT_NODE_FOR_ARROW, DEFAULT_DISTANCE  } from './CNode.tsx'
import NodeGroup, { Contour, CONTOUR_CENTER_DIV_MAX_WIDTH, CONTOUR_CENTER_DIV_MAX_HEIGHT } from './NodeGroup.tsx'
import copy from './Copying'

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
export const W = 900; // the width of the canvas
export const MAX_X = 32*W-1 // the highest possible coordinate for an Item
export const MIN_Y = -16*H+1 // the lowest possible coordinate for an Item 
export const MAX_Y = 16*H-1 // the highest possible coordinate for an Item 
export const MARGIN = 0; // the width of the 'margin' at right and bottom edges of the canvas

const MAX_LIST_SIZE = 5000 // maximal size of the list of ENodes and NodeGroups

export const MARK_COLOR0_LIGHT_MODE = '#8877bb'
export const MARK_COLOR0_DARK_MODE = '#462d0c'
export const MARK_COLOR1_LIGHT_MODE = '#b0251a'
export const MARK_COLOR1_DARK_MODE = '#000000'
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
const LASSO_DESELECT_LIGHT_MODE = 'rgba(255, 255, 255, 0.5)'
const LASSO_DESELECT_DARK_MODE = 'rgba(0, 0, 0, 0.1)'

interface HotkeyInfo {
    key: string
    keys: string
    rep: string[]
    descr: JSX.Element
    descrDark?: JSX.Element
}

const scalingHotkeyDescrRump = (darkMode: boolean): JSX.Element => (
    <>
        the scaling of the selection by 10<sup><i>n</i></sup> percentage points, where <i>n</i>&thinsp; ranges from -1 to 2 {' '}
        (default: {DEFAULT_TRANSLATION_LOG_INCREMENT}) and is selected by the keys &thinsp;
        {darkMode? 
            <><span className='font-mono'>{1}</span>&ndash;<span className='font-mono'>{4}</span></>: 
            <><kbd>1</kbd>&thinsp;&ndash;&thinsp;<kbd>4</kbd>&thinsp;</>
        }
    </>
);

const scaleDownHotkeyDescr = (darkMode: boolean): JSX.Element => (
    <>Decreases {scalingHotkeyDescrRump(darkMode)}. The value of 100% corresponds to the size of the selection at the time it was initiated.</>
);

const scaleUpHotkeyDescr = (darkMode: boolean): JSX.Element => (
    <>Increases {scalingHotkeyDescrRump(darkMode)}.</>
);

export const hotkeys: HotkeyInfo[] = [
    { key: 'add nodes', keys: 'n', rep: ['N'], descr: <>Add entity nodes at selected locations.</> },
    { key: 'add contours', keys: 'm', rep: ['M'], descr: <>Add contours at selected locations.</> },
    { key: 'copy', keys: 'c', rep: ['C'], descr: <>Copy selection.</> },
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
    { key: 'inc lw', keys: '9', rep: ['9'], descr: <>Increase linewidth by 0.1 pixels.</> },
    { key: 'lw 0', keys: '0', rep: ['0'], descr: <>Set linewidth to 0.</> },
    { key: 'lw 1', keys: 'shift+0', rep: ['Shift+0'], descr: <>Set linewidth to 1 pixel.</> },
    { key: 'flip horizontally', keys: 'f', rep: ['F'], descr: <>Flip selection horizontally.</> },
    { key: 'flip vertically', keys: 'v', rep: ['V'], descr: <>Flip selection vertically.</> },
    { key: 'rotate counter-clockwise', keys: 'q', rep: ['Q'], descr: <>Rotate selection counter-clockwise by 45 degrees.</> },
    { key: 'rotate clockwise', keys: 'e', rep: ['E'], descr: <>Rotate selection clockwise by 45 degrees.</> },
    { key: 'rotate by 180/n deg', keys: 'r', rep: ['R'], descr: <>Rotate selected contours counter-clockwise by 180 / <i>n</i> degrees, where{' '}
        <i>n</i>&thinsp; is the number of nodes in the respective contour. (E.g., a contour with six nodes is rotated by 30 degrees.)</> },
    { key: 'scale down', keys: 'u', rep: ['U'], descr: scaleDownHotkeyDescr(false), descrDark: scaleDownHotkeyDescr(true) },
    { key: 'scale up', keys: 'i', rep: ['I'], descr: scaleUpHotkeyDescr(false), descrDark: scaleUpHotkeyDescr(true) },
    { key: 'polygons', keys: 'p', rep: ['P'], descr: <>Turn selected contours into regular polygons.</> },
    { key: 'delete', keys: 'delete, backspace', rep: ['Delete', 'Backspace'], descr: <>Delete selection.</> },
  ];

const hotkeyMap: Record<string, string> = hotkeys.reduce((acc, info) => {
    acc[info.key] = info.keys;
    return acc;
}, {} as Record<string, string>);


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
 * dragging, members of the selection (which is being dragged) have to be ignored. Same for the centers and members of NodeGroups containing the main ('focus') item that
 * is being dragged.
 */
const getSnapPoint = (x: number, y: number, grid: Grid, 
        list: (Item | NodeGroup)[], 
        focus: Item, 
        selection: Item[],
        dccDx: number | undefined, 
        dccDy: number | undefined
) => {
    let [rx, ry] = nearestGridPoint(x, y, grid),
        d = Math.sqrt(Math.pow(x-rx, 2) + Math.pow(y-ry, 2)),
        snappingToGrid = true;
    if (grid.snapToContourCenters || grid.snapToNodes) {
        for (const it of list) {
            if (it instanceof NodeGroup && (!(focus instanceof CNode) || !focus.fixedAngles || !it.members.includes(focus))) {
                const overlap = it.members.filter(m => selection.includes(m));
                if (grid.snapToContourCenters && overlap.length==0) {
                    const { minX, maxX, minY, maxY } = it.getBounds();
                    const cx = (minX+maxX)/2;
                    const cy = (minY+maxY)/2;
                    const dc = Math.sqrt(Math.pow(x-cx, 2) + Math.pow(y-cy, 2));
                    if (dc<d || (snappingToGrid && dc<CONTOUR_CENTER_SNAP_RADIUS)) {
                        snappingToGrid = false;
                        rx = cx;
                        ry = cy;
                        d = dc;
                    }
                    if (dccDx!==undefined && dccDy!==undefined) { // If we're dragging a contour, its center should snap to the centers of other contours.
                        const dx = x + dccDx - cx;
                        const dy = y + dccDy - cy;
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
        return item.getLeft() >= this.x0 && item.getLeft()+item.getWidth() <= this.x1 && 
            H+yOffset-item.getBottom() <= this.y1 && H+yOffset-(item.getBottom()+item.getHeight()) >= this.y0;  
    }
}

class DepItemLabel {       
    constructor(public label: string, public src: StaticImageData, public alt: string) {
    }    
    getImageComp(dark: boolean): React.ReactNode {
        return <NextImage src={this.src} alt={this.alt} width={28} 
            className={clsx('inline object-contain', (dark? 'filter invert sepia': ''))} />;    
    }
}

const labelItemLabel = new DepItemLabel('Label', lblSrc, 'A label attached to a node');
const depItemLabels = [
    new DepItemLabel('Broad tip', trnSrc, 'An arrow that has as its tip a closed, reflectionally symmetric figure'),
    new DepItemLabel('Broken line', negSrc, 'A line that is broken in the middle'),
    new DepItemLabel('Chevron', ptrSrc, 'A chevron-shaped ornament attached to a node'),
    new DepItemLabel('Dot', exsSrc, 'A square-shaped ornament attached to a node'),
    new DepItemLabel('Double hook, circular', insSrc, 'An arrow with two curved hooks, each being a segment of a circle'),
    new DepItemLabel('Double hook, curved', entSrc, 'An arrow with two curved hooks (cubic)'),
    new DepItemLabel('Double hook, straight', adjSrc, 'An arrow with two straight hooks'),
    new DepItemLabel('Harpoon', incSrc, 'An arrow with an asymmetric, harpoonlike tip'),
    labelItemLabel, // this will be the initial value
    new DepItemLabel('Round tip', cntSrc, 'A round-tipped arrow'),
    new DepItemLabel('Simple line', idtSrc, 'A simple line'),
    new DepItemLabel('Single hook, circular', unvSrc, 'An arrow with a single hook that is a segment of a circle'),
    new DepItemLabel('Single hook, composite', rstSrc, 'An arrow with a single hook that is made up of a cubic curve followed by a straight line'),
    new DepItemLabel('Single hook, curved', prdSrc, 'An arrow with a single curved hook (cubic)'),
    new DepItemLabel('Single hook, straight', orpSrc, 'An arrow with a single straight hook'),
];


/**
 * For n = 0,...,digits, rounds to nearest (10^n)th if the difference to that value is less than 10^-(n+5). Used for avoiding the compounding of slight rounding errors.
 */
export const round = (num: number, digits: number): number => { 
    for (let n = 0; n <= digits; n++) {
        const factor = 10 ** n;
        const e = 10 ** -(n + 5);
        const rounded = Math.round(num*factor) / factor;
        if (Math.abs(rounded-num) < e) return rounded;
    }
    return num;
}

/**
 * Rotates a point around another point by a given angle.
 * @returns The new coordinates {x, y} of the rotated point.
 */
const rotatePoint = (px: number, py: number, cx: number, cy: number, angle: number): { x: number, y: number } => {
    // Convert angle from degrees to radians
    const radians: number = angle * Math.PI / 180;

    // Translate point to origin
    const translatedX: number = px - cx;
    const translatedY: number = py - cy;

    // Rotate point, and apply rounding to get rid of tiny rounding errors that would otherwise accumulate:
    const rotatedX: number = round(translatedX * Math.cos(radians) - translatedY * Math.sin(radians), ROUNDING_DIGITS);
    const rotatedY: number = round(translatedX * Math.sin(radians) + translatedY * Math.cos(radians), ROUNDING_DIGITS);

    // Translate point back
    const finalX: number = rotatedX + cx;
    const finalY: number = rotatedY + cy;

    return { x: finalX, y: finalY };
}

/**
 * Scales a point around a specified origin by a given scale factor.
 * @returns The new coordinates {x, y} of the scaled point.
 */
const scalePoint = (px: number, py: number, ox: number, oy: number, scaleFactor: number): { x: number, y: number } => {
    // Translate point to the origin
    const translatedX = px - ox;
    const translatedY = py - oy;

    // Scale the point
    const scaledX = translatedX * scaleFactor;
    const scaledY = translatedY * scaleFactor;

    // Translate point back
    const finalX = scaledX + ox;
    const finalY = scaledY + oy;

    return { x: finalX, y: finalY };
}


const highestActive = (item: Item): Item | Group<any> => {
    const groups = getGroups(item)
    return groups[1]>-1? groups[0][groups[1]]: item
}


const getSelectPositions = (item: Item, selection: Item[]) => {
    let result: number[] = [];
    let index = 0;
    if(item instanceof ENode) {
        selection.forEach(element => {
            if(element===item) {
                result = [...result, index];
            }
            if(element instanceof ENode) { // if the element isn't an ENode, we're not counting it.
                index++;
            }
        });
    } 
    else { // Items that aren't ENodes don't need that much detail; just give them a [0] if they're included in the selection.
        if(selection.includes(item)) {
            result = [0];
        }
    }  
    return result;
}

/**
 * Used for computing the X coordinate of the limit component.
 */
const limitCompX = (limitX: number, canvas: HTMLDivElement | null) => {
    if (canvas) {
        const { scrollLeft } = canvas;
        const x = Math.min(Math.ceil(limitX/W)*W, MAX_X);
        return x<scrollLeft+SCROLL_X_OFFSET? x: Math.max(x, scrollLeft+W) + 
            (limitX>W? MARGIN: -40)  // The extra term is to provide a bit of margin and to avoid an unnecessary scroll bar.
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
        return y>H-scrollTop-SCROLL_Y_OFFSET? y: Math.min(y, -scrollTop) + 
            (limitY<0? -MARGIN: 40) // The extra term is to provide a bit of margin and to avoid an unnecessary scroll bar.
    } 
    else {
        return 0;
    }
}

const getNodes = (list: (ENode | NodeGroup)[], test: (item: Item) => boolean = it => true): Item[] => 
    list.flatMap((it: ENode | NodeGroup) => 
        it instanceof ENode? (test(it)? [it] : []): 
        (it.members as Item[]).filter(test));

/** 
 * Returns an array of the highest-level Groups (or Items) that would need to be copied, based on the supplied selection and array of
 * not-to-be-copied Items.
 */
const getTopToBeCopied = (selection: Item[], ntbc: Item[]) => {
    const result: (Item | Group<any>)[] = [];
    const ntbcContaining = new Set<Group<any>>(); // already-visited groups containing not-to-be copied nodes
    const nonNtbcContaining = new Set<Group<any>>(); // already-visited groups that do NOT contain any not-to-be-copied nodes
    selection.forEach(item => {
        const [groups, actIndex] = getGroups(item);
        let j = -1, // The index of that group, if some such group exists; -1 otherwise.
            visited = false;
        for (let i = 0; i<=actIndex; i++) { // We are looking for the lowest active group that has both item and a not-to-be-copied node among its leaf members.
            if (ntbcContaining.has(groups[i]) || nonNtbcContaining.has(groups[i])) {
                visited = true;
                break;
            }
            const ml = getLeafMembers(groups[i]);
            if (ntbc.some(item => ml.has(item))) {
                j = i;
                ntbcContaining.add(groups[i]);
                break;
            }
            nonNtbcContaining.add(groups[i]);
        }
        if (j<0 && !visited && actIndex>=0) { 
            // item has an active group, and no active group in its hierarchy contains not-to-be-copied nodes.
            result.push(groups[actIndex]);
        }
        else if (actIndex<0 || (j<1 && ntbcContaining.has(groups[0]))) {
            // Either item has no active group, or the group of which it is a direct member also contains a not-to-be-copied node.
            result.push(item);
        }
        else if (!visited && j>0) {
            // groups[j-1] is one level below the lowest active group in item's hierarchy that contains not-to-be-copied nodes.
            result.push(groups[j-1]);
        }
    });
    return result;
}

const getNodeGroups = (array: (Item | Group<any>)[]): NodeGroup[] =>
    array.reduce((acc: NodeGroup[], it) => 
        it instanceof Item? acc: 
        it instanceof NodeGroup? [...acc, it]:
        [...acc, ...getNodeGroups(it.members)], 
    []);

const purge = (group: Group<any>, list: (ENode | NodeGroup)[]): (ENode | NodeGroup)[] => {
    let newList = list;
    if (group instanceof NodeGroup) {
        // If group is a NodeGroup, we delete it from the list:
        newList = list.filter(it => it!==group);
    }
    if (group.group) {
        // An empty group is just useless baggage, so we also delete it from its own group:
        group.group.members = group.group.members.filter(m => m!==group);  
    }
    return newList;
}


interface MainPanelProps {
    dark: boolean;
}

const MainPanel = ({dark}: MainPanelProps) => {

    const canvasRef = useRef<HTMLDivElement>(null)
    const [depItemIndex, setDepItemIndex] = useState(depItemLabels.indexOf(labelItemLabel))
    const [pixel, setPixel] = useState(1.0)
    const [replace, setReplace] = useState(true)
    const [points, setPoints] = useState<Point[]>([])
    const [itemsMoved, setItemsMoved] = useState([]); // used to signal to the updaters of, e.g., canCopy that the positions of items may have changed.
    const [list, setList] = useState<(ENode | NodeGroup)[]>([])
    const [enodeCounter, setEnodeCounter] = useState(0) // used for generating keys
    const [nodeGroupCounter, setNodeGroupCounter] = useState(0) // used for generating keys
    const [selection, setSelection] = useState<Item[]>([]);// list of selected items; multiple occurrences are allowed    
    const [focusItem, setFocusItem] = useState<Item | null>(null) // the item that carries the 'focus', relevant for the editor pane
    const [yOffset, setYOffset] = useState(0);
    const [limit, setLimit] = useState<Point>(new Point(0,H)) // the current bottom-right corner of the 'occupied' area of the canvas (which can be adjusted by the user moving items around)

    const [grid, setGrid] = useState(createGrid())
    const [hDisplacement, setHDisplacement] = useState(DEFAULT_HDISPLACEMENT)
    const [vDisplacement, setVDisplacement] = useState(DEFAULT_VDISPLACEMENT)

    const [lasso, setLasso] = useState<Lasso | null>(null)
    const [dragging, setDragging] = useState(false)
    const [preselection1, setPreselection1] = useState<Item[]>([])
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

    const [adding, setAdding] = useState(false)
    const [dissolveAdding, setDissolveAdding] = useState(false)

    const [showModal, setShowModal] = useState(false)
    const [modalMsg, setModalMsg] = useState<[string, string]>(['', '']) // the first element is the content label, the second the message.

    useEffect(() => {
        const element = document.getElementById('content');
        if(element) Modal.setAppElement(element)
    }, []);

    const deduplicatedSelection = useMemo(() => 
        selection.filter((item, i) => i===selection.indexOf(item)), 
        [selection]
    );

    const leftMostSelected = useMemo(() => 
        deduplicatedSelection.reduce((min, item) => (min<item.x)? min: item.x, Infinity),
        [selection, itemsMoved]
    );

    const topMostSelected = useMemo(() => 
        deduplicatedSelection.reduce((max, item) => (max>item.y)? max: item.y, -Infinity),
        [selection, itemsMoved]
    );

    const rightMostSelected = useMemo(() => 
        deduplicatedSelection.reduce((max, item) => (max>item.x)? max: item.x, -Infinity),
        [selection, itemsMoved]
    );

    const bottomMostSelected = useMemo(() => 
        deduplicatedSelection.reduce((min, item) => (min<item.y)? min: item.y, Infinity),
        [selection, itemsMoved]
    );

    const allNodes = useMemo(() => getNodes(list), [list]);

    const topTbc: (Item | Group<any>)[] = useMemo(() => 
        getTopToBeCopied(deduplicatedSelection, allNodes.filter(item => !deduplicatedSelection.includes(item))),
        [deduplicatedSelection, allNodes]
    ); 

    const canCopy: boolean = useMemo(() => !(
            deduplicatedSelection.length<1 || 
            (list.length + deduplicatedSelection.length > MAX_LIST_SIZE && // If this isn't satisfied, we don't need to go into the details.
                list.length + 
                    deduplicatedSelection.reduce((acc, m) => m instanceof ENode? acc+1: acc, 0) +
                    getNodeGroups(topTbc).length > MAX_LIST_SIZE
            ) ||
            (() => {
                const tbcContainingNGs = topTbc.filter(it => it instanceof CNode).map(node => node.group);
                const dedupTbcContainingNGs = tbcContainingNGs.filter((g, i) => i===tbcContainingNGs.indexOf(g));
                return dedupTbcContainingNGs.some(group => group && 
                    group.members.length + tbcContainingNGs.reduce((acc, g) => g===group? acc+1: acc, 0) > MAX_NODEGROUP_SIZE)
            })() ||
            (hDisplacement<0 && leftMostSelected + hDisplacement < 0) ||
            (vDisplacement>0 && topMostSelected + vDisplacement > MAX_Y) ||
            (hDisplacement>0 && rightMostSelected + hDisplacement > MAX_X) ||
            (vDisplacement<0 && bottomMostSelected + vDisplacement < MIN_Y)
        ), [deduplicatedSelection, list, topTbc, leftMostSelected, rightMostSelected, topMostSelected, bottomMostSelected]  
    );

    const canDelete: boolean = selection.length>0;

    const canAddENodes: boolean = points.length>0 && list.length<MAX_LIST_SIZE;
    
    const canAddContours: boolean = points.length>0 && list.length<MAX_LIST_SIZE;

    const canMoveLeft: boolean = leftMostSelected - 10 ** logIncrement >= 0;

    const canMoveRight: boolean = rightMostSelected + 10 ** logIncrement <= MAX_X;

    const canMoveUp: boolean = topMostSelected + 10 ** logIncrement <= MAX_Y;

    const canMoveDown: boolean = bottomMostSelected - 10 ** logIncrement >= MIN_Y;

    const canHFlip: boolean = useMemo(() => !deduplicatedSelection.some(item => {
        const x = 2*origin.x - item.x; // simulate hFlip on item
        return x<0 || x>MAX_X;
    }), [deduplicatedSelection, origin, points, itemsMoved]);

    const canVFlip: boolean = useMemo(() => !deduplicatedSelection.some(item => {
        const y = 2*origin.y - item.y; // simulate vFlip on item
        return y<MIN_Y || y>MAX_Y;
    }), [deduplicatedSelection, origin, points, itemsMoved]);



    /**
     * Sets the origin point for transformations. This function should be called whenever we've changed the points, the selection, or the focusItem.
     * The first parameter indicates whether the transformation should be reset.
     */
    const setOrigin = useCallback((
            resetTransform: boolean, 
            pts: Point[] = points, 
            focus: Item | null = focusItem, 
            sel: Item[] = selection,
            l: (ENode | NodeGroup)[] = list
        ) => {
            // Compute new origin:
            const {x, y} = (pts.length>0)? pts[pts.length-1]: (focus?? ((sel.length>0)? sel[sel.length-1]: {x: 0, y: 0}))
            
            const originChanged = origin.x!==x || origin.y!==y;
            origin.x = x;
            origin.y = y;

            if(resetTransform && originChanged) {
                setRotation(0);
                setScaling(100);
                l.forEach(it => { // resetting the items for new scaling 
                    if (it instanceof NodeGroup) {
                        it.linewidth100 = it.linewidth;
                        it.dash100 = it.dash;
                    }
                    (it instanceof NodeGroup? it.members: [it]).forEach(item => {
                    item.x100 = item.x;
                    item.y100 = item.y;
                    if (item instanceof ENode) {
                        item.radius100 = item.radius;
                        item.linewidth100 = item.linewidth;
                        item.dash100 = item.dash;
                        }
                    else if (item instanceof CNode) {
                        item.dist0_100 = item.dist0;
                        item.dist1_100 = item.dist1;
                    }
                    });
                });
            }
        }, [points, focusItem, selection, list] // origin has no setter, so is not included.
    );
    
    const adjustLimit = useCallback((
            l: (ENode | NodeGroup)[] = list,
            yoff: number = yOffset,
            lim: Point = limit
        ) => {
            let top = 0,
                right = 0,
                bottom = H;
            l.forEach(it => {
                (it instanceof NodeGroup? it.members: [it]).forEach(item => {
                    if(item.y > top) {
                        top = item.y;
                    }
                    if(item.x > right) {
                        right = item.x;
                    }
                    if(item.y < bottom) {
                        bottom = item.y;
                    }
                });
            });
            const canvas = canvasRef.current;
            if (canvas) {
                const { scrollTop } = canvas;
                const delta1 = Math.max(0, top - H) - yoff;
                const delta2 = Math.ceil((delta1%H===0? delta1-1: delta1) / H) * H;
                const adjust = top<H? -yoff: (yoff + delta2 < scrollTop - SCROLL_Y_OFFSET || delta2>0)? delta2: Math.max(-scrollTop, delta2);
                if (adjust !== 0) {
                    setYOffset(yoff + adjust);
                    setTimeout(() => {
                        canvas.scrollBy(0, adjust);
                    }, 0);
                }
            }
            const newLimit = new Point(right, bottom);
            if (lim.x!==newLimit.x || lim.y!==newLimit.y) setLimit(newLimit); // set the new bottom-right limit
        }, [yOffset, list, limit]
    );

    const scrollTo = useCallback((item: Item, yoff: number = yOffset) => {
        const canvas = canvasRef.current;
        if (canvas) { // scroll to the position of focusItem, if there has been a change in position
            const dx = item.x - canvas.scrollLeft;
            const scrollRight = Math.floor((dx%W===0? dx-1: dx) / W) * W;
            const dy = canvas.scrollTop + item.y - yoff;
            const scrollDown = -Math.floor((dy%H===0? dy+1: dy) / H) * H;
            setTimeout(() => {
                canvas.scrollBy(scrollRight, scrollDown);
            }, 0);
        }
    }, [yOffset]);


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
            const newNodes = getNodes(list, (item: Item) => !prim.includes(item) && lm.has(item));
            setPreselection2(prev => [...prim, ...newNodes]);
        }, [preselection1, list]
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
    }, [selection, focusItem, points, deduplicatedSelection, list]);


    /**
     * Mouse down handler for items on the canvas.
     */
    const itemMouseDown = useCallback((
            item: Item, 
            e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>, 
            clearPreselection: boolean = true
        ) => { 
            e.stopPropagation();
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
                    if (!(group instanceof Item) && (group instanceof NodeGroup || (group!==itemToAdd && !group.members.includes(itemToAdd)))) {
                        if (itemToAdd instanceof Item) {
                            newSelection=[...selection, itemToAdd];
                        }
                        else {
                            const lm = getLeafMembers(itemToAdd);
                            newSelection=[...selection, item, ...getNodes(list, it => it!==item && !selection.includes(it) && lm.has(it))];
                        }
                        if (group!==itemToAdd && !group.members.includes(itemToAdd)) {
                            if (adding || itemToAdd instanceof Item) {
                                if (group instanceof NodeGroup && !(itemToAdd instanceof CNode)) {
                                    setModalMsg(['Alert', 'A contour node group can only have contour nodes as members.']);
                                    setShowModal(true);
                                    return;
                                }
                                else if (group instanceof NodeGroup && group.members.length>=MAX_NODEGROUP_SIZE) {
                                    setModalMsg(['Alert', `The maximum size of a contour node group is ${MAX_NODEGROUP_SIZE} nodes.`]);
                                    setShowModal(true);
                                    return;
                                }
                                else if (group instanceof StandardGroup && itemToAdd instanceof CNode) {
                                    setModalMsg(['Alert', 'A contour node can only be a member of a contour node group.']);
                                    setShowModal(true);
                                    return;
                                }
                                else {
                                    if (focusItem instanceof CNode && group instanceof NodeGroup) {
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
                                if (group instanceof NodeGroup && !(itemToAdd instanceof NodeGroup)) {
                                    setModalMsg(['Alert', 'A contour node group can only have contour nodes as members.']);
                                    setShowModal(true);
                                    return;
                                }
                                else if (group instanceof NodeGroup && group.members.length+itemToAdd.members.length>MAX_NODEGROUP_SIZE) {
                                    setModalMsg(['Alert', `The maximum size of a contour node group is ${MAX_NODEGROUP_SIZE} nodes.`]);
                                    setShowModal(true);
                                    return;
                                }
                                else if (group instanceof StandardGroup && itemToAdd instanceof NodeGroup) {
                                    setModalMsg(['Alert', 'A contour node can only be a member of a contour node group.']);
                                    setShowModal(true);
                                    return;
                                }
                                else {
                                    if (focusItem instanceof CNode && group instanceof NodeGroup) {
                                        const i = group.members.indexOf(focusItem); // the index after which to insert
                                        const j = itemToAdd.members.indexOf(item); // indicates the first node to be inserted
                                        const nodes = (itemToAdd as NodeGroup).members.slice(j).concat(itemToAdd.members.slice(0,j));
                                        group.members.splice(i+1, 0, ...nodes);
                                    }
                                    else {
                                        group.members.push(...itemToAdd.members);
                                    }
                                    itemToAdd.members.forEach(m => {m.group = group; m.isActiveMember = true});
                                    itemToAdd.members = [];
                                    if (itemToAdd instanceof NodeGroup) {
                                        // Since itemToAdd is now an empty NodeGroup, we delete it from the list:
                                        setList(prev => prev.filter(it => it!==itemToAdd));
                                    }
                                    if (itemToAdd.group) {
                                        itemToAdd.group.members = itemToAdd.group.members.filter(m => m!==itemToAdd);  
                                    }
                                }
                            }
                        }
                        else if (group instanceof NodeGroup) { // In this case, item must already be a member of group, just like focusItem.
                            let i = group.members.indexOf(focusItem as CNode),
                                j = group.members.indexOf(item as CNode),
                                newMembers: CNode[];
                            if (i<0 || j<0) {
                                console.log('Unexpectedly missing CNode');
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
                                const newGroup = new NodeGroup(nodeGroupCounter);
                                newGroup.members = newMembers;
                                setNodeGroupCounter(prev => prev+1);
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
                            if (item instanceof ENode || !selection.includes(item)) { // If item is a CNode, we don't add it twice.
                                newSelection = [...selection, item];
                            }
                        }
                        else {               
                            newSelection = [...selection, ...pres.filter(it => it instanceof ENode || !selection.includes(it))];
                        }
                    }
                    else { // replace selection
                        if (e.ctrlKey || pres.length===0) {
                            newSelection = [item];
                            // If ctrl was not pressed, then, for the case that the user clicks on this item again, we prepare the selection not just of item itself but of all members of its highest active group:
                            if (!e.ctrlKey) {
                                const ha = highestActive(item);
                                if (!(ha instanceof Item)) {
                                    setPreselection2(prev => ([...getLeafMembers(ha)] as Item[]));
                                    clearPreselection = false;
                                }
                            }
                        }
                        else { // The 'normal' case: we select the preselection.
                            newSelection = pres;
                        }
                        newPoints = [];
                    }
                }
                // Handle dragging:
                setDragging(true);
                const selectionWithoutDuplicates = newSelection.filter((item, i) => i===newSelection.indexOf(item));
                const contourDragged = item.group instanceof NodeGroup && item.group.members.every(m => selectionWithoutDuplicates.includes(m));
                let dccDx: number | undefined, 
                    dccDy: number | undefined; // distances (horizontal and vertical) to the center of the drgged contour (if there is one)
                if (contourDragged && item.group instanceof NodeGroup) { // The second conjunct should be unnecessary, but Typescript insists.
                    const { minX, maxX, minY, maxY } = item.group.getBounds();
                    const cx = (minX+maxX)/2;
                    const cy = (minY+maxY)/2;
                    dccDx = cx - item.x;
                    dccDy = cy - item.y;
                }
                const startX = e.clientX - item.x;
                const startY = e.clientY - (H + yOffset - item.y);
                const xMinD = item.x - selectionWithoutDuplicates.reduce((min, it) => it.x<min? it.x: min, item.x); // x-distance to the left-most selected item

                
                const handleMouseMove = (e: MouseEvent) => {
                    // First, we take into account the grid:
                    const [snapX, snapY] = getSnapPoint(e.clientX - startX, H + yOffset - e.clientY + startY, grid, newList, item, selectionWithoutDuplicates, dccDx, dccDy);
                    // Next, we have to prevent the enode, as well as the left-most selected item, from being dragged outside the 
                    // canvas to the left (from where they couldn't be recovered), and also respect the lmits of MAX_X, MAX_Y, and MIN_Y:
                    const x = Math.min(Math.max(snapX, xMinD), MAX_X);
                    const y = Math.min(Math.max(snapY, MIN_Y), MAX_Y);
                    const dx = x - item.x;
                    const dy = y - item.y;
                    // Finally, we move each item in the selection, if necessary:
                    if(dx!==0 || dy!==0) {
                        const nodeGroups: NodeGroup[] = []; // To keep track of the node groups whose members we've already moved.
                        selectionWithoutDuplicates.forEach(item => {
                            // console.log(`moving: ${item.id}`);
                            if (item.group instanceof NodeGroup) {
                                if (!nodeGroups.includes(item.group)) {
                                    nodeGroups.push(item.group);
                                    const members = item.group.members;
                                    (item.group as NodeGroup).groupMove(
                                        selectionWithoutDuplicates.filter(m => m instanceof CNode && members.includes(m)) as CNode[], 
                                        dx, 
                                        dy
                                    );
                                }
                            }
                            else if (item instanceof Item) {
                                item.move(dx, dy)
                            }
                        });
                        setPoints(prev=> [...prev]);  // to trigger a re-render 
                    }
                };            

                const handleMouseUp = () => {
                    window.removeEventListener('mousemove', handleMouseMove);
                    window.removeEventListener('mouseup', handleMouseUp);
                    setDragging(false);
                    adjustLimit(newList, yOffset, limit);
                    setOrigin(item!==focusItem && newPoints.length==0, newPoints, item, newSelection);
                    // If the focusItem is still the same or points is non-empty, then don't reset the transform (even if the origin has changed). However, if points is non-empty,
                    // then we have to 'renormalize' the new selection, since the nodes might have been dragged around the origin (given by the last element of the points array):
                    if(newPoints.length>0) newSelection.forEach(item => { 
                        item.x100 = origin.x + (item.x - origin.x) * 100/scaling;
                        item.y100 = origin.y + (item.y - origin.y) * 100/scaling;
                    });
                    // We also apply round() to get rid of tiny errors that might have been introduced during dragging.
                    newSelection.forEach(item => {
                        item.x = item.x100 = round(item.x, ROUNDING_DIGITS);
                        item.y = item.y100 = round(item.y, ROUNDING_DIGITS);
                    });
                    setItemsMoved(prev => [...prev]); // to signal to the updaters of, e.g., canCopy that the positions of items may have changed.
                }
            
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);

                setFocusItem(item);
                setList(newList);
                setPoints(newPoints);
                if (clearPreselection) {
                    setPreselection1([]);
                    setPreselection2([]);
                }
                setSelection(newSelection);
            }           
        }, [deduplicatedSelection, selection, points, list, adding, dissolveAdding, focusItem, yOffset, limit]
    );

    /**
     * Mouse down handler for contour center divs.
     */
    const groupMouseDown = (group: NodeGroup, e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>) => { 
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
        }, [dragging]
    );

    /**
     * Mouse enter handler for the contour center divs.
     */
    const groupMouseEnter = useCallback((
            group: NodeGroup, 
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
        }, [dragging]
    );

    /**
     * Mouse leave handler for ENodes, CNodes, and contour center divs.
     */
    const mouseLeft = useCallback(() => {
        if(!dragging) {
            setPreselection1(prev => []); 
            updateSecondaryPreselection([]);
        }
    }, [dragging]);

    /**
     * Mouse down handler for the canvas. Adds and removes Points and creates a lasso.
     */
    const canvasMouseDown = useCallback((
            e: React.MouseEvent<HTMLDivElement, MouseEvent>
        ) => { 
            const {left, top} = canvasRef.current?.getBoundingClientRect()?? {left: 0, top: 0};
            const {scrollLeft, scrollTop, clientWidth, clientHeight} = canvasRef.current?? {scrollLeft: 0, scrollTop:0, clientWidth: 0, clientHeight: 0};

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
                        ...getNodes(list, item => {
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
                        pres.forEach(item => { // 'renormalize' the items to be added to the selection:
                            item.x100 = origin.x + (item.x - origin.x) * 100/scaling;
                            item.y100 = origin.y + (item.y - origin.y) * 100/scaling;
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
        }, [selection, list, yOffset, focusItem, points, origin]
    );

    /**
     *  OnClick handler for the 'Node' button.
     */
    const addEntityNodes = useCallback(() => {
        if (points.length>0) {
            let counter = enodeCounter;
            const nodes = points.map((point, i) => new ENode(counter++, point.x, point.y));
            const newList = [...list, ...nodes];
            setEnodeCounter(counter);
            setList(list => newList);
            adjustLimit(newList, yOffset, limit); 
            const newFocus = nodes[nodes.length-1];
            setPoints([]);
            setSelection(nodes);
            setFocusItem(newFocus);
            setOrigin(true, [], newFocus, nodes);
        }
    }, [points, enodeCounter, list, yOffset, limit]);

    /**
     *  OnClick handler for the 'Contour' button.
     */
    const addContours = useCallback(() => { 
        if (points.length>0) {
            let counter = nodeGroupCounter;
            const newNodeGroups = points.map((point, i) => new NodeGroup(counter++, point.x, point.y));
            const newList = [...list, ...newNodeGroups];
            setNodeGroupCounter(counter);
            setList(list => newList);
            adjustLimit(newList, yOffset, limit); 
            const nodes = getNodes(newNodeGroups);
            const newFocus = nodes[nodes.length-1];
            setPoints([]);
            setSelection(nodes);
            setFocusItem(newFocus);
            setOrigin(true, [], newFocus, nodes);
        }
    }, [points, nodeGroupCounter, list, yOffset, limit]);

    /**
     * An array of the highest-level Groups and Items that will need to be copied if the 'Copy Selection' button is pressed. The same array is also used for 
     * the purposes of the 'Create Group' button in the GroupTab.
     */
    const copySelection = useCallback(() => {
        if (topTbc.length>0) {
            const copies: Record<string, ENode | NodeGroup> = {}; // This will store the keys of the copied ENodes and NodeGroups, mapped to their respective copies.
            const cNodeCopies: Record<string, CNode> = {}; // Same, but for the members of NodeGroups.
            const [enCounter, ngCounter] = copy(topTbc, hDisplacement, vDisplacement, copies, cNodeCopies, enodeCounter, nodeGroupCounter);
            const copiedList = list.reduce((acc: (ENode | NodeGroup)[], node) => { // an array that holds the copied nodes or node groups in the same 
                // order as list holds the nodes or node groups that they're copies of
                if (node.id in copies) {
                    acc.push(copies[node.id]);
                }
                return acc;
            }, []);
            const newSelection = selection.map(node => 
                node instanceof ENode? copies[node.id] as ENode: 
                node instanceof CNode? cNodeCopies[node.id]: null as never);
            const newList = [...list, ...copiedList];
            const newFocus = 
                focusItem instanceof ENode? copies[focusItem.id] as ENode: 
                focusItem instanceof CNode? cNodeCopies[focusItem.id]: null as never;
            adjustLimit(newList, yOffset, limit);
            setEnodeCounter(enCounter);
            setNodeGroupCounter(ngCounter);
            setList(newList);
            setFocusItem(prev => newFocus);
            setOrigin(true, points, newFocus, newSelection); 
            setSelection(newSelection);
            scrollTo(newFocus);
        }
    }, [topTbc, list, hDisplacement, vDisplacement, enodeCounter, nodeGroupCounter, selection, focusItem, yOffset, limit]);


    /**
     * OnClick handler for the delete button.
     */
    const deleteSelection = useCallback(() => { 
        if (deduplicatedSelection.length>0) {
            const newList: (ENode | NodeGroup)[]  = [];
            for (let it of list) {
                if (it instanceof ENode) {
                    if (!deduplicatedSelection.includes(it)) newList.push(it);
                }
                else if (it instanceof NodeGroup) {
                    const newMembers = it.members.filter(node => !deduplicatedSelection.includes(node));
                    if (newMembers.length>0) {
                        it.members = newMembers;
                        newList.push(it);
                    }                    
                }
            }
            const whitelist = new Set<Group<Item | Group<any>>>();
            newList.forEach(it => { // Whitelist each group that contains (directly or indirectly) a not-to-be-deleted node.
                if (it instanceof NodeGroup) { 
                    whitelist.add(it); // A NodeGroup is in newList only if it contains at least one not-to-be-deleted node.
                }
                getGroups(it)[0].forEach(g => whitelist.add(g));
            });
            whitelist.forEach(g => { // For each of those groups, filter out all the members that are either to-be-deleted nodes or non-whitelisted groups.
                if (!(g instanceof NodeGroup)) { // We ignore NodeGroups because their members are not in newList anyway.
                    g.members = g.members.filter(m => 
                            ((m instanceof ENode) && newList.includes(m)) || 
                            (!(m instanceof Item) && whitelist.has(m)));
                }
            });
            setList(newList);
            setSelection([]);
            setPreselection1([]);
            setPreselection2([]);
            setFocusItem(null);
            adjustLimit(newList, yOffset, limit);
            setOrigin(true, points, null, []);
        }
    }, [deduplicatedSelection, list, yOffset, limit]);


    /**
     * The callback function for the ItemEditor. Only needed if focusItem is not null. The ItemEditor will use this in constructing change handlers for its various child components. 
     * In particular, these handlers will call itemChange with an input element (or null) and a key that is obtained from the focusItem through Item.getInfo().
     */
    const itemChange = useCallback((e: React.ChangeEvent<HTMLInputElement> | null, key: string) => {
        if (focusItem) {
            const [edit, range] = focusItem.handleEditing(e, logIncrement, deduplicatedSelection, key);
            const nodeGroups: Set<NodeGroup> | null = range==='ENodesAndNodeGroups'? new Set<NodeGroup>(): null;
            const nodes = range=='onlyThis'? 
                edit(focusItem, list):
                deduplicatedSelection.reduce((acc: (ENode | NodeGroup)[], item: Item) => {
                        //console.log(`Editing item ${item.key}`);
                        if (item instanceof CNode && nodeGroups) {
                            if (nodeGroups.has(item.group as NodeGroup)) return acc;
                            else {
                                nodeGroups.add(item.group as NodeGroup);
                            }
                        }
                        return edit(item, acc) as (ENode | NodeGroup)[]
                }, list);
            setList(prev => nodes); // for some reason, the setter function is called twice here.
            adjustLimit(list, yOffset, limit);
            setOrigin(false, points, focusItem, selection, list);
            scrollTo(focusItem, yOffset);
            setItemsMoved(prev => [...prev]); 
        }
    }, [focusItem, logIncrement, deduplicatedSelection, selection, points, list, yOffset, limit]);  


    const adjustSelection = useCallback((item: Item) => {
        const ha = highestActive(item);
        if (ha instanceof Item) {
            setSelection([ha]);
        }
        else {
            const lm = getLeafMembers(ha, true);
            setSelection([item, ...getNodes(list, it => it!==item && lm.has(it))]);
        }
    }, [list]);

    /**
     * Moves the selection in one of the four cardinal directions, by an amount determined by itemEditorConfig.logIncrement.
     * To be called from hotkey handlers.
     */
    const moveSelection = useCallback((dirX: number, dirY: number) => {
        const inc = 10 ** logIncrement;
        deduplicatedSelection.forEach(item => {
            if (dirX!==0) item.x = item.x100 = round(item.x + dirX * inc, ROUNDING_DIGITS);
            if (dirY!==0) item.y = item.y100 = round(item.y + dirY * inc, ROUNDING_DIGITS);
        });
        adjustLimit(list, yOffset, limit);
        setOrigin(false, points, focusItem, selection, list);
        if (focusItem) scrollTo(focusItem, yOffset);
        setItemsMoved(prev => [...prev]);
    }, [logIncrement, deduplicatedSelection, focusItem, list, yOffset, limit, points, selection]);

    /**
     * Returns true if the rotation of the selection by the specified angle is within bounds.
     */
    const testRotation = useCallback((angle: number) => {
        for(const item of deduplicatedSelection) {
            const {x, y} = rotatePoint(item.x, item.y, origin.x, origin.y, angle);
            if (x<0 || x>MAX_X) return false;
            if (y<MIN_Y || y>MAX_Y) return false;
        }
        return true
    }, [deduplicatedSelection, origin]);

    /**
     * Returns true if setting the scaling of the selection to the specified angle doesn't violate any constraints on the placement, radius, etc. of nodes.
     * May display error messages.
     */
    const testScaling = useCallback((val: number) => {
        for (const item of deduplicatedSelection) {
            const {x, y} = scalePoint(item.x100, item.y100, origin.x, origin.y, val/100)
            if (!isFinite(x) || !isFinite(y)) {
                setModalMsg(['Buzz Lightyear alert', 
                    `Nodes cannot be sent to ${x==-Infinity || y==-Infinity? '(negative) ':''}infinity, or beyond.`]);
                setShowModal(true);
            }
            if (x<0 || x>MAX_X) return false;
            if (y<MIN_Y || y>MAX_Y) return false;
            if (transformFlags.scaleENodes && item instanceof ENode) {
                const v = item.radius100 * val/100;
                if(v<0 || v>MAX_RADIUS) return false;
            }
            if (transformFlags.scaleLinewidths) {
                const v = item.linewidth100 * val/100;
                if(v<0 || v>MAX_LINEWIDTH) return false;
            }
            if (transformFlags.scaleDash && item.dash100.some(l => {
                const v = l * val/100;
                return v<0 || v>MAX_DASH_VALUE;
            })) return false;
        }
        return true
    }, [deduplicatedSelection, origin]);    

    /**
     * Rotates the selection by the specified angle (in degrees).
     */
    const rotateSelection = useCallback((angle: number) => {
        deduplicatedSelection.forEach(item => {
            ({x: item.x, y: item.y} = rotatePoint(item.x, item.y, origin.x, origin.y, angle));
            ({x: item.x100, y: item.y100} = rotatePoint(item.x100, item.y100, origin.x, origin.y, angle))                              
        });
        adjustLimit(list, yOffset, limit);
        setRotation(prev => round(getCyclicValue(prev+angle, MIN_ROTATION, 360, 10 ** Math.max(0, -MIN_ROTATION_LOG_INCREMENT)), ROUNDING_DIGITS));
        setItemsMoved(prev => [...prev]);                                     
    }, [deduplicatedSelection, origin, list, yOffset, limit]);

    /**
     * Sets the scaling of the current selection to the indicated value, as a percentage of the respective 'original' size of the selected items.
     */
    const scaleSelection = useCallback((newValue: number) => {
        deduplicatedSelection.forEach(item => {
            ({x: item.x, y: item.y} = scalePoint(item.x100, item.y100, origin.x, origin.y, newValue/100));
            if (item instanceof CNode) {
                item.dist0 = item.dist0_100 * newValue/100;
                item.dist1 = item.dist1_100 * newValue/100;
            }
            else if (item instanceof ENode) {
                if (transformFlags.scaleENodes) item.radius = item.radius100 * newValue/100;
                if (transformFlags.scaleLinewidths) item.linewidth = item.linewidth100 * newValue/100;
                if (transformFlags.scaleDash) item.dash = item.dash100.map(l => l * newValue/100);
            }
        }); 
        const affectedNodeGroups: NodeGroup[] = deduplicatedSelection.filter(it => it instanceof CNode)
            .map(node => node.group) // An array of those NodeGroups that have members included in selection.  
            .filter((g, i, arr) => i===arr.indexOf(g)) as NodeGroup[]; 
        affectedNodeGroups.forEach(group => {
            if (group) {
                if (transformFlags.scaleLinewidths) group.linewidth = group.linewidth100 * newValue/100;
                if (transformFlags.scaleDash) group.dash = group.dash100.map(l => l * newValue/100);
            }
        });
        adjustLimit(list, yOffset, limit);
        setScaling(newValue);
        setItemsMoved(prev => [...prev]);                                     
    }, [deduplicatedSelection, origin, list, yOffset, limit]);

    const hFlip = useCallback(() => {
        deduplicatedSelection.forEach(item => {
            item.x = 2*origin.x - item.x;
            item.x100 = 2*origin.x - item.x100;
            if (item instanceof CNode) {
                item.angle0 = -item.angle0;
                item.angle1 = -item.angle1;
            }
        });
        adjustLimit(list, yOffset, limit);
        setItemsMoved(prev => [...prev]);                                     
    }, [deduplicatedSelection, origin, list, yOffset, limit]);

    const vFlip = useCallback(() => {
        deduplicatedSelection.forEach(item => {
            item.y = 2*origin.y - item.y;
            item.y100 = 2*origin.y - item.y100;
            if (item instanceof CNode) {
                item.angle0 = -item.angle0;
                item.angle1 = -item.angle1;
            }
        });
        adjustLimit(list, yOffset, limit);
        setItemsMoved(prev => [...prev]);                                     
    }, [deduplicatedSelection, origin, list, yOffset, limit]);

    /**
     * Turn all contours that have members in the supplied array into regular polygons.
     */
    const turnIntoRegularPolygons = useCallback((selection: Item[]) => {
        (selection.map(it => {
                if (it instanceof CNode) {
                    it.angle0 = it.angle1 = 0;
                    it.dist0 = it.dist0_100 = it.dist1 = it.dist1_100 = DEFAULT_DISTANCE;
                    return it.group;
                } 
                else return null;
            }).filter((g, i, arr) => g instanceof NodeGroup && i===arr.indexOf(g)) as NodeGroup[]
        ).forEach(g => {
            g.equalizeCentralAngles(g.members[0]);
            g.equalizeDistancesFromCenter(g.members[0]);
        });
        setItemsMoved(prev => [...prev]);
    }, []);

    /**
     * Rotate all contours that have members in the supplied array by 180/n degrees, where n is the number of nodes in the respective contour.
     */
    const rotatePolygons = useCallback((selection: Item[]) => {
        (selection.map(it => it instanceof CNode? it.group: null)
            .filter((g, i, arr) => g instanceof NodeGroup && i===arr.indexOf(g)) as NodeGroup[]
        ).forEach(g => {
            const c = g.getNodalCenter();
            const angle = 180 / g.members.length;
            g.members.forEach(node => {
                ({x: node.x, y: node.y} = rotatePoint(node.x, node.y, c.x, c.y, angle));
                ({x: node.x100, y: node.y100} = rotatePoint(node.x100, node.y100, c.x, c.y, angle));
            });
        });
        setItemsMoved(prev => [...prev]);
    }, []);

    /**
     * Either sets or increases/decreases the shading of the selected nodes, depending on whether the third argument is true.
     */
    const setShading = useCallback((selection: Item[], val: number, inc: boolean = false) => {
        selection.map(it => it.group instanceof NodeGroup? it.group: it)
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
    const setLinewidth = useCallback((selection: Item[], val: number, inc: boolean = false) => {
        selection.map(it => it.group instanceof NodeGroup? it.group: it)
        .filter((it, i, arr) => i===arr.indexOf(it))
        .forEach(obj => {
            const newLw = Math.min(Math.max(inc? round(obj.linewidth + val, ROUNDING_DIGITS): val, 0), MAX_LINEWIDTH);
            obj.linewidth = obj.linewidth100 = newLw;
        });
        setPoints(prev => [...prev]); // to trigger a re-render
    }, []);

    const canRotateCWBy45Deg = useMemo(() => testRotation(-45), [deduplicatedSelection, points, focusItem, itemsMoved]);

    const canRotateCCWBy45Deg = useMemo(() => testRotation(45), [deduplicatedSelection, points, focusItem, itemsMoved]);

    const canScaleUp = useMemo(() => testScaling(Math.min(MAX_SCALING, scaling + 10 ** logIncrement)), [deduplicatedSelection, points, focusItem, itemsMoved]);
    
    useHotkeys(hotkeyMap['copy'], copySelection, { enabled: canCopy });
    useHotkeys(hotkeyMap['delete'], deleteSelection, { enabled: canDelete });
    useHotkeys(hotkeyMap['add nodes'], addEntityNodes, { enabled: canAddENodes });
    useHotkeys(hotkeyMap['add contours'], addContours, { enabled: canAddContours });
    useHotkeys(hotkeyMap['move up'], () => moveSelection(0, 1), { enabled: canMoveUp });
    useHotkeys(hotkeyMap['move left'], () => moveSelection(-1, 0), { enabled: canMoveLeft });
    useHotkeys(hotkeyMap['move down'], () => moveSelection(0, -1), { enabled: canMoveDown });
    useHotkeys(hotkeyMap['move right'], () => moveSelection(1, 0), { enabled: canMoveRight });
    useHotkeys(hotkeyMap['set increment to 0.1px'], () => setLogIncrement(-1));
    useHotkeys(hotkeyMap['set increment to 1px'], () => setLogIncrement(0));
    useHotkeys(hotkeyMap['set increment to 10px'], () => setLogIncrement(1));
    useHotkeys(hotkeyMap['set increment to 100px'], () => setLogIncrement(2));
    useHotkeys(hotkeyMap['dec sh'], () => setShading(deduplicatedSelection, -0.1, true), { enabled: deduplicatedSelection.length>0 });
    useHotkeys(hotkeyMap['inc sh'], () => setShading(deduplicatedSelection, 0.1, true), { enabled: deduplicatedSelection.length>0 });
    useHotkeys(hotkeyMap['sh 0'], () => setShading(deduplicatedSelection, 0), { enabled: deduplicatedSelection.length>0 });
    useHotkeys(hotkeyMap['sh 1'], () => setShading(deduplicatedSelection, 1), { enabled: deduplicatedSelection.length>0 });
    useHotkeys(hotkeyMap['dec lw'], () => setLinewidth(deduplicatedSelection, -0.1, true), { enabled: deduplicatedSelection.length>0 });
    useHotkeys(hotkeyMap['inc lw'], () => setLinewidth(deduplicatedSelection, 0.1, true), { enabled: deduplicatedSelection.length>0 });
    useHotkeys(hotkeyMap['lw 0'], () => setLinewidth(deduplicatedSelection, 0), { enabled: deduplicatedSelection.length>0 });
    useHotkeys(hotkeyMap['lw 1'], () => setLinewidth(deduplicatedSelection, 1), { enabled: deduplicatedSelection.length>0 });
    useHotkeys(hotkeyMap['rotate counter-clockwise'], () => rotateSelection(45), { enabled: canRotateCCWBy45Deg });
    useHotkeys(hotkeyMap['rotate clockwise'], () => rotateSelection(-45), { enabled: canRotateCWBy45Deg });
    useHotkeys(hotkeyMap['scale down'], () => scaleSelection(Math.max(0, scaling - 10 ** logIncrement)));
    useHotkeys(hotkeyMap['scale up'], () => scaleSelection(Math.min(MAX_SCALING, scaling + 10 ** logIncrement)), { enabled: canScaleUp });
    useHotkeys(hotkeyMap['flip horizontally'], hFlip, { enabled: canHFlip });
    useHotkeys(hotkeyMap['flip vertically'], vFlip, { enabled: canVFlip });
    useHotkeys(hotkeyMap['polygons'], () => turnIntoRegularPolygons(deduplicatedSelection), { enabled: deduplicatedSelection.some(i => i instanceof CNode) });
    useHotkeys(hotkeyMap['rotate by 180/n deg'], () => rotatePolygons(deduplicatedSelection), { enabled: deduplicatedSelection.some(i => i instanceof CNode) });
    
    
    const tabIndex = selection.length==0? 0: userSelectedTabIndex;

     // The delete button gets some special colors:
    const deleteButtonStyle = clsx('rounded-xl', 
        (dark? 'bg-[#55403c]/85 text-red-700 border-btnborder/50 enabled:hover:text-btnhovercolor enabled:hover:bg-btnhoverbg enabled:active:bg-btnactivebg enabled:active:text-black focus:ring-btnfocusring':
            'bg-pink-50/85 text-pink-600 border-pink-600/50 enabled:hover:text-pink-600 enabled:hover:bg-pink-200 enabled:active:bg-red-400 enabled:active:text-white focus:ring-pink-400'));

    const tabClassName = clsx('py-1 px-2 text-sm/6 bg-btnbg/85 text-btncolor border border-t-0 border-btnborder/50 data-[selected]:border-b-0 disabled:opacity-50 tracking-wider', 
        'focus:outline-none data-[selected]:bg-transparent data-[selected]:font-semibold data-[hover]:bg-btnhoverbg data-[hover]:text-btnhovercolor data-[hover]:font-semibold',
        'data-[selected]:data-[hover]:text-btncolor');

    const sorry = () => {setModalMsg(['Apology', 'Sorry, this feature has not yet been implemented!']); setShowModal(true);}

    console.log(clsx(`Rendering... listLength=${list.length}  focusItem=${focusItem && focusItem.id} (${focusItem && focusItem.x},${focusItem && focusItem.y})`,
        `ha=${focusItem && highestActive(focusItem).getString()}`));
    //console.log(`Rendering... preselected=[${preselection.map(item => item.id).join(', ')}]`);

    return ( // We give this div the 'pasi' class to prevent certain css styles from taking effect:
        <DarkModeContext.Provider value={dark}>
            <div id='main-panel' className='pasi flex my-8 p-6'> 
                <div id='canvas-and-code' className='flex flex-col flex-grow scrollbox min-w-[900px] max-w-[1200px] '>
                    <div id='canvas' ref={canvasRef} className='bg-canvasbg border-canvasborder h-[650px] relative overflow-auto border'
                            onMouseDown={canvasMouseDown} >
                        {list.flatMap((it, i) => 
                            it instanceof ENode?
                            [<ENodeComp key={it.id} id={it.id} enode={it} yOffset={yOffset} bg={dark? CANVAS_HSL_DARK_MODE: CANVAS_HSL_LIGHT_MODE}
                                primaryColor={dark? DEFAULT_HSL_DARK_MODE: DEFAULT_HSL_LIGHT_MODE}
                                markColor={dark? MARK_COLOR1_DARK_MODE: MARK_COLOR1_LIGHT_MODE}
                                titleColor={dark && it.shading<0.5? MARK_COLOR1_DARK_MODE: MARK_COLOR1_LIGHT_MODE}  // a little hack to ensure that the 'titles' of nodes remain visible when the nodes become heavily shaded
                                focus={focusItem===it} 
                                selected={getSelectPositions(it, selection)} 
                                preselected={preselection2.includes(it)}
                                onMouseDown={itemMouseDown}
                                onMouseEnter={itemMouseEnter} 
                                onMouseLeave={(item, e) => mouseLeft()} />]
                            :
                            it instanceof NodeGroup? (() => {
                                const centerDivClickable = !allNodes.some(item => {
                                    if (item instanceof ENode || item instanceof CNode) {
                                        const r = item.radius;
                                        const { minX, maxX, minY, maxY } = it.getBounds();
                                        const gx = (minX+maxX)/2;
                                        const gy = (minY+maxY)/2;
                                        const { x, y } = item;
                                        return Math.abs(gx-x)+r < CONTOUR_CENTER_DIV_MAX_WIDTH/2 && Math.abs(gy-y)+r < CONTOUR_CENTER_DIV_MAX_HEIGHT/2;
                                    }
                                    else {
                                        return false;
                                    }
                                });
                                // Space permitting, we arrange for one or more of the CNodeComps to be decorated by an arrow that will give the user an idea of what is meant by 'next node' and 'previous node' in the tooltips
                                // and elsewhere in the UI. But, to avoid clutter, only one CNodeComp per run of selected or preselected nodes should be decorated in this way.
                                let allSelected = true,
                                    someSelected = false,
                                    allPreselected = true;
                                const selectedNodes = it.members.map(m => {
                                    if (deduplicatedSelection.includes(m)) return someSelected = true;
                                    else return allSelected = false;
                                });
                                const preselectedNodes = it.members.map(m => {
                                    if (preselection2.includes(m)) return true;
                                    else return allPreselected = false
                                });
                                const last = it.members.length-1;
                                const arrowNodes: boolean[] = new Array(last+1).fill(false);
                                let defer = false;
                                for (let i = 0; i<=1 && (i==0 || defer); i++) {
                                    for (let j = 0; j<=last && (i==0 || defer); j++) {
                                        const node = it.members[j];
                                        const selected = selectedNodes[j];
                                        const preselected = preselectedNodes[j];
                                        const next = it.members[j==last? 0: j+1];
                                        const d = Math.sqrt((node.x - next.x) ** 2 + (node.y - next.y) ** 2);                            
                                        const arrow = (selected && (defer || (allSelected && j==0) || (!allSelected && !selectedNodes[j==0? last: j-1]))) ||
                                            (preselected && (defer || (!someSelected && allPreselected && j==0) || (!allPreselected && !preselectedNodes[j==0? last: j-1])));
                                        if (arrow && d<CNODE_MIN_DISTANCE_TO_NEXT_NODE_FOR_ARROW) {
                                            defer = true;
                                        }
                                        else {
                                            defer = false;
                                        }
                                        arrowNodes[j] = arrow && !defer;
                                    }
                                }
                                return [
                                    <Contour key={it.id} id={it.id+'Contour'} group={it} yOffset={yOffset} 
                                        selected={selectedNodes.some(b => b)}
                                        preselected={preselectedNodes.some(b => b)}
                                        bg={dark? CANVAS_HSL_DARK_MODE: CANVAS_HSL_LIGHT_MODE} 
                                        primaryColor={dark? DEFAULT_HSL_DARK_MODE: DEFAULT_HSL_LIGHT_MODE} 
                                        markColor={dark? MARK_COLOR0_DARK_MODE: MARK_COLOR0_LIGHT_MODE} 
                                        centerDivClickable={centerDivClickable}
                                        showCenterDiv={focusItem instanceof CNode && focusItem.fixedAngles && it.members.includes(focusItem)}
                                        onMouseDown={groupMouseDown}
                                        onMouseEnter={groupMouseEnter} 
                                        onMouseLeave={(group, e) => mouseLeft()} />, 
                                    ...it.members.map((node, i) => {
                                        return <CNodeComp key={node.id} id={node.id} cnode={node} yOffset={yOffset} 
                                            markColor={dark? MARK_COLOR0_DARK_MODE: MARK_COLOR0_LIGHT_MODE}
                                            focus={focusItem===node}
                                            selected={selectedNodes[i]}
                                            preselected={preselectedNodes[i]}
                                            arrow={arrowNodes[i]}
                                            onMouseDown={itemMouseDown}
                                            onMouseEnter={itemMouseEnter} 
                                            onMouseLeave={(item, e) => mouseLeft()} />
                                    })
                                ]})()
                            : null as never)}
                        {points.map(point => 
                            <PointComp key={point.id} x={point.x} y={point.y - yOffset} 
                                primaryColor={dark? DEFAULT_HSL_DARK_MODE: DEFAULT_HSL_LIGHT_MODE}
                                markColor={dark? MARK_COLOR0_DARK_MODE: MARK_COLOR0_LIGHT_MODE} />)}
                        <style> {/* we're using polylines for the 'mark borders' of items */}
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
                        {(yOffset!==0 || limit.x>=W || limit.y<=0) &&
                            <PointComp key={limit.id} 
                                x={limitCompX(limit.x, canvasRef.current)} 
                                y={limitCompY(Math.min(0, limit.y) - yOffset, canvasRef.current)} 
                                primaryColor={DEFAULT_HSL_LIGHT_MODE}
                                markColor='red' visible={false} /> 
                        }
                    </div>
                    <div id='code-panel' className='bg-codepanelbg text-codepanelcolor min-w-[900px] h-[190px] mt-[25px] shadow-inner'>
                    </div>
                </div>
                <div id='button-panels' className={clsx('flex-grow min-w-[300px] max-w-[380px] select-none')}>
                    <div id='button-panel-1' className='flex flex-col ml-[25px] h-[650px]'>
                        <div id='add-panel' className='grid grid-cols-2 mb-3'>
                            <BasicColoredButton id='node-button' label='Node' style='rounded-xl mr-1.5' 
                                tooltip={<>Add entity nodes at the selected locations.<br />Hotkey: <kbd>N</kbd></>}
                                tooltipPlacement='top'
                                disabled={!canAddENodes} onClick={addEntityNodes} />
                            <BasicColoredButton id='contour-button' label='Contour' style='rounded-xl' 
                                tooltip={<>Add contours at the selected locations.<br />Hotkey: <kbd>M</kbd></>}
                                tooltipPlacement='top'
                                disabled={!canAddContours} onClick={addContours} />  
                        </div>                    

                        <div id='di-panel' className='grid justify-items-stretch border border-btnborder/50 p-2 mb-3 rounded-xl'>
                            <Menu>
                                <MenuButton className='group inline-flex items-center gap-2 mb-2 rounded-md bg-btnbg/85 px-4 py-1.5 text-sm text-btncolor shadow-inner 
                                            focus:outline-none data-[hover]:bg-btnhoverbg data-[hover]:text-btnhovercolor data-[open]:bg-btnhoverbg data-[open]:text-btnhovercolor data-[focus]:outline-1 data-[focus]:outline-btnhoverbg'>
                                    <div className='flex-none text-left mr-2'>
                                        {depItemLabels[depItemIndex].getImageComp(dark)}
                                    </div>
                                    <div className='flex-1'>
                                        {depItemLabels[depItemIndex].label}
                                    </div>
                                    <div className='flex-none w-[28px] ml-2 text-right'> 
                                        <svg className='size-4' // source: https://heroicons.com/
                                            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                        </svg>                             
                                    </div> 
                                </MenuButton>
                                <Transition
                                        enter='transition ease-out duration-75'
                                        enterFrom='opacity-0 scale-95'
                                        enterTo='opacity-100 scale-100'
                                        leave='transition ease-in duration-100'
                                        leaveFrom='opacity-100 scale-100'
                                        leaveTo='opacity-0 scale-95'>
                                    <MenuItems
                                            anchor='bottom end'
                                            className='menu w-72 origin-top-right rounded-md border border-menuborder bg-btnbg/20 p-1 text-sm text-btncolor [--anchor-gap:var(--spacing-1)] focus:outline-none'>
                                        {depItemLabels.map((label, index) => 
                                            <MenuItem key={'di-'+index}>
                                                <button className="group flex w-full items-center gap-2 rounded-sm px-2 py-1 data-[focus]:bg-btnhoverbg data-[focus]:text-btnhovercolor" onClick={() => setDepItemIndex(index)}>
                                                    <div className='inline mr-2'>
                                                        {label.getImageComp(dark)}
                                                    </div>
                                                    {label.label}
                                                </button>
                                            </MenuItem>
                                        )}
                                    </MenuItems>
                                </Transition>
                            </Menu>                
                            <BasicColoredButton id='create-button' label='Create' style='rounded-md' disabled={false} onClick={sorry} /> 
                        </div>
                        <BasicColoredButton id='combi-button' label='Copy selection' style='rounded-xl mb-4' 
                            tooltip={<>Copy the selection.<br />Hotkey: <kbd>C</kbd></>}
                            tooltipPlacement='right'
                            disabled={!canCopy} onClick={copySelection} /> 

                        <TabGroup className='flex-1 w-[275px] h-[402px] bg-btnbg/5 shadow-sm border border-btnborder/50 rounded-xl mb-3.5' 
                                selectedIndex={tabIndex} onChange={setUserSelectedTabIndex}>
                            <TabList className="grid grid-cols-10 mb-0.5">
                                <Tab key='editor-tab'className={clsx(tabClassName, 'col-span-3 border-l-0 rounded-tl-xl data-[selected]:border-r-0', 
                                        tabIndex===1 && 'rounded-br-xl', tabIndex===2 && 'border-r-0')}>
                                    Editor
                                </Tab>
                                <Tab key='transform-tab' className={clsx(tabClassName, 'col-span-4 data-[selected]:border-x-0', 
                                            tabIndex===0 && 'border-l-[1px] rounded-bl-xl border-l-0', tabIndex==2 && 'border-r-[1px] rounded-br-xl border-r-0')} 
                                        disabled={selection.length==0}>
                                    Transform
                                </Tab>
                                <Tab key='group-tab' className={clsx(tabClassName, 'col-span-3 border-r-0 rounded-tr-xl data-[selected]:border-l-0', 
                                            tabIndex===0 && 'border-l-0', tabIndex===1 && 'rounded-bl-xl')} 
                                        disabled={!focusItem}>
                                    Groups
                                </Tab>
                            </TabList>
                            <TabPanels className='flex-1 h-[364px] overflow-auto scrollbox'>
                                <TabPanel key='editor-panel' className='rounded-xl px-2 py-1 h-full'>
                                    {focusItem && itemChange?
                                        <ItemEditor info={focusItem.getInfo(list)} 
                                            logIncrement={logIncrement}
                                            onIncrementChange={(val) => setLogIncrement(val)}
                                            onChange={itemChange} />:
                                        <CanvasEditor grid={grid} hDisp={hDisplacement} vDisp={vDisplacement}
                                            changeHGap={(e) => setGrid(prevGrid => ({...prevGrid, hGap: validFloat(e.target.value, MIN_GAP, MAX_GAP)}))} 
                                            changeVGap={(e) => setGrid(prevGrid => ({...prevGrid, vGap: validFloat(e.target.value, MIN_GAP, MAX_GAP)}))} 
                                            changeHShift={(e) => setGrid(prevGrid => ({...prevGrid, hShift: validFloat(e.target.value, MIN_SHIFT, MAX_SHIFT)}))} 
                                            changeVShift={(e) => setGrid(prevGrid => ({...prevGrid, vShift: validFloat(e.target.value, MIN_SHIFT, MAX_SHIFT)}))} 
                                            changeSnapToNode={() => setGrid(prevGrid => ({...prevGrid, snapToNodes: !prevGrid.snapToNodes}))} 
                                            changeSnapToCC={() => setGrid(prevGrid => ({...prevGrid, snapToContourCenters: !prevGrid.snapToContourCenters}))} 
                                            changeHDisp={(e) => setHDisplacement(validFloat(e.target.value, MIN_DISPLACEMENT, MAX_DISPLACEMENT))} 
                                            changeVDisp={(e) => setVDisplacement(validFloat(e.target.value, MIN_DISPLACEMENT, MAX_DISPLACEMENT))} 
                                            reset={() => {
                                                setGrid(createGrid());
                                                setHDisplacement(DEFAULT_HDISPLACEMENT);
                                                setVDisplacement(DEFAULT_VDISPLACEMENT);
                                            }} />
                                    }
                                </TabPanel>
                                <TabPanel key='transform-panel' className="rounded-xl px-2 py-2">
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
                                            canCreate={
                                                (topTbc.every(m => m instanceof CNode) && topTbc.length<=MAX_NODEGROUP_SIZE &&
                                                    // Since creating a new NodeGroup can lead to exceeding the list size limit, we have to check whether it would.
                                                    (list.length < MAX_LIST_SIZE ||
                                                        (() => { // Here we check whether creating the new NodeGroup would lead to the deletion of at least one existing NodeGroup:
                                                            const affectedNGs = topTbc.map(node => node.group).filter((g, i, arr) => i==arr.indexOf(g));
                                                            return affectedNGs.some(g => g && g.members.every(m => topTbc.includes(m)));
                                                        })()
                                                    )
                                                ) ||
                                                (topTbc.every(m => !(m instanceof CNode)) &&
                                                    topTbc.reduce((acc, it) => {
                                                        const d = depth(it);
                                                        return acc>d? acc: d;
                                                    }, 0) < MAX_GROUP_LEVEL
                                                )
                                            }
                                            create={() => {
                                                let group: Group<any>;
                                                if (topTbc.every(m => m instanceof CNode)) {
                                                    group = new NodeGroup(nodeGroupCounter);
                                                    group.members = topTbc;
                                                    setNodeGroupCounter(prev => prev+1);
                                                    setList(prev => [...prev, group as NodeGroup]);
                                                }                                                
                                                else {
                                                    group = new StandardGroup<Item | Group<any>>(topTbc);
                                                }
                                                const oldGroups = topTbc.map(m => m.group).filter((g, i, arr) => g && i===arr.indexOf(g));
                                                oldGroups.forEach(g => {
                                                    if (g) {
                                                        g.members = g.members.filter(m => !topTbc.includes(m));
                                                        if (g.members.length==0) setList(prev => purge(g, prev));
                                                    }
                                                });
                                                topTbc.forEach(member => {
                                                    member.group = group;
                                                    member.isActiveMember = true;
                                                });
                                                adjustSelection(focusItem);                                 
                                            }} 
                                            leave={() => {
                                                const groups = getGroups(focusItem);
                                                const member = groups[1]>0? groups[0][groups[1]-1]: focusItem;
                                                member.isActiveMember = false;
                                                adjustSelection(focusItem);                                 
                                            }}
                                            rejoin={() => {
                                                const member = highestActive(focusItem);
                                                if(member.group) member.isActiveMember = true;
                                                adjustSelection(focusItem);                                 
                                            }}
                                            dissolve={() => {
                                                const group = highestActive(focusItem);
                                                if (!(group instanceof Item)) {
                                                    const { members } = group;
                                                    members.forEach(m => m.isActiveMember = false);
                                                }
                                                adjustSelection(focusItem);
                                            }}
                                            restore={() => {
                                                const ha = highestActive(focusItem);
                                                if (!(ha instanceof Item)) {
                                                    ha.members.forEach(m => m.isActiveMember=true);
                                                }
                                                adjustSelection(focusItem);                                 
                                            }}
                                            changeAdding={() => {
                                                const add = !adding;
                                                setAdding(add);
                                                if (add) setDissolveAdding(!add);
                                            }}
                                            changeDissolveAdding={() => {
                                                const add = !dissolveAdding;
                                                setDissolveAdding(add);
                                                if (add) setAdding(!add);
                                            }}
                                            />
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
                        <BasicColoredButton id='generate-button' label='Generate' style='rounded-xl mb-1 py-2' disabled={false} onClick={sorry} />
                        <div className='flex items-center justify-end mb-4 px-4 py-1 text-sm'>
                            1 pixel = 
                            <input className='w-16 ml-1 px-2 py-0.5 mr-1 text-right border border-btnborder rounded-md focus:outline-none bg-textfieldbg text-textfieldcolor'
                                type='number' step='0.1' value={pixel}
                                onChange={(e) => setPixel(parseFloat(e.target.value))}/>
                            pt
                        </div>
                        <BasicColoredButton id='load-btton' label='Load' style='rounded-xl mb-1 py-2' disabled={false} onClick={sorry} /> 
                        <CheckBoxField label='Replace current diagram' value={replace} onChange={()=>{setReplace(!replace)}} />
                    </div>
                    <Modal isOpen={showModal} closeTimeoutMS={750}
                            className='fixed inset-0 flex items-center justify-center z-50'
                            overlayClassName={clsx('fixed inset-0', dark? 'bg-black/70':  'bg-gray-900/70')} 
                            contentLabel={modalMsg[0]}
                            onRequestClose={() => setShowModal(false)}>
                        <div className='grid justify-items-center bg-modalbg px-8 py-4 border border-btnfocusring rounded-2xl'>
                                {modalMsg[1]}
                            <BasicColoredButton id='close-button' label='OK' style='w-20 mt-4 rounded-xl' disabled={false} onClick={() => setShowModal(false)} />
                        </div>
                    </Modal>
                </div>
            </div>
        </DarkModeContext.Provider>
    );
};

export default MainPanel;