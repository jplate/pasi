import React, { useState, useRef, useEffect, useMemo, useCallback, createContext } from 'react';
import Modal from 'react-modal';
import { useHotkeys } from 'react-hotkeys-hook';
import { Tab, TabGroup, TabList, TabPanel, TabPanels, Menu, MenuButton, MenuItem } from '@headlessui/react';
import NextImage, { StaticImageData } from 'next/image';
import clsx from 'clsx';

import {
    H,
    CANVAS_WIDTH_BASE,
    CANVAS_WIDTH_LARGE,
    MAX_X,
    MIN_Y,
    MAX_Y,
    MARGIN,
    MARK_LINEWIDTH,
    ROUNDING_DIGITS,
    MIN_ROTATION_LOG_INCREMENT,
    DEFAULT_TRANSLATION_LOG_INCREMENT,
    DEFAULT_ROTATION_LOG_INCREMENT,
    DEFAULT_SCALING_LOG_INCREMENT,
    CANVAS_WIDTH_THRESHOLD,
    MAX_HISTORY,
    MAX_GROUP_LEVEL,
} from '../../Constants';
import Item from './items/Item';
import Node, {
    DEFAULT_DISTANCE,
    MAX_LINEWIDTH,
    MAX_DASH_VALUE,
    MAX_NUMBER_OF_ORNAMENTS,
    DEFAULT_HSL_LIGHT_MODE,
    DEFAULT_HSL_DARK_MODE,
    MAX_RADIUS,
    addDependents,
} from './items/Node';
import { BasicButton, BasicColoredButton, CopyToClipboardButton } from './Button';
import {
    CheckBoxField,
    MenuItemList,
    ChevronSVG,
    menuButtonClassName,
    menuItemButtonClassName,
    validFloat,
} from './EditorComponents';
import CanvasEditor from './CanvasEditor';
import ItemEditor from './ItemEditor';
import TransformTab from './TransformTab';
import GroupTab from './GroupTab';
import ENode, { ENodeComp } from './items/ENode';
import GNode from './items/GNode';
import Point, { PointComp } from './Point';
import Group, { GroupMember, StandardGroup, getGroups, getLeafMembers, depth } from './Group';
import CNode from './items/CNode';
import CNodeGroup, { MAX_CNODEGROUP_SIZE, CNodeGroupComp } from './CNodeGroup';
import { round, rotatePoint, scalePoint, getCyclicValue } from '../../util/MathTools';
import { copyItems, getTopToBeCopied } from './Copying';
import { move } from './Moving';
import { getCode, load } from '../../codec/Codec1';
import { ENCODE_BASE, ENCODE_PRECISION } from '../../codec/General';
import { sameElements, useThrottle, matchKeys, equalArrays } from '../../util/Misc';
import { useHistory } from '../../util/History';
import { HotkeyComp, hotkeyMap } from './Hotkeys';
import { undoIcon, redoIcon, deleteIcon } from '../Icons';
import SNode, { ConnectorComp } from './items/SNode';
import Adjunction from './items/snodes/Adjunction';
import Order from './items/snodes/Order';
import Identity from './items/snodes/Identity';
import Ornament from './items/Ornament';
import Label from './items/ornaments/Label';

import lblSrc from '../../../icons/lbl.png';
import adjSrc from '../../../icons/adj.png';
import idtSrc from '../../../icons/idt.png';
import orpSrc from '../../../icons/orp.png';
/*
import cntSrc from '../../../icons/cnt.png';
import entSrc from '../../../icons/ent.png';
import exsSrc from '../../../icons/exs.png';
import incSrc from '../../../icons/inc.png';
import insSrc from '../../../icons/ins.png';
import negSrc from '../../../icons/neg.png';
import prdSrc from '../../../icons/prd.png';
import ptrSrc from '../../../icons/ptr.png';
import rstSrc from '../../../icons/rst.png';
import trnSrc from '../../../icons/trn.png';
import unvSrc from '../../../icons/unv.png';
*/

const MAX_LIST_SIZE = 1000; // maximal size of the list of ENodes and CNodeGroups

export const MARK_COLOR0_LIGHT_MODE = '#8877bb';
export const MARK_COLOR0_DARK_MODE = '#462d0c';
export const MARK_COLOR1_LIGHT_MODE = '#b0251a';
export const MARK_COLOR1_DARK_MODE = '#5b0b00';
export const LASSO_COLOR_LIGHT_MODE = 'rgba(136, 119, 187, 200)';
export const LASSO_COLOR_DARK_MODE = 'rgba(100, 50, 0, 200)';
export const LASSO_DASH = '2';

export const DEFAULT_HGAP = 10;
export const DEFAULT_VGAP = 10;
export const MIN_GAP = 1;
export const MAX_GAP = 200;
export const DEFAULT_HSHIFT = 0;
export const DEFAULT_VSHIFT = 0;
export const MIN_SHIFT = 0;
export const MAX_SHIFT = 200;
export const DEFAULT_HDISPLACEMENT = 50;
export const DEFAULT_VDISPLACEMENT = 0;
export const MIN_DISPLACEMENT = -9999;
export const MAX_DISPLACEMENT = 9999;
const MIN_UNITSCALE = 0.1;
const MAX_UNITSCALE = 99;
const DEFAULT_UNIT_SCALE = 0.75;
const MIN_DISPLAY_FONT_FACTOR = 0.1;
const MAX_DISPLAY_FONT_FACTOR = 100;
const DEFAULT_DISPLAY_FONT_FACTOR = 0.8;
const MOVE_UPDATE_DELAY = 500;
const UNDO_REDO_DELAY = 100;

export const MAX_SCALING = 1e6;
export const MIN_ROTATION = -180;

const CONTOUR_CENTER_SNAP_RADIUS = 10; // radius around contour centers where snapping ignores grid points
const NODE_SNAP_RADIUS = 15; // radius around centers of nodes where snapping ignores grid points

const CANVAS_CLICK_THRESHOLD = 4; // For determining when a mouseUp is a mouseClick
const SCROLL_X_OFFSET = 20; // How close to the left edge of the viewport the limit point may be before we resize the canvas
const SCROLL_Y_OFFSET = 20; // How close to the top edge of the viewport the limit point may be before we resize the canvas
const CANVAS_HSL_LIGHT_MODE = { hue: 0, sat: 0, lgt: 100 }; // to be passed to ENodes
const CANVAS_HSL_DARK_MODE = { hue: 29.2, sat: 78.6, lgt: 47.65 };
const BLACK = { hue: 0, sat: 0, lgt: 0 };
const LASSO_DESELECT_LIGHT_MODE = 'rgba(255, 255, 255, 0.5)';
const LASSO_DESELECT_DARK_MODE = 'rgba(0, 0, 0, 0.1)';
const GHOST_TOLERANCE = 0.5; // A GNode has to be closer than this distance (in pixels) to a non-ghost Node to have its
// features transferred to the latter.
const NUMBER_FORMAT = Intl.NumberFormat('en-US');

interface DialogConfig {
    contentLabel?: string;
    title?: string;
    content?: React.ReactNode;
    extraWide?: boolean;
}

const addNodeButtonTooltip = (
    <>
        Create entity nodes at the selected locations.
        <HotkeyComp mapKey='add nodes' />
    </>
);

const addContourButtonTooltip = (
    <>
        Create contours at the selected locations.
        <HotkeyComp mapKey='add contours' />
    </>
);

const abstractButtonTooltip = (
    <>
        Create &lsquo;ghost&rsquo; versions of selected nodes.
        <HotkeyComp mapKey='abstract' />
    </>
);

const copyButtonTooltip = (
    <>
        Copy selection.
        <HotkeyComp mapKey='copy' />
    </>
);

export const generateButtonTooltip = (
    <>
        Generate and display <i>TeXdraw</i> code. (To save space, all coordinates are rounded to the nearest{' '}
        {NUMBER_FORMAT.format(Math.floor(ENCODE_BASE ** ENCODE_PRECISION))}th of a pixel. Some information may
        be lost as a result.) <HotkeyComp mapKey='generate code' />
    </>
);

const loadButtonTooltip = (
    <>
        Load diagram from <i>TeXdraw</i> code.
        <HotkeyComp mapKey='load diagram' />
    </>
);

// For some reaon, hotkeys-react-hook doesn't work for undo/redo, so we have to do this manually:
const keyChecker = (key: string) => (event: React.KeyboardEvent<HTMLElement>) => matchKeys(event, key);
const undoChecker = keyChecker(hotkeyMap['undo']);
const redoChecker = keyChecker(hotkeyMap['redo']);

const menuButtonClass = clsx('py-1.5', menuButtonClassName);

const tabClass = clsx(
    'py-1 px-2 text-sm/6 bg-btnbg/85 text-btncolor border border-t-0 border-btnborder/50',
    'data-[selected]:border-b-0 disabled:opacity-50 tracking-wider focus:outline-none data-[selected]:bg-transparent',
    'data-[selected]:font-semibold data-[hover]:bg-btnhoverbg data-[hover]:text-btnhovercolor data-[hover]:font-semibold',
    'data-[selected]:data-[hover]:text-btncolor'
);

export const DarkModeContext = createContext(false);

export type Grid = {
    hGap: number;
    vGap: number;
    hShift: number;
    vShift: number;
    snapToContourCenters: boolean;
    snapToNodes: boolean;
};

const createGrid = (
    hGap: number = DEFAULT_HGAP,
    vGap: number = DEFAULT_VGAP,
    hShift: number = DEFAULT_HSHIFT,
    vShift: number = DEFAULT_VSHIFT,
    snapToContourCenters: boolean = true,
    snapToNodes: boolean = true
): Grid => {
    return { hGap, vGap, hShift, vShift, snapToContourCenters, snapToNodes };
};

const nearestGridPoint = (x: number, y: number, grid: Grid) => {
    return [
        x + grid.hGap / 2 - ((x + grid.hGap / 2 - grid.hShift) % grid.hGap),
        y + grid.vGap / 2 - ((y + grid.vGap / 2 - grid.vShift) % grid.vGap),
    ];
};

/**
 * Returns the point to 'snap' to from the supplied coordinates (and, if applicable, the node whose center lies at that point), given the supplied grid, list,
 * and selection. Since this is called from within a mouseMove handler while dragging, members of the selection (which is being dragged) have to be ignored.
 * Same for the center and members of any CNodeGroup containing the focusItem.
 */
const getSnapPoint = (
    x: number,
    y: number,
    grid: Grid,
    list: (Node | CNodeGroup)[],
    focus: Item,
    selectedNodes: Node[],
    dccDx: number | undefined, // The X-coordinate of the center of the contour group (if any) that contains the focusItem
    dccDy: number | undefined // The Y-coordinate of the center of the contour group (if any) that contains the focusItem
): [number, number, Node | null] => {
    let [rx, ry] = nearestGridPoint(x, y, grid),
        d = Math.sqrt(Math.pow(x - rx, 2) + Math.pow(y - ry, 2)),
        snappingToGrid = true,
        snapNode: Node | null = null;
    if (grid.snapToContourCenters || grid.snapToNodes) {
        for (const it of list) {
            const overlap: CNode[] =
                it instanceof CNodeGroup ? it.members.filter((m) => selectedNodes.includes(m)) : []; // When the focus Item is a CNode,
            // we have to avoid snapping to the center of the node's CNodeGroup, to prevent stuttery movement as a result of feedback. Similarly, further
            // below we have to avoid snapping to other nodes of that CNodeGroup if there is a danger of feedback due to the CNodeGroup's 'groupMove' feature.
            if (it instanceof CNodeGroup && (!(focus instanceof CNode) || !it.members.includes(focus))) {
                if (grid.snapToContourCenters && overlap.length == 0) {
                    const c = it.getNodalCenter();
                    const dc = Math.sqrt(Math.pow(x - c.x, 2) + Math.pow(y - c.y, 2));
                    if (dc < d || (snappingToGrid && dc < CONTOUR_CENTER_SNAP_RADIUS)) {
                        snappingToGrid = false;
                        rx = c.x;
                        ry = c.y;
                        d = dc;
                    }
                    if (dccDx !== undefined && dccDy !== undefined) {
                        // If we're dragging a contour, its center should snap to the centers of other contours.
                        const dx = x + dccDx - c.x;
                        const dy = y + dccDy - c.y;
                        const ddc = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
                        if (ddc < d || (snappingToGrid && ddc < CONTOUR_CENTER_SNAP_RADIUS)) {
                            snappingToGrid = false;
                            rx = x - dx;
                            ry = y - dy;
                            d = ddc;
                        }
                    }
                }
            }
            if (grid.snapToNodes) {
                const array = it instanceof CNodeGroup ? it.members : [it];
                for (const node of array) {
                    const dn = Math.sqrt(Math.pow(x - node.x, 2) + Math.pow(y - node.y, 2));
                    if (
                        (dn < d || (snappingToGrid && dn < NODE_SNAP_RADIUS)) &&
                        !addDependents(selectedNodes, false).has(node) && // No point in trying to snap to a node that'll move away as a result.
                        (!(node instanceof CNode) || node.isFree(overlap)) // Don't try to snap to nodes that might move away due to groupMove.
                    ) {
                        snappingToGrid = false;
                        snapNode = node;
                        rx = node.x;
                        ry = node.y;
                        d = dn;
                    }
                }
            }
        }
    }
    //console.log(`sn: ${snapNode?.id}`);
    return [rx, ry, snapNode];
};

class Lasso {
    constructor(
        public x0: number,
        public y0: number,
        public x1: number,
        public y1: number,
        public deselect: boolean
    ) {}
    contains(item: Item, yOffset: number): boolean {
        const { bottom, left } = item.getBottomLeftCorner();
        return (
            left >= this.x0 &&
            left + item.getWidth() <= this.x1 &&
            H + yOffset - bottom <= this.y1 &&
            H + yOffset - (bottom + item.getHeight()) >= this.y0
        );
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
        return (
            <NextImage
                src={this.src}
                alt={this.alt}
                width={28}
                className={clsx('inline object-contain', dark ? 'filter invert sepia' : '')}
            />
        );
    }
}

// An array of the strings by which we're going to reference the various classes of 'dependent Item', i.e., Ornaments and SNodes:
type DepItemKey =
    | 'adj'
    | 'cnt'
    | 'ent'
    | 'exs'
    | 'idt'
    | 'inc'
    | 'ins'
    | 'lbl'
    | 'neg'
    | 'orp'
    | 'prd'
    | 'ptr'
    | 'rst'
    | 'trn'
    | 'unv';

const depItemInfos = [
    // Commenting out what hasn't been implemented yet:
    /*
    new DepItemInfo(
        'Broad tip',
        'trn',
        trnSrc,
        'An arrow that has as its tip a closed, reflectionally symmetric figure',
        2
    ),
    new DepItemInfo('Broken line', 'neg', negSrc, 'A line that is broken in the middle', 2),
    new DepItemInfo('Chevron', 'ptr', ptrSrc, 'A chevron-shaped ornament attached to a node', 1),
    new DepItemInfo('Dot', 'exs', exsSrc, 'A square-shaped ornament attached to a node', 1),
    new DepItemInfo(
        'Double hook, circular',
        'ins',
        insSrc,
        'An arrow with two curved hooks, each being a segment of a circle',
        2
    ),
    new DepItemInfo('Double hook, curved', 'ent', entSrc, 'An arrow with two curved hooks (cubic)', 2),
    new DepItemInfo('Harpoon', 'inc', incSrc, 'An arrow with an asymmetric, harpoonlike tip', 2),
    */
    new DepItemInfo('Label', 'lbl', lblSrc, 'A label attached to a node', 1),
    // new DepItemInfo('Round tip', 'cnt', cntSrc, 'A round-tipped arrow', 2),
    new DepItemInfo('Simple line', 'idt', idtSrc, 'A simple line', 2),
    /*
    new DepItemInfo(
        'Single hook, circular',
        'unv',
        unvSrc,
        'An arrow with a single hook that is a segment of a circle',
        2
    ),
    new DepItemInfo(
        'Single hook, composite',
        'rst',
        rstSrc,
        'An arrow with a single hook that is made up of a cubic curve followed by a straight line',
        2
    ),
    new DepItemInfo('Single hook, curved', 'prd', prdSrc, 'An arrow with a single curved hook (cubic)', 2),
    */
    new DepItemInfo('Single hook, straight', 'orp', orpSrc, 'An arrow with a single straight hook', 2),
    new DepItemInfo('Standard arrow', 'adj', adjSrc, 'An arrow with two straight hooks', 2),
];

const depItemKeys = depItemInfos.map((dl) => dl.key);

// We're mapping string keys to the corresponding classes:
const sNodeClassMap: Partial<Record<DepItemKey, new (i: number, closest: boolean) => SNode>> = {
    adj: Adjunction,
    orp: Order,
    idt: Identity,
};

const highestActive = (item: Item): Item | Group<any> => {
    const groups = getGroups(item);
    return groups[1] > -1 ? groups[0][groups[1]] : item;
};

/**
 * Used for computing the X coordinate of the limit component.
 */
const limitCompX = (limitX: number, canvas: HTMLDivElement | null, canvasWidth: number) => {
    if (canvas) {
        const { scrollLeft } = canvas;
        const x = Math.min(Math.ceil(limitX / canvasWidth) * canvasWidth, MAX_X);
        return x <= canvasWidth || x < scrollLeft + SCROLL_X_OFFSET
            ? x
            : Math.max(x, scrollLeft + canvasWidth) + (limitX > canvasWidth ? MARGIN : -40); // The extra term is to provide a bit of margin and to avoid an unnecessary scroll bar.
    } else {
        return 0;
    }
};

/**
 * Used for computing the Y coordinate of the limit component.
 */
const limitCompY = (limitY: number, canvas: HTMLDivElement | null) => {
    if (canvas) {
        const { scrollTop } = canvas;
        const y = Math.max(Math.floor(limitY / H) * H, MIN_Y);
        return y >= 0 || y > H - scrollTop - SCROLL_Y_OFFSET
            ? y
            : Math.min(y, -scrollTop) + (limitY < 0 ? -MARGIN : 40); // The extra term is to provide a bit of margin and to avoid an unnecessary scroll bar.
    } else {
        return 0;
    }
};

/**
 * Returns an array of all ENodes in the specified list, as well as any CNodes in any CNodeGroups in that same list, and, if the supplied boolean is false,
 * also all Ornaments attached to any such nodes, that meet the specified test condition (or *any* condition if none is specified).
 */
export const getItems = (
    list: (ENode | CNodeGroup)[],
    onlyNodes: boolean = false,
    test: (it: Item) => boolean = () => true
): Item[] =>
    list.flatMap((it: ENode | CNodeGroup) => {
        let result: Item[];
        if (it instanceof ENode) {
            const orn = onlyNodes ? [] : it.ornaments.filter(test);
            result = test(it) ? [it, ...orn] : orn;
        } else {
            result = it.members.flatMap((cn) => {
                const orn = onlyNodes ? [] : cn.ornaments.filter(test);
                return test(cn) ? [cn, ...orn] : orn;
            });
        }
        return result;
    });

/**
 * Returns an array of CNodeGroups that are contained (directly or indirectly) in the supplied array of Nodes and Groups.
 */
const getCNodeGroups = (array: (Item | Group<any>)[]): CNodeGroup[] =>
    array.reduce(
        (acc: CNodeGroup[], it) =>
            it instanceof Item
                ? acc
                : it instanceof CNodeGroup
                  ? [...acc, it]
                  : [...acc, ...getCNodeGroups(it.members)],
        []
    );

/**
 * Helper function for deleteSelection().
 */
const getToBeDeleted = (
    selection: Item[],
    acc: Set<Item> = new Set(),
    visited: Set<Item> = new Set<Item>() // to prevent infinite loops.
) => {
    for (const it of selection) {
        acc.add(it);
        if (it instanceof Node && !visited.has(it)) {
            visited.add(it);
            getToBeDeleted(it.dependentNodes, acc, visited);
        }
    }
    return acc;
};

/**
 * A function to be called on groups that have just been emptied of all their members. The second argument is the list of items to be displayed
 * on the canvas. Returns a new, 'purged' list.
 */
const purge = (group: Group<any>, list: (ENode | CNodeGroup)[]): (ENode | CNodeGroup)[] => {
    let newList = list;
    if (group instanceof CNodeGroup) {
        // If group is a NodeGroup, we delete it from the list:
        newList = list.filter((it) => it !== group);
    }
    if (group.group) {
        // An empty group is just useless baggage, so we also delete it from its own group:
        group.group.members = group.group.members.filter((m) => m !== group);
    }
    return newList;
};

/**
 * A function to be called on arrays of Items when the list of underlying ENodes and CNodeGroups has been changed. All those Items that are
 * ENodes not in that list, or CNodes that either belong to a CNodeGroup not in the list or no longer belong to the  or that are Ornaments of some ENode or CNode of a CNodeGroup not in the list will be filtered out.
 * @return the filtered list.
 */
const prune = (selection: Item[], newList: (ENode | CNodeGroup)[]): Item[] =>
    selection.filter(
        (it) =>
            (it instanceof ENode && newList.includes(it)) ||
            (it instanceof CNode && it.group) || // We here rely on deleteItems() making sure that to-be-deleted CNodes have their groups set to null.
            (it instanceof Ornament && it.node instanceof ENode && newList.includes(it.node)) ||
            (it instanceof Ornament &&
                it.node instanceof CNode &&
                newList.includes(it.node.group as CNodeGroup))
    );

/**
 * Transfers features (ornaments and end points of connectors) from one Node to another. The third and second argument are needed in order
 * properly to initalize Labels.
 */
const transferFeatures = (n0: Node, n1: Node, unitScale: number, displayFontFactor: number): void => {
    if (n0 instanceof CNode === n1 instanceof CNode) {
        n1.group = n0.group;
        n1.isActiveMember = n0.isActiveMember;
        if (n1.group) {
            n1.group.members.push(n1);
        }
    }

    for (const o of n0.ornaments) {
        const clone = o.clone(n1);
        if (clone instanceof Label) {
            clone.updateLines(unitScale, displayFontFactor);
        }
    }
    for (const node of n0.dependentNodes) {
        if (node instanceof SNode) {
            const inv = node.involutes;
            for (let i = 0; i < inv.length; i++) {
                if (n0 === inv[i]) {
                    inv[i] = n1;
                }
            }
            if (!n1.dependentNodes.includes(node)) {
                n1.dependentNodes = [node, ...n1.dependentNodes];
            }
            n0.dependentNodes = n0.dependentNodes.filter((n) => n !== node);
        }
    }
};

/**
 * @return a pair of arrays (of the same length), where the first array contains selected nodes from the supplied array.
 * If the supplied array contains a run of two or more CNodes that together form a whole CNodeGroup, then only the first member of this run is
 * included in the first element of the returned pair of arrays, and the corresponding element of the second array will be *true*. Otherwise the
 * corresponding element will be *false*.
 */
const select = (nodes: Node[]): [Node[], boolean[]] => {
    if (nodes.length < 2) {
        return [nodes, nodes.map(() => false)];
    }
    let n0 = nodes[0];
    let slice = nodes.slice(1);
    let group = false;
    if (n0 instanceof CNode) {
        const ng0 = n0.group!.members;
        if (sameElements(ng0, nodes.slice(0, ng0.length))) {
            n0 = nodes[0];
            group = true;
            slice = nodes.slice(ng0.length);
        }
    }
    const [selectedNodes, flagged] = select(slice);
    return [
        [n0, ...selectedNodes],
        [group, ...flagged],
    ];
};

const flipAffectedArrowheads = (nodes: Item[]) => {
    const affectedSNodes = Array.from(addDependents(nodes, false).values()).filter(
        (it) => it instanceof SNode && Array.from(it.getAncestors()).every((node) => nodes.includes(node))
    ) as SNode[];
    for (const node of affectedSNodes) {
        node.flipArrowhead();
    }
};

interface LogIncrements {
    rotate: number;
    scale: number;
}

interface TransformFlags {
    scaleENodes: boolean;
    scaleConnectors: boolean;
    scaleArrowheads: boolean;
    scaleDash: boolean;
    scaleLinewidths: boolean;
    flipArrowheads: boolean;
}

interface HistoryEntry {
    list: (ENode | CNodeGroup)[];
    selection: Item[];
    focusItem: Item | null;
    points: Point[];
    eNodeCounter: number;
    cngCounter: number;
    sgCounter: number;
    grid: Grid;
    displayFontFactor: number;
    unitScale: number;
    replace: boolean;
    hDisplacement: number;
    vDisplacement: number;
    adding: boolean;
    dissolveAdding: boolean;
    logIncrement: number;
    logIncrements: LogIncrements; // for the transform tab
    transformFlags: TransformFlags;
    yOffset: number;
    code: string;
}

interface MainPanelProps {
    dark: boolean;
    diagramCode: string | null; // code for a diagram passed down from the page.
    reset: () => void; // callback for resetting the diagram code that is passed down from the page.
}

const MainPanel = ({ dark, diagramCode, reset }: MainPanelProps) => {
    const canvasRef = useRef<HTMLDivElement>(null);
    const codeRef = useRef<HTMLTextAreaElement>(null);
    const [replace, setReplace] = useState(true);
    const [depItemIndex, setDepItemIndex] = useState(depItemKeys.indexOf('adj'));
    const [unitScale, setUnitScale] = useState(DEFAULT_UNIT_SCALE);
    const [displayFontFactor, setDisplayFontFactor] = useState(DEFAULT_DISPLAY_FONT_FACTOR);
    const [points, setPoints] = useState<Point[]>([]);
    const [itemsMoved, setItemsMoved] = useState([]); // used to signal to the updaters of, e.g., canCopy that the positions of items may have changed.
    const [itemsDragged, setItemsDragged] = useState([]); // used to force a re-render without updating any constants.
    const [list, setList] = useState<(ENode | CNodeGroup)[]>([]);
    const [eNodeCounter, setENodeCounter] = useState(0); // used for generating keys
    const [cngCounter, setCNGCounter] = useState(0); // used for generating keys
    const [sgCounter, setSGCounter] = useState(0); // used for generating ids of StandardGroups, which are used in copying
    const [selection, setSelection] = useState<Item[]>([]); // list of selected items; multiple occurrences are allowed
    const [focusItem, setFocusItem] = useState<Item | null>(null); // the item that carries the 'focus', relevant for the editor pane
    const [yOffset, setYOffset] = useState(0);
    const [limit, setLimit] = useState<Point>(new Point(0, H)); // the current bottom-right corner of the 'occupied' area of the canvas (which can
    // be adjusted by the user moving items around)
    const [canvasWidth, setCanvasWidth] = useState(CANVAS_WIDTH_BASE);

    const [grid, setGrid] = useState(createGrid());
    const [hDisplacement, setHDisplacement] = useState(DEFAULT_HDISPLACEMENT);
    const [vDisplacement, setVDisplacement] = useState(DEFAULT_VDISPLACEMENT);

    const [lasso, setLasso] = useState<Lasso | null>(null);
    const [dragging, setDragging] = useState(false);
    const [preselection1, setPreselection1] = useState<Item[]>([]); // In the current implementation, this array only ever contains at most one item. It's meant to contain
    // those items that are 'directly' preselected, either because they're hovered over by the mouse or (at least in an earlier implementation) because they're included
    // in the lasso; and the items that are 'secondarily preselected' are those that are preselected because they share a group-membership with those contained in the
    // primary preselection. However, as far as items preselected with the lasso are concerned, it seems more intuitive to ignore shared group-membership.
    const [preselection2, setPreselection2] = useState<Item[]>([]);
    const preselection2Ref = useRef<Item[]>([]);
    preselection2Ref.current = preselection2;

    const [userSelectedTabIndex, setUserSelectedTabIndex] = useState(0); // canvas editor is default
    const [logIncrement, setLogIncrement] = useState(DEFAULT_TRANSLATION_LOG_INCREMENT); // for itemEditor
    const [rotation, setRotation] = useState(0);
    const [scaling, setScaling] = useState(100); // default is 100%
    const [origin] = useState({ x: 0, y: 0 }); // the point around which to rotate and from which to scale; computed and set by setOrigin()
    const [logIncrements, setLogIncrements] = useState({
        rotate: DEFAULT_ROTATION_LOG_INCREMENT,
        scale: DEFAULT_SCALING_LOG_INCREMENT,
    }); // for the transform tab
    const [transformFlags, setTransformFlags] = useState({
        scaleENodes: false,
        scaleConnectors: false,
        scaleArrowheads: false,
        scaleDash: false,
        scaleLinewidths: false,
        flipArrowheads: false,
    });
    const [trueBlack, setTrueBlack] = useState(false); // indicates whether entity nodes and contours should use black as their primary and (when shading is set to 1)
    // background color.

    const [adding, setAdding] = useState(false);
    const [dissolveAdding, setDissolveAdding] = useState(false);

    const [code, setCode] = useState<string>(''); // the TeXdraw code to be displayed in the code area.

    const [modalShown, setModalShown] = useState(false);
    const [dialog, setDialog] = useState<DialogConfig>({});
    const okButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const element = document.getElementById('content');
        if (element) Modal.setAppElement(element);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < CANVAS_WIDTH_THRESHOLD) {
                setCanvasWidth(CANVAS_WIDTH_BASE);
            } else {
                setCanvasWidth(CANVAS_WIDTH_LARGE);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    /****************************************************************************************
     * STATE MANAGEMENT
     ***************************************************************************************/

    // prettier-ignore
    const { push, before, after, canRedo, canUndo } = useHistory<HistoryEntry>(
        {
            list, selection, focusItem, points, eNodeCounter, cngCounter, sgCounter, grid, displayFontFactor, unitScale, replace,
            hDisplacement, vDisplacement, adding, dissolveAdding, logIncrement, logIncrements, transformFlags, yOffset, code
        },
        MAX_HISTORY
    );

    // prettier-ignore
    const updateState = useCallback(
        (entry: HistoryEntry) => {
            //console.log(`entry.selection.length: ${entry.selection.length} entry.focusItem: ${entry.focusItem && entry.focusItem.getString()} `);
            setList(entry.list);
            setSelection(entry.selection);
            setFocusItem(entry.focusItem);
            setPoints(entry.points);
            setENodeCounter(entry.eNodeCounter);
            setCNGCounter(entry.cngCounter);
            setSGCounter(entry.sgCounter);
            setGrid(entry.grid);
            setDisplayFontFactor(entry.displayFontFactor);
            setUnitScale(entry.unitScale);
            setReplace(entry.replace);
            setHDisplacement(entry.hDisplacement);
            setVDisplacement(entry.vDisplacement);
            setAdding(entry.adding);
            setDissolveAdding(entry.dissolveAdding);
            setLogIncrement(entry.logIncrement);
            setLogIncrements(entry.logIncrements);
            setTransformFlags(entry.transformFlags);
            setYOffset(entry.yOffset);
            setCode(entry.code);
        },
        [
            setList, setSelection, setFocusItem, setENodeCounter, setCNGCounter, setSGCounter, setGrid, setDisplayFontFactor,
            setUnitScale, setReplace, setHDisplacement, setVDisplacement, setAdding, setDissolveAdding, setLogIncrement,
            setLogIncrements, setTransformFlags, setYOffset, setCode
        ]
    );

    // prettier-ignore
    const stored: HistoryEntry = useMemo(
        () => ({
            // to facilitate reference in the update function
            list, selection, focusItem, points, eNodeCounter, cngCounter, sgCounter, grid, displayFontFactor, unitScale, replace,
            hDisplacement, vDisplacement, adding, dissolveAdding, logIncrement, logIncrements, transformFlags, yOffset, code
        }),
        [
            list, selection, focusItem, points, eNodeCounter, cngCounter, sgCounter, grid, displayFontFactor, unitScale, replace,
            hDisplacement, vDisplacement, adding, dissolveAdding, logIncrement, logIncrements, transformFlags, yOffset, code
        ]
    );

    /**
     * Updates the state and stores a copy of the new state in the history.
     */ //prettier-ignore
    const update = useCallback(
        (
            {
                list = stored.list,
                selection = stored.selection,
                focusItem = stored.focusItem,
                points = stored.points,
                eNodeCounter = stored.eNodeCounter,
                cngCounter = stored.cngCounter,
                sgCounter = stored.sgCounter,
                grid = stored.grid,
                displayFontFactor = stored.displayFontFactor,
                unitScale = stored.unitScale,
                replace = stored.replace,
                hDisplacement = stored.hDisplacement,
                vDisplacement = stored.vDisplacement,
                adding = stored.adding,
                dissolveAdding = stored.dissolveAdding,
                logIncrement = stored.logIncrement,
                logIncrements = stored.logIncrements,
                transformFlags = stored.transformFlags,
                yOffset = stored.yOffset,
                code = stored.code,
            }: Partial<HistoryEntry>,
            changeState: boolean = true
        ): void => {

            // We first update the state, if desired:
            if (changeState) {
                updateState({
                    list, selection, focusItem, points, eNodeCounter, cngCounter, sgCounter, grid, displayFontFactor, unitScale, replace,
                    hDisplacement, vDisplacement, adding, dissolveAdding, logIncrement, logIncrements, transformFlags, yOffset, code
                });
            } 

            // Next, store a copy of the state in the history:

            const allItems = getItems(list);
            const topTbc = allItems.reduce((acc: (Item | Group<any>)[], it: Item) => {
                const groups = getGroups(it)[0];
                const hi = groups.length > 0 ? groups[groups.length - 1] : it;
                if (!acc.includes(hi)) acc.push(hi);
                return acc;
            }, []);
            const nodes = new Set<Node>(allItems.filter((it) => it instanceof Node) as Node[]);
            const [newList, gnodes, newSelection, newFocusItem] = copyItems(
                topTbc, nodes, list, selection, focusItem, 0, 0, 0, 0, 0, unitScale, displayFontFactor
            );
            if (gnodes.length > 0) {
                console.warn(`Not all nodes copied? GNode counter=${gnodes.length}.`);
            }

            //console.log(`newSelection.length: ${newSelection.length} newFocusItem: ${newFocusItem && newFocusItem.getString()} `);
            push({
                list: newList,
                selection: newSelection,
                focusItem: newFocusItem,
                points: [...points],
                eNodeCounter,
                cngCounter,
                sgCounter,
                grid: { ...grid },
                displayFontFactor,
                unitScale,
                replace,
                hDisplacement,
                vDisplacement,
                adding,
                dissolveAdding,
                logIncrement,
                logIncrements: { ...logIncrements },
                transformFlags: { ...transformFlags },
                yOffset: yOffset,
                code,
            });
        },
        [stored, push, updateState]
    );

    const throttledReport = useThrottle(() => update({}, false), MOVE_UPDATE_DELAY);

    /****************************************************************************************
     * OTHER CONSTANTS
     ***************************************************************************************/

    /**
     * A deduplicated version of selection.
     */
    const deduplicatedSelection = useMemo(
        () => selection.filter((item, i) => i === selection.indexOf(item)),
        [selection]
    );

    const selectedNodes = useMemo(
        () => selection.filter((item) => item instanceof Node) as Node[],
        [selection]
    );

    const selectedNodesDeduplicated = useMemo(
        () => selectedNodes.filter((node, i) => i === selectedNodes.indexOf(node)),
        [selectedNodes]
    );

    const selectedIndependentNodes = useMemo(
        () => selectedNodesDeduplicated.filter((node) => node.isIndependent()),
        [selectedNodesDeduplicated]
    );

    /**
     * A Set of all those nodes that depend (directly or indirectly, in the sense in which an SNode depends on its involutes) on one or more selected nodes or,
     * if one of the selected nodes is a CNode, on any of the CNodes in its group. This latter case is included because any of those CNodes might have moved
     * as a result of CNodeGroup.groupMove().
     */
    const dependents = useMemo(
        () =>
            addDependents(
                deduplicatedSelection.flatMap((it) =>
                    it instanceof CNode ? (it.group as CNodeGroup).members : [it]
                ),
                false
            ),
        [deduplicatedSelection]
    );

    const leftMostSelected = useMemo(
        () =>
            selectedNodesDeduplicated.reduce(
                (min, item) => (itemsMoved && min < item.x ? min : item.x),
                Infinity
            ),
        [selectedNodesDeduplicated, itemsMoved]
    );

    const topMostSelected = useMemo(
        () =>
            selectedNodesDeduplicated.reduce(
                (max, item) => (itemsMoved && max > item.y ? max : item.y),
                -Infinity
            ),
        [selectedNodesDeduplicated, itemsMoved]
    );

    const rightMostSelected = useMemo(
        () =>
            selectedNodesDeduplicated.reduce(
                (max, item) => (itemsMoved && max > item.x ? max : item.x),
                -Infinity
            ),
        [selectedNodesDeduplicated, itemsMoved]
    );

    const bottomMostSelected = useMemo(
        () =>
            selectedNodesDeduplicated.reduce(
                (min, item) => (itemsMoved && min < item.y ? min : item.y),
                Infinity
            ),
        [selectedNodesDeduplicated, itemsMoved]
    );

    /**
     * An array of all Items, including Ornaments.
     */
    const allItems = useMemo(() => getItems(list) as Item[], [list]);

    /**
     * The highest-level Items/Groups that will need to be copied if the user clicks on 'Copy Selection'. This includes any Ornaments attached to
     * selected Nodes, as well as any SNodes that have one or more selected Nodes as involutes.
     */
    const topMembers: (Item | Group<any>)[] = useMemo(
        () => getTopToBeCopied(deduplicatedSelection),
        [deduplicatedSelection]
    );

    const showModal = useCallback(
        (
            contentLabel: string,
            content: React.ReactNode,
            extraWide: boolean = false,
            title: string = contentLabel
        ) => {
            setDialog({ contentLabel, title, content, extraWide });
            setModalShown(true);
        },
        [setDialog, setModalShown]
    );

    /**
     * Sets the origin point for transformations. This function should be called whenever we've changed the points, the selection, or the focusItem.
     * The first parameter indicates whether the transformation should be reset.
     */
    const setOrigin = useCallback(
        (
            resetTransform: boolean,
            pts: Point[] = points,
            focus: Item | null = focusItem,
            sel: Item[] = selection,
            li: (ENode | CNodeGroup)[] = list
        ) => {
            // Compute new origin:
            const selectedNodes = sel.filter((item) => item instanceof Node) as Node[];
            const { x, y } =
                pts.length > 0
                    ? pts[pts.length - 1]
                    : focus instanceof Node
                      ? focus
                      : selectedNodes.length > 0
                        ? selectedNodes[selectedNodes.length - 1]
                        : { x: 0, y: 0 };

            const originChanged = origin.x !== x || origin.y !== y;
            origin.x = x;
            origin.y = y;

            if (resetTransform && originChanged) {
                setRotation(0);
                setScaling(100);
                li.forEach((it) => {
                    // resetting the items for new scaling
                    if (it instanceof CNodeGroup) {
                        it.linewidth100 = it.linewidth;
                        it.dash100 = it.dash;
                    }
                    (it instanceof CNodeGroup ? it.members : [it]).forEach((node) => {
                        node.x100 = node.x;
                        node.y100 = node.y;
                        if (node instanceof ENode) {
                            node.radius100 = node.radius;
                            node.linewidth100 = node.linewidth;
                            node.dash100 = node.dash;
                            node.ornaments.forEach((o) => {
                                o.gap100 = o.gap;
                            });
                            if (node instanceof SNode) {
                                node.renormalize();
                            }
                        } else if (node instanceof CNode) {
                            node.dist0_100 = node.dist0;
                            node.dist1_100 = node.dist1;
                        }
                        node.ornaments.forEach((o) => {
                            o.gap100 = o.gap;
                        });
                    });
                });
            }
        },
        [points, focusItem, selection, list, origin] // origin has no setter, so is not included.
    );

    /**
     * This function should be called whenever items have moved or new items have been added to the canvas. It adjusts both the yOffset state
     * and updates the coordinates stored in the limit object.
     */
    const adjustLimit = useCallback(
        (items: Item[] = allItems) => {
            let top = 0,
                right = 0,
                bottom = H;
            items.forEach((item) => {
                const w = item.getWidth();
                const h = item.getHeight();
                const { bottom: iBottom, left: iLeft } = item.getBottomLeftCorner();
                const iTop = iBottom + h;
                const iRight = iLeft + w;
                if (iTop > top) {
                    top = iTop;
                }
                if (iRight > right) {
                    right = iRight;
                }
                if (iBottom < bottom) {
                    bottom = iBottom;
                }
            });
            const canvas = canvasRef.current;
            if (canvas) {
                const { scrollTop } = canvas;
                const delta1 = Math.max(0, top - H) - yOffset;
                const delta2 = Math.ceil((delta1 % H === 0 ? delta1 - 1 : delta1) / H) * H;
                const adjust =
                    top < H
                        ? -yOffset
                        : yOffset + delta2 < scrollTop - SCROLL_Y_OFFSET || delta2 > 0
                          ? delta2
                          : Math.max(-scrollTop, delta2);
                if (adjust !== 0) {
                    setYOffset(yOffset + adjust);
                    setTimeout(() => {
                        canvas.scrollBy(0, adjust);
                    }, 0);
                }
            }
            if (limit.x !== right || limit.y !== bottom) {
                setLimit(new Point(right, bottom)); // set the new bottom-right limit
            }
        },
        [allItems, yOffset, limit]
    );

    /**
     * Scrolls to the center point of the specified item.
     */
    const scrollTo = useCallback(
        (item: Item) => {
            const canvas = canvasRef.current;
            if (canvas) {
                const w = item.getWidth();
                const h = item.getHeight();
                const { bottom, left } = item.getBottomLeftCorner();
                const icx = left + w / 2; // item center X
                const icy = bottom + h / 2; // item center Y
                const dx = icx - canvas.scrollLeft;
                const scrollRight =
                    Math.floor((dx % canvasWidth === 0 ? dx - 1 : dx) / canvasWidth) * canvasWidth;
                const dy = canvas.scrollTop + icy - yOffset;
                const scrollDown = -Math.floor((dy % H === 0 ? dy + 1 : dy) / H) * H;
                setTimeout(() => {
                    canvas.scrollBy(scrollRight, scrollDown);
                }, 0);
            }
        },
        [yOffset, canvasWidth]
    );

    const revertTo = useCallback(
        (state: HistoryEntry) => {
            updateState(state);
            setOrigin(true, points, null, [], state.list);
            adjustLimit(getItems(state.list));
            if (state.focusItem) {
                scrollTo(state.focusItem);
            }
        },
        [points, updateState, setOrigin, adjustLimit, scrollTo]
    );

    const undo = useCallback(() => revertTo(before()), [revertTo, before]);

    const redo = useCallback(() => revertTo(after()), [revertTo, after]);

    const throttledUndo = useThrottle(undo, UNDO_REDO_DELAY);

    const throttledRedo = useThrottle(redo, UNDO_REDO_DELAY);

    /**
     * Dedicated keydown handler for undo/redo, because react-hotkeys-hook refuses to work for undo and redo (even though
     * the buttons do work).
     */
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            if (undoChecker(e)) {
                throttledUndo();
            } else if (redoChecker(e)) {
                throttledRedo();
            }
        },
        [throttledUndo, throttledRedo]
    );

    const updateSecondaryPreselection = useCallback(
        (prim: Item[] = preselection1) => {
            const lm = new Set<GroupMember>();
            for (const item of prim) {
                const ha = highestActive(item);
                if (ha instanceof Item) {
                    lm.add(ha);
                } else {
                    const halm = getLeafMembers(ha, true);
                    for (const it of halm) {
                        lm.add(it);
                    }
                }
            }
            const addition = allItems.filter((item) => !prim.includes(item) && lm.has(item));
            setPreselection2([...prim, ...addition]);
        },
        [preselection1, allItems, setPreselection2]
    );

    const deselect = useCallback(
        (item: Item) => {
            const index = selection.lastIndexOf(item);
            let newFocus = focusItem;
            setSelection((prev) => {
                const newSelection = prev.filter((it, i) => i !== index);
                if (focusItem && !newSelection.includes(focusItem)) {
                    newFocus = null;
                    setFocusItem(null);
                }
                return newSelection;
            });
            setOrigin(true, points, newFocus, deduplicatedSelection, list);
            return item;
        },
        [selection, focusItem, points, deduplicatedSelection, list, setOrigin]
    );

    /**
     * Deletes the supplied Items from any lists membership in which would cause an Item to be displayed on the canvas. With the help of the second
     * (optional) argument, this function can also be used to *add* new Items to the canvas.
     * @param items the Items to be deleted.
     * @param currentList the array that is to be assumed to be the current list of ENodes and CNodeGroups.
     * @param currentSelection the Item array that is to be assumed to be the current selection.
     * @param newSelection the Item array that is to become the new selection. If this is unspecified, the new selection will be constructed from
     * the third argument.
     * @param currentFocus the Item (or null) that is to be assumed to be the current focusItem.
     * @param newFocus the Item that will be made the new focusItem in case the current one is deleted.
     */
    const deleteItems = useCallback(
        (
            items: Item[],
            currentList = list,
            currentSelection: Item[] = selection,
            newSelection?: Item[],
            currentFocus: Item | null = focusItem,
            newFocus: Item | null = null
        ) => {
            const toBeDeleted = getToBeDeleted(items);
            const newList: (ENode | CNodeGroup)[] = [];
            for (const it of currentList) {
                if (it instanceof ENode) {
                    if (!toBeDeleted.has(it)) {
                        newList.push(it);
                        // Remove to-be-deleted Ornaments and dependent SNodes:
                        it.ornaments = it.ornaments.filter((o) => !toBeDeleted.has(o));
                        it.dependentNodes = it.dependentNodes.filter((sn) => !toBeDeleted.has(sn));
                    }
                } else if (it instanceof CNodeGroup) {
                    const newMembers: CNode[] = [];
                    for (const node of it.members) {
                        if (toBeDeleted.has(node)) {
                            node.group = null;
                        } else {
                            newMembers.push(node);
                        }
                    }
                    if (newMembers.length > 0) {
                        it.members = newMembers;
                        newList.push(it);
                        newMembers.forEach((m) => {
                            // Remove to-be-deleted Ornaments and dependent SNodes:
                            m.ornaments = m.ornaments.filter((o) => !toBeDeleted.has(o));
                            m.dependentNodes = m.dependentNodes.filter((sn) => !toBeDeleted.has(sn));
                        });
                    }
                }
            }
            const whitelist = new Set<Group<Node | Group<any>>>();
            newList.forEach((it) => {
                // Whitelist each group that contains (directly or indirectly) a not-to-be-deleted item.
                if (it instanceof ENode) {
                    getGroups(it)[0].forEach((g) => whitelist.add(g));
                }
                if (it instanceof CNodeGroup) {
                    whitelist.add(it); // A NodeGroup is in newList only if it contains at least one not-to-be-deleted node. So we whitelist it.
                    it.members.forEach((m) => {
                        m.ornaments.forEach((o) => {
                            getGroups(o)[0].forEach((g) => whitelist.add(g));
                        });
                    });
                }
            });
            whitelist.forEach((g) => {
                // For each whitelisted Group that is not a CNodeGroup, filter out all the members that are not either (a) not-to-be-deleted
                // ENodes or (b) ornaments attached to such ENodes or to CNodes of not-to-be-deleted (and accordingly whitelisted) CNodeGroups or (c)
                // whitelisted Groups.
                if (!(g instanceof CNodeGroup)) {
                    g.members = g.members.filter(
                        (m) =>
                            (m instanceof ENode && newList.includes(m)) ||
                            (m instanceof Ornament &&
                                ((m.node instanceof ENode && newList.includes(m.node)) ||
                                    (m.node.group instanceof CNodeGroup && whitelist.has(m.node.group)))) ||
                            (!(m instanceof Item) && whitelist.has(m))
                    );
                }
            });
            update({
                list: newList,
                selection: newSelection ?? prune(currentSelection, newList),
                focusItem: currentFocus && items.includes(currentFocus) ? newFocus : currentFocus,
            });
            setPreselection1((prev) => prune(prev, newList));
            setPreselection2((prev) => prune(prev, newList));
            adjustLimit(getItems(newList));
            setOrigin(true, points, null, []);
        },
        [
            focusItem,
            points,
            list,
            update,
            selection,
            adjustLimit,
            setOrigin,
            setPreselection1,
            setPreselection2,
        ]
    );

    /**
     * Mouse down handler for items on the canvas.
     */
    const itemMouseDown = useCallback(
        (
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
            if (e.ctrlKey && !e.shiftKey && deduplicatedSelection.includes(item)) {
                deselect(item);
            } else {
                let newPoints = points,
                    newList = list,
                    newSelection = selection;

                if (focusItem && (adding || dissolveAdding)) {
                    newPoints = [];
                    const itemToAdd = e.ctrlKey ? item : highestActive(item);
                    const group = highestActive(focusItem);
                    if (
                        !(group instanceof Item) &&
                        (group instanceof CNodeGroup ||
                            (group !== itemToAdd && !group.members.includes(itemToAdd)))
                    ) {
                        if (itemToAdd instanceof Item) {
                            newSelection = [...selection, itemToAdd];
                        } else {
                            const lm = getLeafMembers(itemToAdd);
                            newSelection = [
                                ...selection,
                                item,
                                ...allItems.filter(
                                    (it) => it !== item && !selection.includes(it) && lm.has(it)
                                ),
                            ];
                        }
                        if (group !== itemToAdd && !group.members.includes(itemToAdd)) {
                            if (adding || itemToAdd instanceof Item) {
                                if (group instanceof CNodeGroup && !(itemToAdd instanceof CNode)) {
                                    showModal(
                                        'Invalid target',
                                        'A contour node group can only have contour nodes as members.'
                                    );
                                    return;
                                } else if (
                                    group instanceof CNodeGroup &&
                                    group.members.length >= MAX_CNODEGROUP_SIZE
                                ) {
                                    showModal(
                                        'Hungry Caterpillar Alert',
                                        `The maximum size of a contour node group is ${MAX_CNODEGROUP_SIZE} nodes.🐛`
                                    );
                                    return;
                                } else if (group instanceof StandardGroup && itemToAdd instanceof CNode) {
                                    showModal(
                                        'Invalid target',
                                        'A contour node can only be a member of a contour node group.'
                                    );
                                    return;
                                } else {
                                    if (focusItem instanceof CNode && group instanceof CNodeGroup) {
                                        const i = group.members.indexOf(focusItem);
                                        group.members.splice(i + 1, 0, itemToAdd as CNode);
                                    } else {
                                        group.members.push(itemToAdd);
                                    }
                                    const oldGroup = itemToAdd.group;
                                    itemToAdd.group = group;
                                    itemToAdd.isActiveMember = true;
                                    if (oldGroup) {
                                        oldGroup.members = oldGroup.members.filter((m) => m !== itemToAdd);
                                        if (oldGroup.members.length == 0) newList = purge(oldGroup, newList);
                                    }
                                }
                            } else {
                                // dissolve adding
                                if (group instanceof CNodeGroup && !(itemToAdd instanceof CNodeGroup)) {
                                    showModal(
                                        'Invalid target',
                                        'A contour node group can only have contour nodes as members.'
                                    );
                                    return;
                                } else if (
                                    group instanceof CNodeGroup &&
                                    group.members.length + itemToAdd.members.length > MAX_CNODEGROUP_SIZE
                                ) {
                                    showModal(
                                        'Hungry Caterpillar Alert',
                                        `The maximum size of a contour node group is ${MAX_CNODEGROUP_SIZE} nodes.🐛`
                                    );
                                    return;
                                } else if (
                                    group instanceof StandardGroup &&
                                    itemToAdd instanceof CNodeGroup
                                ) {
                                    showModal(
                                        'Invalid target',
                                        'A contour node can only be a member of a contour node group.'
                                    );
                                    return;
                                } else {
                                    if (focusItem instanceof CNode && group instanceof CNodeGroup) {
                                        const i = group.members.indexOf(focusItem); // the index after which to insert
                                        const j = itemToAdd.members.indexOf(item); // indicates the first node to be inserted
                                        const nodes = (itemToAdd as CNodeGroup).members
                                            .slice(j)
                                            .concat(itemToAdd.members.slice(0, j));
                                        group.members.splice(i + 1, 0, ...nodes);
                                    } else {
                                        group.members.push(...itemToAdd.members);
                                    }
                                    itemToAdd.members.forEach((m) => {
                                        m.group = group;
                                        m.isActiveMember = true;
                                    });
                                    itemToAdd.members = [];
                                    if (itemToAdd instanceof CNodeGroup) {
                                        // Since itemToAdd is now an empty NodeGroup, we delete it from the list:
                                        newList = purge(itemToAdd, newList);
                                    }
                                    if (itemToAdd.group) {
                                        itemToAdd.group.members = itemToAdd.group.members.filter(
                                            (m) => m !== itemToAdd
                                        );
                                    }
                                }
                            }
                        } else if (group instanceof CNodeGroup) {
                            // In this case, item must already be a member of group, just like focusItem.
                            const i = group.members.indexOf(focusItem as CNode),
                                j = group.members.indexOf(item as CNode);
                            let newMembers: CNode[];
                            if (i < 0 || j < 0) {
                                console.warn('Unexpectedly missing CNode');
                                return;
                            }
                            if (
                                i !== j &&
                                newList.length < MAX_LIST_SIZE &&
                                (i + 1 < j || (j < i && (j > 0 || i < group.members.length - 1)))
                            ) {
                                // We're splitting group into two parts:
                                if (i + 1 < j) {
                                    newMembers = group.members.splice(i + 1, j - i - 1);
                                } else {
                                    newMembers = [
                                        ...group.members.slice(0, j),
                                        ...group.members.slice(i + 1),
                                    ];
                                    group.members = group.members.slice(j, i + 1);
                                }
                                const newGroup = new CNodeGroup(cngCounter);
                                newGroup.copyNonMemberValuesFrom(group);
                                newGroup.members = newMembers;
                                setCNGCounter((prev) => prev + 1);
                                newMembers.forEach((node) => (node.group = newGroup));
                                newList = [...newList, newGroup];
                            }
                        }
                    }
                } else {
                    const pres = preselection2Ref.current; // This may be empty if we've just selected the same item (due to the clearing of the
                    // preselection at the end of this function).
                    if (e.shiftKey) {
                        // increase selection
                        if (e.ctrlKey || pres.length === 0) {
                            if (item instanceof ENode || !deduplicatedSelection.includes(item)) {
                                // If item is a CNode, we don't add it twice.
                                newSelection = [...selection, item];
                            }
                        } else {
                            newSelection = [
                                // If the user shift-clicks on an item, she'll usually only want to add that item to the selection, together with
                                // any other items in the preselection that have not yet been selected.
                                ...selection,
                                ...pres.filter(
                                    (it) =>
                                        (it instanceof ENode && it === item) ||
                                        !deduplicatedSelection.includes(it)
                                ),
                            ];
                        }
                    } else {
                        // replace selection
                        if (e.ctrlKey || pres.length === 0) {
                            newSelection = [item];
                            // If ctrl was not pressed, then, for the case that the user clicks on this item again, we prepare the selection not
                            // just of item itself but of all members of its highest active group:
                            if (!e.ctrlKey) {
                                updateSecondaryPreselection([item]);
                                clearPreselection = false;
                            }
                        } else {
                            // The 'normal' case: we select the preselection.
                            newSelection = pres;
                        }
                        newPoints = [];
                    }
                }
                if (item instanceof Node) {
                    // Handle dragging:
                    setDragging(true);
                    const selectedNodes = newSelection.filter(
                        (item, i) => item instanceof Node && i === newSelection.indexOf(item)
                    ) as Node[];
                    const contourDragged =
                        item.group instanceof CNodeGroup &&
                        item.group.members.every((m) => selectedNodes.includes(m));

                    // If we're dragging a contour, we need to determine the location of its center, which is then (in handleMouseMove) passed on to getSnapPoint.
                    let dccDx: number | undefined, dccDy: number | undefined; // distances (horizontal and vertical) to the center of the drgged contour (if there is one)
                    if (contourDragged && item.group instanceof CNodeGroup) {
                        // The second conjunct should be unnecessary, but Typescript insists.
                        const { x, y } = item.group.getNodalCenter();
                        dccDx = x - item.x;
                        dccDy = y - item.y;
                    }
                    const itemX = item.x;
                    const itemY = item.y;
                    const startX = e.clientX - itemX;
                    const startY = e.clientY - (H + yOffset - itemY);
                    const xMinD = itemX - selectedNodes.reduce((min, it) => (it.x < min ? it.x : min), itemX); // x-distance to the left-most selected item

                    const handleMouseMove = (e: MouseEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // First, we take into account the grid:
                        const [snapX, snapY] = getSnapPoint(
                            e.clientX - startX,
                            H + yOffset - e.clientY + startY,
                            grid,
                            newList,
                            item,
                            selectedNodes,
                            dccDx,
                            dccDy
                        );
                        // Next, we have to prevent the node, as well as the left-most selected item, from being dragged outside the
                        // canvas to the left (from where they couldn't be recovered), and also respect the lmits of MAX_X, MAX_Y, and MIN_Y:
                        const x = Math.min(Math.max(snapX, xMinD), MAX_X);
                        const y = Math.min(Math.max(snapY, MIN_Y), MAX_Y);
                        const dx = x - item.x;
                        const dy = y - item.y;
                        // Finally, we move each item in the selection, if necessary:
                        if (dx !== 0 || dy !== 0) {
                            move(selectedNodes, dx, dy);
                            setItemsDragged((prev) => [...prev]); // to trigger a re-render
                        }
                    };

                    const handleMouseUp = () => {
                        window.removeEventListener('mousemove', handleMouseMove);
                        window.removeEventListener('mouseup', handleMouseUp);
                        setDragging(false);

                        // Delete GNodes that have been dragged onto some other node:
                        const unselectedNodes = allItems.filter(
                            (it) => it instanceof Node && !selectedNodes.includes(it)
                        ) as Node[];
                        const toBeDeletedGNodes: GNode[] = [];
                        for (const n0 of selectedNodes) {
                            if (n0 instanceof GNode) {
                                for (const n1 of unselectedNodes) {
                                    const [x0, y0] = n0.getLocation();
                                    const [x1, y1] = n1.getLocation();
                                    const d = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
                                    if (d < GHOST_TOLERANCE) {
                                        transferFeatures(n0, n1, unitScale, displayFontFactor);
                                        toBeDeletedGNodes.push(n0);
                                    }
                                }
                            }
                        }
                        if (toBeDeletedGNodes.length > 0) {
                            deleteItems(toBeDeletedGNodes, list, newSelection, undefined, item);
                        }

                        setOrigin(
                            item !== focusItem && newPoints.length == 0, // If the focusItem is still the same or newPoints is non-empty, then don't reset the
                            // transform (even if the origin has changed). However, if newPoints is non-empty (in which case it is equal to the current points
                            // array), then we have to 'renormalize' the members of newSelection, since the nodes might have been dragged around the origin
                            // (given by the last element of the points array).
                            newPoints,
                            item,
                            newSelection
                        );

                        // Some movement-related issues:
                        if (item.x !== itemX || item.y !== itemY) {
                            adjustLimit();
                            if (newPoints.length > 0)
                                selectedNodes.forEach((node) => {
                                    node.x100 = origin.x + ((node.x - origin.x) * 100) / scaling;
                                    node.y100 = origin.y + ((node.y - origin.y) * 100) / scaling;
                                });
                            // We also apply round() to get rid of tiny errors that might have been introduced during dragging.
                            selectedNodes.forEach((node) => {
                                node.x = node.x100 = round(node.x, ROUNDING_DIGITS);
                                node.y = node.y100 = round(node.y, ROUNDING_DIGITS);
                            });

                            // Update history (unless we've deleted GNodes, in which case we've already triggered a history update via deleteItems()):
                            if (toBeDeletedGNodes.length === 0) {
                                setItemsMoved((prev) => [...prev]);
                                // Update history (without changing state, which has already been done):
                                update(
                                    {
                                        list: newList,
                                        selection: newSelection,
                                        focusItem: item,
                                        points: newPoints,
                                    },
                                    false
                                );
                            }
                        }
                    };

                    window.addEventListener('mousemove', handleMouseMove);
                    window.addEventListener('mouseup', handleMouseUp);
                }

                if (clearPreselection) {
                    setPreselection1([]);
                    setPreselection2([]);
                }
                if (
                    list !== newList ||
                    !equalArrays(selection, newSelection) ||
                    focusItem !== item ||
                    !equalArrays(points, newPoints)
                ) {
                    update({ list: newList, selection: newSelection, focusItem: item, points: newPoints });
                }
            }
        },
        [
            allItems,
            deduplicatedSelection,
            selection,
            points,
            list,
            adding,
            dissolveAdding,
            focusItem,
            yOffset,
            scaling,
            adjustLimit,
            cngCounter,
            unitScale,
            displayFontFactor,
            deselect,
            grid,
            origin.x,
            origin.y,
            update,
            setOrigin,
            updateSecondaryPreselection,
            showModal,
            deleteItems,
        ]
    );

    /**
     * Mouse down handler for contour center divs.
     */
    const groupMouseDown = useCallback(
        (
            group: CNodeGroup,
            e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>
        ) => {
            if (group.members.length > 0) {
                itemMouseDown(group.members[group.members.length - 1], e, false); // the 'false' parameter prevents the preselection from being cleared after selecting,
                // which means that the whole current preselection will again be selected if the user clicks on the center div again.
            }
        },
        [itemMouseDown]
    );

    /**
     * Mouse enter handler for items on the canvas
     */
    const itemMouseEnter = useCallback(
        (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            if (!dragging) {
                setPreselection1([item]);
                if (e.ctrlKey) {
                    setPreselection2([item]); // if Ctrl is pressed, only add item by itself
                } else {
                    updateSecondaryPreselection([item]); // otherwise add all the leaf members of its highest active group
                }
            }
        },
        [dragging, updateSecondaryPreselection]
    );

    /**
     * Mouse enter handler for the contour center divs.
     */
    const groupMouseEnter = useCallback(
        (
            group: CNodeGroup,
            e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>
        ) => {
            if (!dragging) {
                setPreselection1(group.members);
                if (e.ctrlKey) {
                    setPreselection2(group.members); // if Ctrl is pressed, only add group members by themselves
                } else {
                    updateSecondaryPreselection(group.members); // otherwise add all the leaf members of their highest active group
                }
            }
        },
        [dragging, setPreselection1, setPreselection2, updateSecondaryPreselection]
    );

    /**
     * Mouse leave handler for ENodes, CNodes, and contour center divs.
     */
    const mouseLeft = useCallback(() => {
        if (!dragging) {
            setPreselection1([]);
            updateSecondaryPreselection([]);
        }
    }, [dragging, setPreselection1, updateSecondaryPreselection]);

    /**
     * Mouse down handler for the canvas. Adds and removes Points and creates a lasso.
     */
    const canvasMouseDown = useCallback(
        (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();
            const canvas = canvasRef.current;
            if (canvas) {
                const element = document.activeElement as HTMLElement;
                element.blur();
                canvas.focus();
            }
            const { left, top } = canvas?.getBoundingClientRect() ?? { left: 0, top: 0 };
            const { scrollLeft, scrollTop, clientWidth, clientHeight } = canvas ?? {
                scrollLeft: 0,
                scrollTop: 0,
                clientWidth: 0,
                clientHeight: 0,
            };

            if (e.clientX - left >= clientWidth || e.clientY - top > clientHeight) {
                // ignore interactions with the scrollbars
                return;
            }

            setDragging(true);
            const x = e.clientX - left + scrollLeft;
            const y = e.clientY - top + scrollTop;
            const deselect = e.ctrlKey && !e.shiftKey && selection.length > 0;
            let newPoints = e.shiftKey ? points : [];

            const handleMouseMove = (mme: MouseEvent) => {
                const dx = mme.clientX - e.clientX;
                const dy = mme.clientY - e.clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist >= CANVAS_CLICK_THRESHOLD) {
                    // Only in this case do we create a Lasso.
                    setPoints(newPoints);
                    const lasso = new Lasso(
                        Math.min(x, x + dx),
                        Math.min(y, y + dy),
                        Math.max(x, x + dx),
                        Math.max(y, y + dy),
                        deselect
                    );
                    const pres = preselection2Ref.current;
                    let changed = false;
                    const newPres = [
                        // old items:
                        ...pres.filter((item) => {
                            const result = lasso.contains(item, yOffset);
                            changed ||= !result;
                            return result;
                        }),
                        // new items:
                        ...allItems.filter((item) => {
                            const result =
                                lasso.contains(item, yOffset) &&
                                // Don't include hidden SNodes:
                                !(item instanceof ENode && item.isHidden(selection.includes(item))) &&
                                // Don't include items already in the preselection:
                                !pres.includes(item) &&
                                // If we're deselecting, don't include items that aren't in the selection:
                                (!deselect || selection.includes(item));
                            changed ||= result;
                            return result;
                        }),
                    ];
                    if (changed) {
                        //console.log(`changed: ${newPres.length}`);
                        setPreselection2(newPres);
                    }
                    setLasso(lasso);
                }
            };

            const handleMouseUp = (mue: MouseEvent) => {
                canvasRef.current?.removeEventListener('mouseup', handleMouseUp);
                canvasRef.current?.removeEventListener('mousemove', handleMouseMove);
                setDragging(false);
                let newFocus = focusItem;
                let newSelection = selection;

                const dx = mue.clientX - e.clientX;
                const dy = mue.clientY - e.clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CANVAS_CLICK_THRESHOLD) {
                    // Only in this case, the mouseUp event should be interpreted as a click event.
                    const [gx, gy] = nearestGridPoint(x, H + yOffset - y, grid);
                    const newPoint = new Point(gx, gy);
                    if (!e.shiftKey) {
                        newPoints = [newPoint];
                        newSelection = [];
                        newFocus = null;
                    } else {
                        const included = points.some((p) => newPoint.id === p.id); // The ID contains the Point's coordinates, so this is checking whether there
                        // already exists a Point for the clicked-on position on the canvas.
                        if (!included) newPoints = [...points, newPoint];
                    }
                } else {
                    // In this case, we need to take care of the lasso, and either select or deselect items.
                    const pres = preselection2Ref.current;
                    if (deselect) {
                        const toDeselect = pres.reduce(
                            (acc: number[], item: Item) => [...acc, selection.lastIndexOf(item)],
                            []
                        );
                        newSelection = selection.filter((item, index) => !toDeselect.includes(index));
                    } else if (e.shiftKey) {
                        // increase selection
                        newSelection = [...selection, ...pres];
                        pres.forEach((item) => {
                            // 'renormalize' the nodes to be added to the selection:
                            if (item instanceof Node) {
                                item.x100 = origin.x + ((item.x - origin.x) * 100) / scaling;
                                item.y100 = origin.y + ((item.y - origin.y) * 100) / scaling;
                            }
                        });
                    } else {
                        newSelection = pres;
                    }
                    if (newSelection.length > 0 && (!focusItem || !deselect)) {
                        newFocus = newSelection[newSelection.length - 1];
                    } else if (newSelection.length == 0 || (focusItem && !newSelection.includes(focusItem))) {
                        newFocus = null;
                    }
                }
                update({
                    selection: newSelection,
                    focusItem: newFocus,
                    points: newPoints,
                    adding: false,
                    dissolveAdding: false,
                });
                setLasso(null);
                setPreselection1([]);
                setPreselection2([]);
                setOrigin(true, newPoints, newFocus, newSelection);
            };

            canvasRef.current?.addEventListener('mousemove', handleMouseMove);
            canvasRef.current?.addEventListener('mouseup', handleMouseUp);

            setAdding(false);
            setDissolveAdding(false);
            // No history update necessary, since that is already done in the mouseup handler.
        },
        [
            allItems,
            selection,
            yOffset,
            focusItem,
            points,
            origin,
            scaling,
            grid,
            update,
            setLasso,
            setPreselection1,
            setPreselection2,
            setOrigin,
            setAdding,
            setDissolveAdding,
        ]
    );

    /**
     *  OnClick handler for the 'Node' button.
     */
    const addEntityNodes = useCallback(() => {
        if (points.length > 0) {
            let counter = eNodeCounter;
            const nodes = points.map((point) => new ENode(counter++, point.x, point.y));
            const newList = [...list, ...nodes];
            const newFocus = nodes[nodes.length - 1];
            update({
                list: newList,
                selection: nodes,
                focusItem: newFocus,
                points: [],
                eNodeCounter: counter,
            });
            setOrigin(true, [], newFocus, nodes);
            // No need to call adjustLimit, since we're basically just replacing the points with nodes.
        }
    }, [points, eNodeCounter, list, update, setOrigin]);

    /**
     *  OnClick handler for the 'Contour' button.
     */
    const addContours = useCallback(() => {
        if (points.length > 0) {
            let counter = cngCounter;
            const newCNodeGroups = points.map((point) => new CNodeGroup(counter++, point.x, point.y));
            const newList = [...list, ...newCNodeGroups];
            setCNGCounter(counter);
            setList(newList);
            const nodes = getItems(newCNodeGroups, true);
            const newFocus = nodes[nodes.length - 1];
            update({
                list: newList,
                selection: nodes,
                focusItem: newFocus,
                points: [],
                cngCounter: counter,
            });
            setOrigin(true, [], newFocus, nodes);
            adjustLimit(getItems(newList));
        }
    }, [points, cngCounter, list, update, adjustLimit, setOrigin, setList, setCNGCounter]);

    const sorry = useCallback(() => {
        showModal('Apology', 'Sorry, this feature has not yet been implemented!', false, '');
    }, [showModal]);

    const createDepItem = useCallback(
        (index: number) => {
            if (selectedNodes.length > 0 && index >= 0 && index < depItemKeys.length) {
                let newSelection: Item[] = [];
                let counter = eNodeCounter;
                let snodes: SNode[] = [];
                let con: (new (i: number, closest: boolean) => SNode) | undefined = undefined;
                const key = depItemKeys[index];
                const minNodes = depItemInfos[index].min;
                if (selectedNodes.length >= minNodes) {
                    switch (key) {
                        case 'lbl':
                            newSelection = selectedNodes.map((node) => {
                                const label = new Label(node);
                                label.text = 'a';
                                label.updateLines(unitScale, displayFontFactor);
                                return label;
                            });
                            break;
                        default:
                            if (key in sNodeClassMap) {
                                con = sNodeClassMap[key];
                            } else {
                                sorry();
                                return;
                            }
                    }
                    if (con) {
                        const [nodes, flagged] = select(selectedNodes); // If selectedNodes includes, e.g., an ENode followed by a run of CNodes that form a full CNodeGroup,
                        // the user presumably wants the ENode to be connected to just one of those CNodes.
                        let relata;
                        if (nodes.length < 2) {
                            // In this case we've selected only at most one node, which is not enough; so we revert to the original array.
                            relata = selectedNodes;
                            snodes = new Array(relata.length - 1)
                                .fill(null)
                                .map(() => new con!(counter++, false));
                        } else {
                            relata = nodes;
                            snodes = new Array(relata.length - 1)
                                .fill(null)
                                .map((_, i: number) => new con!(counter++, flagged[i] || flagged[i + 1]));
                        }
                        for (let i = 0; i < snodes.length; i++) {
                            snodes[i].init(relata[i], relata[i + 1]);
                        }
                        newSelection = snodes;
                    }
                    const newFocus = newSelection.at(-1);
                    update({
                        list: counter !== eNodeCounter ? [...list, ...snodes] : list,
                        selection: newSelection,
                        focusItem: newFocus ?? focusItem,
                        points: [],
                        eNodeCounter: counter,
                    });
                    if (newFocus) {
                        setOrigin(true, [], newFocus, newSelection);
                    }
                    // Not really any need to call adjustLimit(), since the new Items will be created close to existing nodes.
                }
            }
        },
        [list, focusItem, selectedNodes, unitScale, displayFontFactor, eNodeCounter, update, setOrigin, sorry]
    );

    /**
     * OnClick handler for the 'Create' button.
     */
    const handleCreateDepItem = useCallback(() => {
        createDepItem(depItemIndex);
    }, [depItemIndex, createDepItem]);

    /**
     * Creates 'ghost nodes' in place of the supplied nodes, to which all the latter's features are then transferred. The original nodes are deleted
     * unless they are CNodes.
     */
    const abstractSelection = useCallback(() => {
        let n = eNodeCounter;
        const gnodes: GNode[] = [];
        let newFocus: Item | null = null;
        const newSelection: Item[] = selection.map((node) => {
            if (node instanceof Node) {
                const [x, y] = node.getLocation();
                const gn = new GNode(n++, x, y);
                gnodes.push(gn);
                transferFeatures(node, gn, unitScale, displayFontFactor);
                if (focusItem === node) {
                    newFocus = gn;
                }
                return gn;
            } else {
                return node;
            }
        });
        deleteItems(
            // CNodes and nodes that come with connectors aren't deleted, because that would entail a (probably unintended) loss of information.
            selectedNodes.filter((n) => !(n instanceof CNode) && n.isIndependent()),
            [...list, ...gnodes],
            selection,
            newSelection,
            focusItem,
            newFocus
        );
        setENodeCounter(n);
    }, [
        eNodeCounter,
        list,
        selection,
        focusItem,
        selectedNodes,
        unitScale,
        displayFontFactor,
        setENodeCounter,
        deleteItems,
    ]);

    const copySelection = useCallback(() => {
        const nodes = addDependents(
            selection.filter((it) => it instanceof Node),
            false
        ) as Set<Node>;
        const [copiedList, gnodes, newSelection, newFocusItem, newENodeCounter, newCNGCounter, newSGCounter] =
            copyItems(
                topMembers,
                nodes,
                list,
                selection,
                focusItem,
                eNodeCounter,
                cngCounter,
                sgCounter,
                hDisplacement,
                vDisplacement,
                unitScale,
                displayFontFactor
            );
        const newList = [...list, ...copiedList, ...gnodes];
        update({
            list: newList,
            selection: newSelection,
            focusItem: newFocusItem,
            eNodeCounter: newENodeCounter,
            cngCounter: newCNGCounter,
            sgCounter: newSGCounter,
        });
        setOrigin(true, points, newFocusItem, newSelection);
        adjustLimit(getItems(newList));
        if (newFocusItem) {
            scrollTo(newFocusItem);
        }
    }, [
        selection,
        topMembers,
        list,
        focusItem,
        eNodeCounter,
        cngCounter,
        sgCounter,
        hDisplacement,
        vDisplacement,
        unitScale,
        displayFontFactor,
        points,
        update,
        setOrigin,
        adjustLimit,
        scrollTo,
    ]);

    /**
     * The callback function for the ItemEditor. Only needed if focusItem is not null. The ItemEditor will use this in constructing change handlers
     * for its various child components. In particular, these handlers will call itemChange with an input element (or null) and a key that is obtained
     * from the focusItem through Item.getInfo().
     */
    const itemChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | number | null, key: string) => {
            if (focusItem) {
                const [edit, range] = focusItem.handleEditing(
                    e,
                    logIncrement,
                    deduplicatedSelection,
                    unitScale,
                    displayFontFactor,
                    key
                );
                const nodeGroups: Set<CNodeGroup> | null =
                    range === 'ENodesAndCNodeGroups' ? new Set<CNodeGroup>() : null;
                const nodes =
                    range == 'onlyThis'
                        ? edit(focusItem, list)
                        : deduplicatedSelection.reduce((acc: (ENode | CNodeGroup)[], item: Item) => {
                              //console.log(`Editing item ${item.key}`);
                              if (item instanceof CNode && nodeGroups) {
                                  if (nodeGroups.has(item.group as CNodeGroup)) {
                                      // In this case range is 'ENodesAndCNodeGroups' and we've already seen this item's CNodeGroup, so we don't edit it again.
                                      return acc;
                                  } else {
                                      nodeGroups.add(item.group as CNodeGroup);
                                  }
                              }
                              return edit(item, acc) as (ENode | CNodeGroup)[];
                          }, list);
                setList(nodes); // for some reason, the setter function is called twice here.
                setOrigin(false, points, focusItem, selection, list);
                if (focusItem instanceof Node) {
                    scrollTo(focusItem);
                }
                adjustLimit();
                setItemsMoved((prev) => [...prev]);
            }
        },
        [
            focusItem,
            logIncrement,
            deduplicatedSelection,
            selection,
            points,
            list,
            unitScale,
            displayFontFactor,
            adjustLimit,
            setOrigin,
            scrollTo,
        ]
    );

    const incrementChange = useCallback((val: number) => setLogIncrement(val), [setLogIncrement]);

    const adjustSelection = useCallback(
        (item: Item) => {
            const ha = highestActive(item);
            if (ha instanceof Item) {
                setSelection([ha]);
            } else {
                const lm = getLeafMembers(ha, true);
                setSelection([item, ...allItems.filter((it) => it !== item && lm.has(it))]);
            }
        },
        [allItems]
    );

    /**
     * Moves the selection in one of the four cardinal directions, by an amount determined by itemEditorConfig.logIncrement.
     * To be called from hotkey handlers.
     */
    const moveSelection = useCallback(
        (dirX: number, dirY: number) => {
            const inc = 10 ** logIncrement;
            move(selectedNodesDeduplicated, dirX * inc, dirY * inc);
            adjustLimit();
            setOrigin(false, points, focusItem, selection, list);
            if (focusItem instanceof Node) {
                scrollTo(focusItem);
            }
            setItemsMoved((prev) => [...prev]);
            throttledReport();
        },
        [
            logIncrement,
            selectedNodesDeduplicated,
            focusItem,
            list,
            points,
            selection,
            adjustLimit,
            setOrigin,
            scrollTo,
            setItemsMoved,
            throttledReport,
        ]
    );

    const changeUnitscale = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = validFloat(e.target.value, MIN_UNITSCALE, MAX_UNITSCALE);
            setUnitScale(val);
            allItems.forEach((it) => {
                if (it instanceof Label) {
                    it.updateLines(val, displayFontFactor);
                }
            });
            adjustLimit();
        },
        [allItems, displayFontFactor, adjustLimit]
    );

    const changeDisplayFontFactor = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = validFloat(e.target.value, MIN_DISPLAY_FONT_FACTOR, MAX_DISPLAY_FONT_FACTOR);
            setDisplayFontFactor(val);
            allItems.forEach((it) => {
                if (it instanceof Label) {
                    it.updateLines(unitScale, val);
                }
            });
            adjustLimit();
        },
        [allItems, unitScale, adjustLimit]
    );

    /**
     * Returns true if the rotation of the selection by the specified angle is within bounds.
     */
    const testRotation = useCallback(
        (angle: number) => {
            for (const node of selectedIndependentNodes) {
                const { x, y } = rotatePoint(node.x, node.y, origin.x, origin.y, angle, ROUNDING_DIGITS);
                if (x < 0 || x > MAX_X) return false;
                if (y < MIN_Y || y > MAX_Y) return false;
            }
            return itemsMoved !== null; // We use 'itemsMoved!==null' instead of 'true' to suppress a warning about an 'unnecessary dependency'
        },
        [selectedIndependentNodes, origin.x, origin.y, itemsMoved]
    );

    /**
     * Returns true if setting the scaling of the selection to the specified angle doesn't violate any constraints on the placement, radius, etc. of nodes.
     * May display error messages.
     */
    const testScaling = useCallback(
        (val: number) => {
            for (const node of selectedIndependentNodes) {
                const { x, y } = scalePoint(node.x100, node.y100, origin.x, origin.y, val * 1e-2);
                if (!isFinite(x) || !isFinite(y)) {
                    showModal(
                        'Buzz Lightyear Alert',
                        `Nodes cannot be sent to ${x == -Infinity || y == -Infinity ? '(negative) ' : ''}infinity, or beyond.`
                    );
                }
                if (x < 0 || x > MAX_X) return false;
                if (y < MIN_Y || y > MAX_Y) return false;
                if (transformFlags.scaleENodes && node instanceof ENode) {
                    const v = node.radius100 * val * 1e-2;
                    if (v < 0 || v > MAX_RADIUS) return false;
                }
                if (transformFlags.scaleLinewidths) {
                    const v = node.linewidth100 * val * 1e-2;
                    if (v < 0 || v > MAX_LINEWIDTH) return false;
                }
                if (
                    transformFlags.scaleDash &&
                    node.dash100.some((l) => {
                        const v = l * val * 1e-2;
                        return v < 0 || v > MAX_DASH_VALUE;
                    })
                )
                    return false;
            }
            return true;
        },
        [
            selectedIndependentNodes,
            origin,
            transformFlags.scaleDash,
            transformFlags.scaleENodes,
            transformFlags.scaleLinewidths,
            showModal,
        ]
    );

    /**
     * Rotates the selection by the specified angle (in degrees).
     */
    const rotateSelection = useCallback(
        (angle: number) => {
            selectedIndependentNodes.forEach((node) => {
                ({ x: node.x, y: node.y } = rotatePoint(
                    node.x,
                    node.y,
                    origin.x,
                    origin.y,
                    angle,
                    ROUNDING_DIGITS
                ));
                ({ x: node.x100, y: node.y100 } = rotatePoint(
                    node.x100,
                    node.y100,
                    origin.x,
                    origin.y,
                    angle,
                    ROUNDING_DIGITS
                ));
                node.invalidateDepNodeLocations();
            });
            adjustLimit();
            setRotation((prev) =>
                round(
                    getCyclicValue(
                        prev + angle,
                        MIN_ROTATION,
                        360,
                        10 ** Math.max(0, -MIN_ROTATION_LOG_INCREMENT)
                    ),
                    ROUNDING_DIGITS
                )
            );
            setItemsMoved((prev) => [...prev]);
        },
        [selectedIndependentNodes, origin, adjustLimit]
    );

    /**
     * Sets the scaling of the current selection to the indicated value, as a percentage of the respective 'original' size of the selected items.
     */
    const scaleSelection = useCallback(
        (newValue: number) => {
            if (testScaling(newValue)) {
                selectedNodesDeduplicated.forEach((node) => {
                    if (node.isIndependent()) {
                        ({ x: node.x, y: node.y } = scalePoint(
                            node.x100,
                            node.y100,
                            origin.x,
                            origin.y,
                            newValue * 1e-2
                        ));
                        node.invalidateDepNodeLocations();
                        if (node instanceof CNode) {
                            node.dist0 = round(node.dist0_100 * newValue * 1e-2, ROUNDING_DIGITS);
                            node.dist1 = round(node.dist1_100 * newValue * 1e-2, ROUNDING_DIGITS);
                        }
                    }
                    if (node instanceof ENode) {
                        if (transformFlags.scaleENodes) {
                            node.scaleNode(newValue);
                            if (transformFlags.scaleLinewidths) {
                                node.linewidth = round(node.linewidth100 * newValue * 1e-2, ROUNDING_DIGITS);
                            }
                            if (transformFlags.scaleDash) {
                                node.dash = node.dash100.map((l) =>
                                    round(l * newValue * 1e-2, ROUNDING_DIGITS)
                                );
                            }
                        }
                    }
                });
                const affectedNodeGroups: CNodeGroup[] = selectedNodesDeduplicated
                    .filter((it) => it instanceof CNode)
                    .map((node) => node.group) // An array of those NodeGroups that have members included in selection.
                    .filter((g, i, arr) => i === arr.indexOf(g)) as CNodeGroup[];
                affectedNodeGroups.forEach((group) => {
                    if (group) {
                        if (transformFlags.scaleLinewidths)
                            group.linewidth = round(group.linewidth100 * newValue * 1e-2, ROUNDING_DIGITS);
                        if (transformFlags.scaleDash)
                            group.dash = group.dash100.map((l) =>
                                round(l * newValue * 1e-2, ROUNDING_DIGITS)
                            );
                    }
                });
                if (
                    transformFlags.scaleLinewidths ||
                    transformFlags.scaleDash ||
                    transformFlags.scaleConnectors ||
                    transformFlags.flipArrowheads ||
                    transformFlags.scaleENodes
                ) {
                    const affectedSNodes = Array.from(
                        addDependents(selectedNodesDeduplicated, false).values()
                    ).filter(
                        (it) =>
                            it instanceof SNode &&
                            Array.from(it.getAncestors()).every((node) =>
                                selectedNodesDeduplicated.includes(node)
                            )
                    ) as SNode[];
                    for (const node of affectedSNodes) {
                        if (transformFlags.scaleConnectors) {
                            node.scaleConnector(newValue);
                            if (transformFlags.scaleLinewidths) {
                                node.conLinewidth = round(
                                    node.conLinewidth100 * newValue * 1e-2,
                                    ROUNDING_DIGITS
                                );
                            }
                            if (transformFlags.scaleDash) {
                                node.conDash = node.conDash100.map((v) =>
                                    round(v * newValue * 1e-2, ROUNDING_DIGITS)
                                );
                            }
                        }
                        if (transformFlags.scaleArrowheads) {
                            node.scaleArrowhead(newValue);
                            if (transformFlags.scaleLinewidths) {
                                node.ahLinewidth = round(
                                    node.ahLinewidth100 * newValue * 1e-2,
                                    ROUNDING_DIGITS
                                );
                            }
                            if (transformFlags.scaleDash) {
                                node.ahDash = node.ahDash100.map((v) =>
                                    round(v * newValue * 1e-2, ROUNDING_DIGITS)
                                );
                            }
                        }
                        if (transformFlags.scaleENodes) {
                            node.scaleNode(newValue);
                        }
                    }
                }
                adjustLimit();
                setScaling(newValue);
                setItemsMoved((prev) => [...prev]);
            }
        },
        [
            selectedNodesDeduplicated,
            origin,
            adjustLimit,
            testScaling,
            transformFlags.scaleDash,
            transformFlags.scaleENodes,
            transformFlags.scaleLinewidths,
            transformFlags.scaleConnectors,
            transformFlags.scaleArrowheads,
            transformFlags.flipArrowheads,
        ]
    );

    /**
     * Rounds the location of each selected item to the nearest pixel.
     */
    const roundLocations = useCallback(() => {
        selectedNodesDeduplicated.forEach((node) => {
            node.x = node.x100 = Math.round(node.x);
            node.y = node.y100 = Math.round(node.y);
            node.invalidateDepNodeLocations();
        });
        setOrigin(false, points, focusItem, selection, list);
        setItemsMoved((prev) => [...prev]);
    }, [selectedNodesDeduplicated, selection, points, focusItem, list, setOrigin]);

    const hFlip = useCallback(() => {
        selectedNodesDeduplicated.forEach((node) => {
            if (node.isIndependent()) {
                node.x = 2 * origin.x - node.x;
                node.x100 = 2 * origin.x - node.x100;
                node.invalidateDepNodeLocations();
                if (node instanceof CNode) {
                    node.angle0 = -node.angle0;
                    node.angle1 = -node.angle1;
                }
            }
            for (const o of node.ornaments) {
                o.angle = getCyclicValue(180 - o.angle, MIN_ROTATION, 360, ROUNDING_DIGITS);
            }
        });
        if (transformFlags.flipArrowheads) {
            flipAffectedArrowheads(selectedIndependentNodes);
        }
        adjustLimit();
        setItemsMoved((prev) => [...prev]);
    }, [
        selectedNodesDeduplicated,
        selectedIndependentNodes,
        origin,
        adjustLimit,
        transformFlags.flipArrowheads,
    ]);

    const vFlip = useCallback(() => {
        selectedNodesDeduplicated.forEach((node) => {
            if (node.isIndependent()) {
                node.y = 2 * origin.y - node.y;
                node.y100 = 2 * origin.y - node.y100;
                node.invalidateDepNodeLocations();
                if (node instanceof CNode) {
                    node.angle0 = -node.angle0;
                    node.angle1 = -node.angle1;
                }
            }
            for (const o of node.ornaments) {
                o.angle = getCyclicValue(-o.angle, MIN_ROTATION, 360, ROUNDING_DIGITS);
            }
        });
        if (transformFlags.flipArrowheads) {
            flipAffectedArrowheads(selectedIndependentNodes);
        }
        adjustLimit();
        setItemsMoved((prev) => [...prev]);
    }, [
        selectedNodesDeduplicated,
        selectedIndependentNodes,
        origin,
        adjustLimit,
        transformFlags.flipArrowheads,
    ]);

    /**
     * Turn all contours that have members in the supplied array into regular polygons.
     */
    const turnIntoRegularPolygons = useCallback(
        (selection: Node[]) => {
            (
                selection
                    .map((it) => {
                        if (it instanceof CNode) {
                            it.angle0 = it.angle1 = 0;
                            it.dist0 = it.dist0_100 = it.dist1 = it.dist1_100 = DEFAULT_DISTANCE;
                            return it.group;
                        } else return null;
                    })
                    .filter((g, i, arr) => g instanceof CNodeGroup && i === arr.indexOf(g)) as CNodeGroup[]
            ).forEach((g) => {
                g.equalizeCentralAngles(g.members[0]);
                g.equalizeDistancesFromCenter(g.members[0]);
            });
            adjustLimit();
            setItemsMoved((prev) => [...prev]);
        },
        [adjustLimit]
    );

    /**
     * Rotate all contours that have members in the supplied array by -180/n degrees, where n is the number of nodes in the respective contour.
     */
    const rotatePolygons = useCallback(
        (selection: Node[]) => {
            (
                selection
                    .map((it) => (it instanceof CNode ? it.group : null))
                    .filter((g, i, arr) => g instanceof CNodeGroup && i === arr.indexOf(g)) as CNodeGroup[]
            ).forEach((g) => {
                const c = g.getNodalCenter();
                const angle = -180 / g.members.length;
                g.members.forEach((node) => {
                    ({ x: node.x, y: node.y } = rotatePoint(
                        node.x,
                        node.y,
                        c.x,
                        c.y,
                        angle,
                        ROUNDING_DIGITS
                    ));
                    ({ x: node.x100, y: node.y100 } = rotatePoint(
                        node.x100,
                        node.y100,
                        c.x,
                        c.y,
                        angle,
                        ROUNDING_DIGITS
                    ));
                    node.invalidateDepNodeLocations();
                });
            });
            adjustLimit();
            setItemsMoved((prev) => [...prev]);
        },
        [adjustLimit]
    );

    /**
     * Either sets or increases/decreases the shading of the selected nodes, depending on whether the third argument is true.
     */
    const setShading = useCallback((selection: Node[], val: number, inc: boolean = false) => {
        selection
            .map((it) => (it.group instanceof CNodeGroup ? it.group : it))
            .filter((it, i, arr) => i === arr.indexOf(it))
            .forEach((obj) => {
                const newVal = Math.min(
                    Math.max(inc ? round(obj.shading + val, ROUNDING_DIGITS) : val, 0),
                    1
                );
                obj.shading = newVal;
            });
        setPoints((prev) => [...prev]); // to trigger a re-render
    }, []);

    /**
     * Either sets or increases/decreases the linewidth of the selected nodes, depending on whether the third argument is true.
     */
    const setLinewidth = useCallback((selection: Node[], val: number, inc: boolean = false) => {
        selection
            .map((it) => (it.group instanceof CNodeGroup ? it.group : it))
            .filter((it, i, arr) => i === arr.indexOf(it))
            .forEach((obj) => {
                const newLw = Math.min(
                    Math.max(inc ? round(obj.linewidth + val, ROUNDING_DIGITS) : val, 0),
                    MAX_LINEWIDTH
                );
                obj.linewidth = obj.linewidth100 = newLw;
            });
        setPoints((prev) => [...prev]); // to trigger a re-render
    }, []);

    /**
     * Creates a group of the currently selected nodes or (where applicable) their respective highest active groups.
     */
    const createGroup = useCallback(() => {
        const toBeGrouped = getTopToBeCopied(deduplicatedSelection, true);
        const createCNG = toBeGrouped.every((m) => m instanceof CNode);
        const createSG = toBeGrouped.every((m) => !(m instanceof CNode));

        if (!createCNG && !createSG) {
            showModal(
                'Invalid group composition',
                `Cannot create a group that contains both contour nodes and entity nodes or groups.`
            );
            return;
        }
        if (createCNG && toBeGrouped.length > MAX_CNODEGROUP_SIZE) {
            showModal(
                'Too damn high!',
                `The maximum size of a contour node group is ${MAX_CNODEGROUP_SIZE} nodes.`
            );
            return;
        }
        if (createCNG && list.length === MAX_LIST_SIZE) {
            // Here we check whether creating the new CNodeGroup would lead to the deletion of
            // at least one existing CNodeGroup:
            const affectedGroups = toBeGrouped
                .map((item) => item.group)
                .filter((g, i, arr) => g && i === arr.indexOf(g)) as CNodeGroup[];
            if (!affectedGroups.some((g) => g.members.every((m) => toBeGrouped.includes(m)))) {
                showModal('Sorry!', `Creating this new group would push our list size over the limit.`);
                return;
            }
        }
        if (createSG) {
            const maxDepth = toBeGrouped.reduce((acc, it) => {
                const d = depth(it);
                return acc > d ? acc : d;
            }, 0);
            if (maxDepth >= MAX_GROUP_LEVEL) {
                showModal('Too damn high!', `The maximum group level is ${MAX_GROUP_LEVEL}.`);
                return;
            }
        }

        const oldGroups = toBeGrouped.map((m) => m.group).filter((g, i, arr) => g && i === arr.indexOf(g));
        let newList = list,
            group: Group<any>;
        if (createCNG) {
            group = new CNodeGroup(cngCounter);
            group.members = toBeGrouped;
            (group as CNodeGroup).copyNonMemberValuesFrom(...(oldGroups as CNodeGroup[]));
            newList = [...newList, group as CNodeGroup];
            setCNGCounter((prev) => prev + 1);
        } else {
            group = new StandardGroup<Item | Group<any>>(sgCounter, toBeGrouped);
            setSGCounter((prev) => prev + 1);
        }
        oldGroups.forEach((g) => {
            if (g) {
                g.members = g.members.filter((m) => !toBeGrouped.includes(m));
                if (g.members.length == 0) {
                    newList = purge(g, newList);
                }
            }
        });
        toBeGrouped.forEach((member) => {
            member.group = group;
            member.isActiveMember = true;
        });
        update({ list: newList });
        if (focusItem) adjustSelection(focusItem);
    }, [list, deduplicatedSelection, update, cngCounter, sgCounter, focusItem, adjustSelection, showModal]);

    const leaveGroup = useCallback(() => {
        const affected = deduplicatedSelection
            .map((item) => {
                const groups = getGroups(item);
                return groups[1] > 0 ? groups[0][groups[1] - 1] : item;
            })
            .filter((item, i, arr) => i === arr.indexOf(item));
        affected.forEach((m) => (m.isActiveMember = false));
        if (affected instanceof Item) {
            setAdding(false);
            setDissolveAdding(false);
        }
        if (focusItem) adjustSelection(focusItem);
    }, [deduplicatedSelection, focusItem, adjustSelection]);

    const rejoinGroup = useCallback(() => {
        const affected = deduplicatedSelection
            .map((item) => highestActive(item))
            .filter((item, i, arr) => item.group && i === arr.indexOf(item));
        affected.forEach((item) => {
            item.isActiveMember = true;
        });
        if (focusItem) adjustSelection(focusItem);
    }, [deduplicatedSelection, focusItem, adjustSelection]);

    const restoreGroup = useCallback(() => {
        const affected = deduplicatedSelection
            .map((item) => highestActive(item))
            .filter((item, i, arr) => !(item instanceof Item) && i === arr.indexOf(item)) as Group<any>[];
        affected.forEach((g) => {
            g.members.forEach((m) => (m.isActiveMember = true));
        });
        if (focusItem) adjustSelection(focusItem);
    }, [deduplicatedSelection, focusItem, adjustSelection]);

    const displayCode = useCallback(
        (pixel: number) => {
            setCode(getCode(list, pixel));
        },
        [list]
    );

    const loadDiagram = useCallback(
        (code: string, replace: boolean) => {
            if (false) {
                // for debugging purposes
                load(code, unitScale, displayFontFactor, 0, 0, 0);
                console.log('Success!');
                return;
            }
            let newList: (ENode | CNodeGroup)[] = [],
                newPixel = 0,
                newENodeCounter = 0,
                newCNGCounter = 0,
                newSGCounter = 0;
            try {
                [newList, newPixel, newENodeCounter, newCNGCounter, newSGCounter] = replace
                    ? load(code, undefined, displayFontFactor, 0, 0, 0)
                    : load(code, unitScale, displayFontFactor, eNodeCounter, cngCounter, sgCounter);
                update({
                    list: replace ? newList : [...list, ...newList],
                    unitScale: replace ? newPixel : undefined,
                    eNodeCounter: newENodeCounter,
                    cngCounter: newCNGCounter,
                    sgCounter: newSGCounter,
                    code,
                });
                if (replace) {
                    setPreselection1([]);
                    setPreselection2([]);
                    setSelection([]);
                    setFocusItem(null);
                    setOrigin(true, points, null, [], newList);
                }
                adjustLimit(getItems(newList));
            } catch (e: any) {
                if (e.msg) {
                    showModal('Parsing failed', e.msg, e.extraWide);
                } else {
                    console.error('Parsing failed:', e.message, e.stack);
                }
            }
        },
        [
            list,
            eNodeCounter,
            cngCounter,
            sgCounter,
            points,
            unitScale,
            displayFontFactor,
            update,
            adjustLimit,
            setOrigin,
            showModal,
        ]
    );

    useEffect(() => {
        if (diagramCode) {
            loadDiagram(diagramCode, true);
        }
        reset();
    }, [diagramCode, loadDiagram, reset]);

    const handleTextAreaChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setCode(e.target.value);
        },
        [setCode]
    );

    const handleChangeAdding = useCallback(() => {
        const add = !adding;
        setAdding(add);
        if (add) setDissolveAdding(!add);
    }, [adding, setAdding, setDissolveAdding]);

    const handleChangeDissolveAdding = useCallback(() => {
        const add = !dissolveAdding;
        setDissolveAdding(add);
        if (add) setAdding(!add);
    }, [dissolveAdding, setDissolveAdding, setAdding]);

    const handleDelete = useCallback(
        () => deleteItems(deduplicatedSelection),
        [deleteItems, deduplicatedSelection]
    );

    const handleGenerate = useCallback(() => displayCode(unitScale), [displayCode, unitScale]);

    const handleLoad = useCallback(() => loadDiagram(code, replace), [loadDiagram, code, replace]);

    const handleReplace = useCallback(() => setReplace(!replace), [setReplace, replace]);

    const numberOfTbcENodes = useMemo(
        () => deduplicatedSelection.reduce((acc, m) => (m instanceof ENode ? acc + 1 : acc), 0),
        [deduplicatedSelection]
    );

    const numberOfTbcCNGs = useMemo(() => getCNodeGroups(topMembers).length, [topMembers]);

    const copyingWouldConflictWithMaxCNGSize = useMemo(() => {
        const tbcContainingCNGs = topMembers.filter((it) => it instanceof CNode).map((node) => node.group);
        const dedupTbcContainingCNGs = tbcContainingCNGs.filter((g, i, arr) => i === arr.indexOf(g));
        return dedupTbcContainingCNGs.some(
            (group) =>
                group &&
                group.members.length +
                    tbcContainingCNGs.reduce((acc, g) => (g === group ? acc + 1 : acc), 0) >
                    MAX_CNODEGROUP_SIZE
        );
    }, [topMembers]);

    const copyingWouldConflictWithMaxNumberOfOrnaments = useMemo(() => {
        const nonTbcNodesWithTbcOrnaments = topMembers
            .filter((it) => it instanceof Ornament || it instanceof StandardGroup)
            .flatMap((it) => {
                if (it instanceof Ornament) {
                    return deduplicatedSelection.includes(it.node) ? [] : [it.node];
                } else if (it instanceof StandardGroup) {
                    const lm = getLeafMembers(it);
                    return Array.from(lm)
                        .filter((m) => m instanceof Ornament && !deduplicatedSelection.includes(m.node))
                        .map((o) => (o as Ornament).node);
                }
            });
        const dedupNonTbcNodesWithTbcOrnaments = nonTbcNodesWithTbcOrnaments.filter(
            (g, i, arr) => i === arr.indexOf(g)
        );
        return dedupNonTbcNodesWithTbcOrnaments.some(
            (node) =>
                node &&
                node.ornaments.length +
                    nonTbcNodesWithTbcOrnaments.reduce((acc, n) => (n === node ? acc + 1 : acc), 0) >
                    MAX_NUMBER_OF_ORNAMENTS
        );
    }, [topMembers, deduplicatedSelection]);

    /************************************************************************************************
     * HOTKEYS
     ************************************************************************************************/

    const canCopy: boolean = useMemo(
        () =>
            deduplicatedSelection.length > 0 &&
            list.length + numberOfTbcENodes + numberOfTbcCNGs <= MAX_LIST_SIZE &&
            !copyingWouldConflictWithMaxCNGSize &&
            !copyingWouldConflictWithMaxNumberOfOrnaments &&
            (hDisplacement >= 0 || leftMostSelected + hDisplacement >= 0) &&
            (vDisplacement <= 0 || topMostSelected + vDisplacement <= MAX_Y) &&
            (hDisplacement <= 0 || rightMostSelected + hDisplacement <= MAX_X) &&
            (vDisplacement >= 0 || bottomMostSelected + vDisplacement >= MIN_Y),
        [
            deduplicatedSelection,
            list,
            numberOfTbcENodes,
            numberOfTbcCNGs,
            copyingWouldConflictWithMaxCNGSize,
            copyingWouldConflictWithMaxNumberOfOrnaments,
            hDisplacement,
            vDisplacement,
            leftMostSelected,
            rightMostSelected,
            topMostSelected,
            bottomMostSelected,
        ]
    );

    const canDelete: boolean = selection.length > 0;

    const canAddENodes: boolean = points.length > 0 && list.length < MAX_LIST_SIZE;

    const canAddContours: boolean = points.length > 0 && list.length < MAX_LIST_SIZE;

    const canAddOrnaments: boolean = useMemo(
        () =>
            selectedNodesDeduplicated.length > 0 &&
            deduplicatedSelection.every(
                (it) => !(it instanceof Node) || it.ornaments.length <= MAX_NUMBER_OF_ORNAMENTS
            ),
        [selectedNodesDeduplicated, deduplicatedSelection]
    );

    const canCreateDepItem: boolean = useMemo(() => {
        const info = depItemInfos[depItemIndex];
        return (
            selectedNodes.length >= info.min &&
            ((info.min === 1 && canAddOrnaments) || // If info.min===1, we are going to add Ornaments, and otherwise ENodes.
                (info.min > 1 && list.length + selectedNodes.length < MAX_LIST_SIZE))
        );
    }, [list, selectedNodes, depItemIndex, canAddOrnaments]);

    const canMoveLeft: boolean = leftMostSelected - 10 ** logIncrement >= 0;

    const canMoveRight: boolean = rightMostSelected + 10 ** logIncrement <= MAX_X;

    const canMoveUp: boolean = topMostSelected + 10 ** logIncrement <= MAX_Y;

    const canMoveDown: boolean = bottomMostSelected - 10 ** logIncrement >= MIN_Y;

    const canHFlip: boolean = useMemo(
        () =>
            selectedIndependentNodes.length > 0 &&
            !selectedIndependentNodes.some((item) => {
                const x = 2 * origin.x - item.x; // simulate hFlip on item
                return itemsMoved && (x < 0 || x > MAX_X); // 'itemsMoved &&' added to suppress a warning about an 'unnecessary dependency'
            }),
        [selectedIndependentNodes, origin, itemsMoved]
    );

    const canVFlip: boolean = useMemo(
        () =>
            selectedIndependentNodes.length > 0 &&
            !selectedIndependentNodes.some((item) => {
                const y = 2 * origin.y - item.y; // simulate vFlip on item
                return itemsMoved && (y < MIN_Y || y > MAX_Y);
            }),
        [selectedIndependentNodes, origin, itemsMoved]
    );

    const canRotateCWBy45Deg: boolean = useMemo(() => testRotation(-45), [testRotation]);

    const canRotateCCWBy45Deg: boolean = useMemo(() => testRotation(45), [testRotation]);

    const canRotateCW: boolean = useMemo(
        () => testRotation(-(10 ** logIncrement)),
        [logIncrement, testRotation]
    );

    const canRotateCCW: boolean = useMemo(
        () => testRotation(10 ** logIncrement),
        [logIncrement, testRotation]
    );

    /* // This doesn't work for some reason:
    useHotkeys(hotkeyMap['undo'], undo, 
        { enabled: canUndo && !modalShown });
    useHotkeys(hotkeyMap['redo'], redo, 
        { enabled: canRedo && !modalShown });
*/
    useHotkeys(hotkeyMap['abstract'], () => abstractSelection(), {
        enabled: selectedNodes.length > 0 && !modalShown,
    });
    useHotkeys(hotkeyMap['copy'], copySelection, { enabled: canCopy && !modalShown });
    useHotkeys(hotkeyMap['delete'], () => deleteItems(deduplicatedSelection), {
        enabled: canDelete && !modalShown,
    });
    useHotkeys(
        hotkeyMap['clear points'],
        () => {
            setPoints([]);
            setOrigin(true, []);
        },
        { enabled: !modalShown, preventDefault: true }
    );
    useHotkeys(hotkeyMap['add nodes'], addEntityNodes, { enabled: canAddENodes && !modalShown });
    useHotkeys(hotkeyMap['add contours'], addContours, { enabled: canAddContours && !modalShown });
    useHotkeys(hotkeyMap['create'], () => createDepItem(depItemIndex), {
        enabled: !modalShown && (document.activeElement as HTMLElement).closest('.pasi') !== null,
        preventDefault: true,
    });
    // We enable this even if the Create button is disabled, in order to make sure that the default behavior (which is to scroll down) is
    // prevented as long as the canvas is the active element.
    useHotkeys(hotkeyMap['add labels'], () => createDepItem(depItemKeys.indexOf('lbl')), {
        enabled: canAddOrnaments && !modalShown,
    });
    useHotkeys(hotkeyMap['move up'], () => moveSelection(0, 1), {
        enabled:
            canMoveUp &&
            !modalShown &&
            focusItem !== null &&
            (document.activeElement as HTMLElement).closest('.pasi') !== null,
        preventDefault: true,
    });
    useHotkeys(hotkeyMap['move left'], () => moveSelection(-1, 0), {
        enabled:
            canMoveLeft &&
            !modalShown &&
            focusItem !== null &&
            (document.activeElement as HTMLElement).closest('.pasi') !== null,
        preventDefault: true,
    });
    useHotkeys(hotkeyMap['move down'], () => moveSelection(0, -1), {
        enabled:
            canMoveDown &&
            !modalShown &&
            focusItem !== null &&
            (document.activeElement as HTMLElement).closest('.pasi') !== null,
        preventDefault: true,
    });
    useHotkeys(hotkeyMap['move right'], () => moveSelection(1, 0), {
        enabled:
            canMoveRight &&
            !modalShown &&
            focusItem !== null &&
            (document.activeElement as HTMLElement).closest('.pasi') !== null,
        preventDefault: true,
    });
    useHotkeys(hotkeyMap['set increment to 0.1px'], () => setLogIncrement(-1), { enabled: !modalShown });
    useHotkeys(hotkeyMap['set increment to 1px'], () => setLogIncrement(0), { enabled: !modalShown });
    useHotkeys(hotkeyMap['set increment to 10px'], () => setLogIncrement(1), { enabled: !modalShown });
    useHotkeys(hotkeyMap['set increment to 100px'], () => setLogIncrement(2), { enabled: !modalShown });
    useHotkeys(hotkeyMap['dec sh'], () => setShading(selectedNodesDeduplicated, -0.1, true), {
        enabled: selectedNodesDeduplicated.length > 0 && !modalShown,
    });
    useHotkeys(hotkeyMap['inc sh'], () => setShading(selectedNodesDeduplicated, 0.1, true), {
        enabled: selectedNodesDeduplicated.length > 0 && !modalShown,
    });
    useHotkeys(hotkeyMap['sh 0'], () => setShading(selectedNodesDeduplicated, 0), {
        enabled: selectedNodesDeduplicated.length > 0 && !modalShown,
    });
    useHotkeys(hotkeyMap['sh 1'], () => setShading(selectedNodesDeduplicated, 1), {
        enabled: selectedNodesDeduplicated.length > 0 && !modalShown,
    });
    useHotkeys(hotkeyMap['dec lw'], () => setLinewidth(selectedNodesDeduplicated, -0.1, true), {
        enabled: selectedNodesDeduplicated.length > 0 && !modalShown,
    });
    useHotkeys(hotkeyMap['inc lw'], () => setLinewidth(selectedNodesDeduplicated, 0.1, true), {
        enabled: selectedNodesDeduplicated.length > 0 && !modalShown,
    });
    useHotkeys(hotkeyMap['lw 0'], () => setLinewidth(selectedNodesDeduplicated, 0), {
        enabled: selectedNodesDeduplicated.length > 0 && !modalShown,
    });
    useHotkeys(hotkeyMap['lw 1'], () => setLinewidth(selectedNodesDeduplicated, 1), {
        enabled: selectedNodesDeduplicated.length > 0 && !modalShown,
    });
    useHotkeys(hotkeyMap['rotate by 45° counter-clockwise'], () => rotateSelection(45), {
        enabled: canRotateCCWBy45Deg && !modalShown,
    });
    useHotkeys(hotkeyMap['rotate by 45° clockwise'], () => rotateSelection(-45), {
        enabled: canRotateCWBy45Deg && !modalShown,
    });
    useHotkeys(hotkeyMap['rotate counter-clockwise'], () => rotateSelection(10 ** logIncrement), {
        enabled: canRotateCCW && !modalShown,
    });
    useHotkeys(hotkeyMap['rotate clockwise'], () => rotateSelection(-(10 ** logIncrement)), {
        enabled: canRotateCW && !modalShown,
    });
    useHotkeys(hotkeyMap['scale down'], () => scaleSelection(Math.max(0, scaling - 10 ** logIncrement)), {
        enabled: !modalShown,
    });
    useHotkeys(hotkeyMap['round'], roundLocations, {
        enabled: selectedNodesDeduplicated.length > 0 && !modalShown,
    });
    useHotkeys(
        hotkeyMap['scale up'],
        () => scaleSelection(Math.min(MAX_SCALING, scaling + 10 ** logIncrement)),
        { enabled: !modalShown }
    );
    useHotkeys(hotkeyMap['hflip'], hFlip, { enabled: canHFlip && !modalShown });
    useHotkeys(hotkeyMap['vflip'], vFlip, { enabled: canVFlip && !modalShown });
    useHotkeys(hotkeyMap['polygons'], () => turnIntoRegularPolygons(selectedNodesDeduplicated), {
        enabled: selectedNodesDeduplicated.some((i) => i instanceof CNode) && !modalShown,
    });
    useHotkeys(hotkeyMap['rotate by 180/n deg'], () => rotatePolygons(selectedNodesDeduplicated), {
        enabled: selectedNodesDeduplicated.some((i) => i instanceof CNode) && !modalShown,
    });
    useHotkeys(hotkeyMap['create group'], createGroup, { enabled: !modalShown });
    useHotkeys(hotkeyMap['leave'], leaveGroup, { enabled: focusItem !== null && !modalShown });
    useHotkeys(hotkeyMap['rejoin'], rejoinGroup, { enabled: focusItem !== null && !modalShown });
    useHotkeys(hotkeyMap['restore'], restoreGroup, { enabled: !modalShown });
    useHotkeys(
        hotkeyMap['adding'],
        () => {
            setAdding(true);
            setDissolveAdding(false);
        },
        { enabled: focusItem !== null && !modalShown }
    );
    useHotkeys(
        hotkeyMap['dissolve-adding'],
        () => {
            setDissolveAdding(true);
            setAdding(false);
        },
        { enabled: focusItem !== null && !modalShown }
    );
    const throttledGenerate = useThrottle(() => displayCode(unitScale), 500);
    useHotkeys(hotkeyMap['generate code'], throttledGenerate, {
        enabled: () => !(document.activeElement instanceof HTMLButtonElement) && !modalShown,
    });
    const throttledLoadDiagram = useThrottle(() => loadDiagram(code, replace), 500);
    useHotkeys(hotkeyMap['load diagram'], throttledLoadDiagram, {
        enableOnFormTags: ['textarea'],
        preventDefault: true,
        enabled: !modalShown,
    });
    // 'Secret' hotkey:
    const throttledToggleTrueBlack = useThrottle(() => {
        setTrueBlack((prev) => !prev);
    }, 100);
    useHotkeys('mod+b', throttledToggleTrueBlack);

    /************************************************************************************************
     * MODAL DIALOG CALLBACKS ETC.
     ************************************************************************************************/

    const dialogStyle = useMemo(
        () => ({
            content: {
                top: '50%',
                left: '50%',
                width: dialog.extraWide ? '60rem' : '40rem', // We use wider boxes to display more complex content.
                right: 'auto',
                bottom: 'auto',
                marginRight: '-50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'transparent',
                border: 'none',
                padding: 'none',
            },
        }),
        [dialog]
    );

    const overlayClass = useMemo(
        () => clsx('fixed inset-0', dark ? 'bg-black/70' : 'bg-gray-900/70'),
        [dark]
    );

    const modalDialogClass = useMemo(
        () =>
            clsx(
                'pasi prose prose-lg',
                dark ? 'prose-dark' : 'prose-light',
                dialog.extraWide ? 'min-w-[60rem]' : 'min-w-[40rem]',
                'grid justify-items-center bg-modalbg px-8 py-4 border border-btnfocusring rounded-2xl'
            ),
        [dark, dialog]
    );

    const okButtonClass = useMemo(
        () => clsx('w-20 rounded-xl', dialog.title ? 'mt-6 mb-4' : 'mt-4 mb-2'),
        [dialog]
    );

    const modalOnAfterOpen = useCallback(() => setTimeout(() => okButtonRef.current?.focus(), 500), []);

    const modalOnRequestClose = useCallback(() => {
        document.body.classList.add('modal-closing');
        setModalShown(false);
    }, [setModalShown]);

    const modalOnAfterClose = useCallback(() => {
        document.body.classList.remove('modal-closing');
    }, []);

    const modalOnClick = useCallback(() => okButtonRef.current?.focus(), []);

    const okButtonOnClick = useCallback(() => {
        document.body.classList.add('modal-closing'); // This will tell any anchor elements visible under the Overlay to return to
        // their original color.
        setModalShown(false);
    }, [setModalShown]);

    /********************************************************************************************
     * RENDERING
     *******************************************************************************************/

    const primaryColor = trueBlack ? BLACK : dark ? DEFAULT_HSL_DARK_MODE : DEFAULT_HSL_LIGHT_MODE;

    const codePanelStyle = useMemo(() => ({ minWidth: canvasWidth }), [canvasWidth]);

    const depItemMenu = useMemo(
        () => (
            <Menu>
                <MenuButton className={menuButtonClass}>
                    <div className='flex-none mx-2'>{depItemInfos[depItemIndex].getImageComp(dark)}</div>
                    <div className='flex-1'>{depItemInfos[depItemIndex].label}</div>
                    <div className='flex-none w-[28px] mx-2'>
                        <ChevronSVG />
                    </div>
                </MenuButton>
                <MenuItemList>
                    {depItemInfos.map((label, index) => (
                        <MenuItem key={`di-${index}`}>
                            <button
                                className={menuItemButtonClassName}
                                onClick={() => setDepItemIndex(index)}
                            >
                                <div className='inline mr-2'>{label.getImageComp(dark)}</div>
                                {label.label}
                            </button>
                        </MenuItem>
                    ))}
                </MenuItemList>
            </Menu>
        ),
        [dark, depItemIndex, setDepItemIndex]
    );

    const transformTabDisabled = selectedNodesDeduplicated.length === 0;

    const groupTabDisabled = !focusItem;

    const tabIndex =
        (userSelectedTabIndex === 1 && transformTabDisabled) ||
        (userSelectedTabIndex === 2 && groupTabDisabled)
            ? 0
            : userSelectedTabIndex;

    const editorTabClass = useMemo(
        () =>
            clsx(
                tabClass,
                'col-span-3 border-l-0 rounded-tl-xl data-[selected]:border-r-0',
                tabIndex === 1 && 'rounded-br-xl',
                tabIndex === 2 && 'border-r-0'
            ),
        [tabIndex]
    );

    const transformTabClass = useMemo(
        () =>
            clsx(
                tabClass,
                'col-span-4 data-[selected]:border-x-0',
                tabIndex === 0 && 'border-l-[1px] rounded-bl-xl border-l-0',
                tabIndex == 2 && 'border-r-[1px] rounded-br-xl border-r-0'
            ),
        [tabIndex]
    );

    const groupTabClass = useMemo(
        () =>
            clsx(
                tabClass,
                'col-span-3 border-r-0 rounded-tr-xl data-[selected]:border-l-0',
                tabIndex === 0 && 'border-l-0',
                tabIndex === 1 && 'rounded-bl-xl'
            ),
        [tabIndex]
    );

    const canvasEditor = useMemo(
        () => (
            <CanvasEditor
                grid={grid}
                hDisp={hDisplacement}
                vDisp={vDisplacement}
                displayFontFactor={displayFontFactor}
                changeHGap={(e) =>
                    setGrid((prevGrid) => ({
                        ...prevGrid,
                        hGap: validFloat(e.target.value, MIN_GAP, MAX_GAP),
                    }))
                }
                changeVGap={(e) =>
                    setGrid((prevGrid) => ({
                        ...prevGrid,
                        vGap: validFloat(e.target.value, MIN_GAP, MAX_GAP),
                    }))
                }
                changeHShift={(e) =>
                    setGrid((prevGrid) => ({
                        ...prevGrid,
                        hShift: validFloat(e.target.value, MIN_SHIFT, MAX_SHIFT),
                    }))
                }
                changeVShift={(e) =>
                    setGrid((prevGrid) => ({
                        ...prevGrid,
                        vShift: validFloat(e.target.value, MIN_SHIFT, MAX_SHIFT),
                    }))
                }
                changeSnapToNode={() =>
                    setGrid((prevGrid) => ({
                        ...prevGrid,
                        snapToNodes: !prevGrid.snapToNodes,
                    }))
                }
                changeSnapToCC={() =>
                    setGrid((prevGrid) => ({
                        ...prevGrid,
                        snapToContourCenters: !prevGrid.snapToContourCenters,
                    }))
                }
                changeHDisp={(e) =>
                    setHDisplacement(validFloat(e.target.value, MIN_DISPLACEMENT, MAX_DISPLACEMENT))
                }
                changeVDisp={(e) =>
                    setVDisplacement(validFloat(e.target.value, MIN_DISPLACEMENT, MAX_DISPLACEMENT))
                }
                changeDFF={changeDisplayFontFactor}
                reset={() => {
                    setGrid(createGrid());
                    setHDisplacement(DEFAULT_HDISPLACEMENT);
                    setVDisplacement(DEFAULT_VDISPLACEMENT);
                }}
            />
        ),
        [
            grid,
            hDisplacement,
            vDisplacement,
            displayFontFactor,
            setGrid,
            setHDisplacement,
            setVDisplacement,
            changeDisplayFontFactor,
        ]
    );

    /* eslint-disable react-hooks/exhaustive-deps */
    // The dependencies points, itemsMoved, and itemsDragged are needed because when they change, this can mean that focusItem has changed.
    const focusItemInfo = useMemo(
        () => focusItem?.getInfo(list) || [],
        [list, focusItem, points, itemsMoved, itemsDragged]
    );
    /* eslint-enable react-hooks/exhaustive-deps */

    // The delete button gets some special colors:
    const deleteButtonStyle = useMemo(
        () =>
            clsx(
                'rounded-xl',
                dark
                    ? clsx(
                          'bg-[#4a3228]/85 text-red-700 border-btnborder/50 enabled:hover:text-btnhovercolor',
                          'enabled:hover:bg-btnhoverbg enabled:active:bg-btnactivebg enabled:active:text-black focus:ring-btnfocusring'
                      )
                    : clsx(
                          'bg-pink-50/85 text-pink-600 border-pink-600/50 enabled:hover:text-pink-600 enabled:hover:bg-pink-200',
                          'enabled:active:bg-red-400 enabled:active:text-white focus:ring-pink-400'
                      )
            ),
        [dark]
    );

    /*
    console.log(
        clsx(
            `Rendering... ${selectedNodes.map((node) => node.getString())} listLength=${list.length}`,
            `focusItem=${focusItem && focusItem.getString()}`,
            focusItem instanceof Node &&
                `ornaments=[${focusItem.ornaments.map((o) => o.getString()).join()}]`,
            `(${focusItem instanceof Node && focusItem.x}, ${focusItem instanceof Node && focusItem.y})`,
            `ha=${focusItem && highestActive(focusItem).getString()}`,
            focusItem instanceof SNode &&
                `involutes=[${focusItem.involutes.map((node) => node.getString()).join()}]`
        )
    );
    */

    return (
        <DarkModeContext.Provider value={dark}>
            <div id='main-panel' className='pasi flex my-8 p-6'>
                {' '}
                {/* We give this div the 'pasi' class to prevent certain css styles from taking effect. */}
                <div
                    id='canvas-and-code'
                    className='flex flex-col flex-grow scrollbox'
                    style={{ minWidth: canvasWidth }}
                >
                    <div
                        id='canvas'
                        ref={canvasRef}
                        className='canvas bg-canvasbg border-canvasborder h-[650px] relative overflow-auto border focus:outline-none'
                        tabIndex={0} // This makes the canvas focusable; and that's all the focus management we need to do.
                        onMouseDown={canvasMouseDown}
                        onKeyDown={handleKeyDown}
                    >
                        {points.map((point) => (
                            <PointComp
                                key={point.id}
                                x={point.x}
                                y={point.y - yOffset}
                                primaryColor={dark ? DEFAULT_HSL_DARK_MODE : DEFAULT_HSL_LIGHT_MODE}
                                markColor={dark ? MARK_COLOR0_DARK_MODE : MARK_COLOR0_LIGHT_MODE}
                            />
                        ))}
                        {list.map((it) =>
                            it instanceof ENode && !(it instanceof GNode) ? (
                                <React.Fragment key={it.id}>
                                    {it instanceof SNode ? (
                                        <ConnectorComp
                                            id={`${it.id}con`}
                                            node={it}
                                            yOffset={yOffset}
                                            primaryColor={primaryColor}
                                            rerender={!it.locationDefined || dependents.has(it) ? [] : null}
                                        />
                                    ) : null}
                                    <ENodeComp
                                        id={`${it.id}node`}
                                        node={it}
                                        yOffset={yOffset}
                                        unitScale={unitScale}
                                        displayFontFactor={displayFontFactor}
                                        bg={dark ? CANVAS_HSL_DARK_MODE : CANVAS_HSL_LIGHT_MODE}
                                        primaryColor={primaryColor}
                                        markColor0={dark ? MARK_COLOR0_DARK_MODE : MARK_COLOR0_LIGHT_MODE}
                                        markColor1={dark ? MARK_COLOR1_DARK_MODE : MARK_COLOR1_LIGHT_MODE}
                                        titleColor={dark ? MARK_COLOR1_DARK_MODE : MARK_COLOR1_LIGHT_MODE}
                                        focusItem={focusItem}
                                        selection={selection}
                                        preselection={preselection2}
                                        onMouseDown={itemMouseDown}
                                        onMouseEnter={itemMouseEnter}
                                        onMouseLeave={mouseLeft}
                                        rerender={
                                            (it instanceof SNode &&
                                                (!it.locationDefined || dependents.has(it))) ||
                                            (focusItem instanceof Ornament && focusItem.node === it) ||
                                            deduplicatedSelection.includes(it)
                                                ? []
                                                : null
                                        }
                                    />
                                </React.Fragment>
                            ) : it instanceof CNodeGroup ? (
                                <CNodeGroupComp
                                    key={it.id}
                                    id={it.id}
                                    nodeGroup={it}
                                    focusItem={focusItem}
                                    preselection={preselection2}
                                    selection={deduplicatedSelection}
                                    allItems={allItems}
                                    yOffset={yOffset}
                                    unitScale={unitScale}
                                    displayFontFactor={displayFontFactor}
                                    bg={dark ? CANVAS_HSL_DARK_MODE : CANVAS_HSL_LIGHT_MODE}
                                    primaryColor={primaryColor}
                                    markColor={dark ? MARK_COLOR0_DARK_MODE : MARK_COLOR0_LIGHT_MODE}
                                    itemMouseDown={itemMouseDown}
                                    itemMouseEnter={itemMouseEnter}
                                    groupMouseDown={groupMouseDown}
                                    groupMouseEnter={groupMouseEnter}
                                    mouseLeft={mouseLeft}
                                    rerender={
                                        (focusItem instanceof Ornament && focusItem.node.group === it) ||
                                        selectedIndependentNodes.some(
                                            (node) => node instanceof CNode && node.group === it
                                        )
                                            ? []
                                            : null
                                    }
                                />
                            ) : (
                                (null as never)
                            )
                        )}
                        {list.map(
                            // We let the GNodes float above all other visible items.
                            (it) =>
                                it instanceof GNode ? (
                                    <ENodeComp
                                        key={it.id}
                                        id={it.id}
                                        node={it}
                                        yOffset={yOffset}
                                        unitScale={unitScale}
                                        displayFontFactor={displayFontFactor}
                                        bg={dark ? CANVAS_HSL_DARK_MODE : CANVAS_HSL_LIGHT_MODE}
                                        primaryColor={primaryColor}
                                        markColor0={dark ? MARK_COLOR0_DARK_MODE : MARK_COLOR0_LIGHT_MODE}
                                        markColor1={dark ? MARK_COLOR1_DARK_MODE : MARK_COLOR1_LIGHT_MODE}
                                        titleColor={dark ? MARK_COLOR1_DARK_MODE : MARK_COLOR1_LIGHT_MODE}
                                        focusItem={focusItem}
                                        selection={selection}
                                        preselection={preselection2}
                                        onMouseDown={itemMouseDown}
                                        onMouseEnter={itemMouseEnter}
                                        onMouseLeave={mouseLeft}
                                        rerender={
                                            (focusItem instanceof Ornament && focusItem.node === it) ||
                                            selectedIndependentNodes.includes(it)
                                                ? []
                                                : null
                                        }
                                        gradient
                                    />
                                ) : null
                        )}
                        <style>
                            {' '}
                            {/* We're using polylines for the 'mark borders' of items. Here is where we're animating them: */}
                            @keyframes oscillate {'{'} 0% {'{'} opacity: 1; {'}'} 50% {'{'} opacity: 0.1;{' '}
                            {'}'} 100% {'{'} opacity: 1; {'}}'}
                            polyline {'{'} stroke-width: {`${MARK_LINEWIDTH}px`}; {'}'}
                            .focused polyline {'{'} opacity: 1; animation: oscillate 1s infinite {'}'}
                            .selected polyline {'{'} opacity: 1; {'}'}
                            .preselected polyline {'{'} opacity: 0.65; transition: 0.15s; {'}'}
                            .unselected polyline {'{'} opacity: 0; {'}'}
                        </style>
                        {lasso && (
                            <svg
                                width={lasso.x1 - lasso.x0 + MARK_LINEWIDTH * 2}
                                height={lasso.y1 - lasso.y0 + MARK_LINEWIDTH * 2}
                                style={{
                                    position: 'absolute',
                                    left: lasso.x0 - MARK_LINEWIDTH,
                                    top: lasso.y0 - MARK_LINEWIDTH,
                                    marginTop: '-1px',
                                    marginLeft: '-1px',
                                }}
                            >
                                <rect
                                    x='1'
                                    y='1'
                                    width={lasso.x1 - lasso.x0}
                                    height={lasso.y1 - lasso.y0}
                                    fill={
                                        lasso.deselect
                                            ? dark
                                                ? LASSO_DESELECT_DARK_MODE
                                                : LASSO_DESELECT_LIGHT_MODE
                                            : 'none'
                                    }
                                    stroke={dark ? LASSO_COLOR_DARK_MODE : LASSO_COLOR_LIGHT_MODE}
                                    strokeWidth={MARK_LINEWIDTH}
                                    strokeDasharray={LASSO_DASH}
                                />
                            </svg>
                        )}
                        {/* Finally we add an invisible bottom-right 'limit point', which is needed to block automatic adjustment of canvas scrollbars during dragging: */}
                        {(yOffset !== 0 || limit.x >= canvasWidth || limit.y <= 0) && (
                            <PointComp
                                key={limit.id}
                                x={limitCompX(limit.x, canvasRef.current, canvasWidth)}
                                y={limitCompY(Math.min(0, limit.y) - yOffset, canvasRef.current)}
                                primaryColor={DEFAULT_HSL_LIGHT_MODE}
                                markColor='red'
                                visible={false}
                            />
                        )}
                    </div>
                    <canvas id='real-canvas' className='w-72 h-24 hidden'>
                        {/* This canvas element helps Label components determine the 'true' height of a given piece of text. */}
                    </canvas>
                    <div id='code-panel' className='relative mt-[25px] h-[190px]' style={codePanelStyle}>
                        <textarea
                            className='codepanel w-full h-full p-2 shadow-inner text-sm focus:outline-none resize-none'
                            ref={codeRef}
                            value={code}
                            spellCheck={false}
                            onChange={handleTextAreaChange}
                        />
                        <CopyToClipboardButton id='copy-button' iconSize={6} textareaRef={codeRef} />
                    </div>
                </div>
                <div id='button-panels' className='flex-grow min-w-[315px] max-w-[380px] select-none'>
                    <div id='button-panel-1' className='flex flex-col ml-[25px] h-[650px]'>
                        <div id='add-panel' className='grid grid-cols-2 mb-3'>
                            <BasicColoredButton
                                id='node-button'
                                label='Node'
                                style='rounded-xl mr-1.5'
                                tooltip={addNodeButtonTooltip}
                                tooltipPlacement='top'
                                disabled={!canAddENodes}
                                onClick={addEntityNodes}
                            />
                            <BasicColoredButton
                                id='contour-button'
                                label='Contour'
                                style='rounded-xl'
                                tooltip={addContourButtonTooltip}
                                tooltipPlacement='top'
                                disabled={!canAddContours}
                                onClick={addContours}
                            />
                        </div>
                        <div
                            id='di-panel'
                            className='grid justify-items-stretch border border-btnborder/50 p-2 mb-3 rounded-xl'
                        >
                            {depItemMenu}
                            <BasicColoredButton
                                id='create-button'
                                label='Create'
                                style='mt-2 rounded-md'
                                disabled={!canCreateDepItem}
                                onClick={handleCreateDepItem}
                            />
                        </div>
                        <div className='grid grid-cols-2 mb-3.5'>
                            <BasicColoredButton
                                id='abstract-button'
                                label='Abstract'
                                style='rounded-xl mr-1.5'
                                tooltip={abstractButtonTooltip}
                                tooltipPlacement='left'
                                disabled={selectedNodes.length === 0}
                                onClick={abstractSelection}
                            />
                            <BasicColoredButton
                                id='copy-button'
                                label='Copy'
                                style='rounded-xl'
                                tooltip={copyButtonTooltip}
                                tooltipPlacement='right'
                                disabled={!canCopy}
                                onClick={copySelection}
                            />
                        </div>
                        <TabGroup
                            className='flex-1 w-full h-[402px] bg-btnbg/5 shadow-sm border border-btnborder/50 rounded-xl mb-3.5'
                            selectedIndex={tabIndex}
                            onChange={setUserSelectedTabIndex}
                        >
                            <TabList className='grid grid-cols-10 mb-0.5'>
                                <Tab key='editor-tab' className={editorTabClass}>
                                    Editor
                                </Tab>
                                <Tab
                                    key='transform-tab'
                                    className={transformTabClass}
                                    disabled={transformTabDisabled}
                                >
                                    Transform
                                </Tab>
                                <Tab key='group-tab' className={groupTabClass} disabled={groupTabDisabled}>
                                    Groups
                                </Tab>
                            </TabList>
                            <TabPanels className='flex-1 h-[364px] overflow-auto scrollbox'>
                                <TabPanel key='editor-panel' className='rounded-xl px-2 py-2 h-full'>
                                    {focusItem ? (
                                        <ItemEditor
                                            info={focusItemInfo}
                                            logIncrement={logIncrement}
                                            onIncrementChange={incrementChange}
                                            onChange={itemChange}
                                        />
                                    ) : (
                                        canvasEditor
                                    )}
                                </TabPanel>
                                <TabPanel key='transform-panel' className='rounded-xl px-2 py-2'>
                                    <TransformTab
                                        rotation={rotation}
                                        scaling={scaling}
                                        hFlipPossible={canHFlip}
                                        vFlipPossible={canVFlip}
                                        logIncrements={logIncrements}
                                        transformFlags={transformFlags}
                                        testRotation={testRotation}
                                        rotate={rotateSelection}
                                        testScaling={testScaling}
                                        scale={scaleSelection}
                                        hFlip={hFlip}
                                        vFlip={vFlip}
                                    />
                                </TabPanel>
                                <TabPanel key='groups-panel' className='rounded-xl px-3 pt-3 pb-1'>
                                    {focusItem && (
                                        <GroupTab
                                            item={focusItem}
                                            adding={adding}
                                            dissolveAdding={dissolveAdding}
                                            create={createGroup}
                                            leave={leaveGroup}
                                            rejoin={rejoinGroup}
                                            restore={restoreGroup}
                                            changeAdding={handleChangeAdding}
                                            changeDissolveAdding={handleChangeDissolveAdding}
                                        />
                                    )}
                                </TabPanel>
                            </TabPanels>
                        </TabGroup>
                        <div id='undo-panel' className='grid grid-cols-3'>
                            <BasicColoredButton
                                id='undo-button'
                                label='Undo'
                                style='rounded-xl mr-1.5'
                                tooltip='Undo'
                                disabled={!canUndo}
                                onClick={throttledUndo}
                                icon={undoIcon}
                            />
                            <BasicColoredButton
                                id='redo-button'
                                label='Redo'
                                style='rounded-xl mr-1.5'
                                tooltip='Redo'
                                disabled={!canRedo}
                                onClick={throttledRedo}
                                icon={redoIcon}
                            />
                            <BasicButton
                                id='del-button'
                                label='Delete'
                                style={deleteButtonStyle}
                                tooltip='Delete'
                                disabled={!canDelete}
                                onClick={handleDelete}
                                icon={deleteIcon}
                            />
                        </div>
                    </div>

                    <div id='button-panel-2' className='grid justify-items-stretch mt-[25px] ml-[25px]'>
                        <BasicColoredButton
                            id='generate-button'
                            label='Generate'
                            style='rounded-xl mb-2 py-2'
                            disabled={false}
                            tooltip={generateButtonTooltip}
                            tooltipPlacement='top'
                            onClick={handleGenerate}
                        />
                        <div className='flex items-center justify-end mb-4 px-4 py-1 text-sm'>
                            1 px =
                            <input
                                className='w-16 ml-1 pl-2 py-0.5 mr-1 text-right border border-btnborder rounded-md focus:outline-none bg-textfieldbg text-textfieldcolor'
                                type='number'
                                min={MIN_UNITSCALE}
                                step={0.01}
                                value={unitScale}
                                onChange={changeUnitscale}
                            />
                            pt
                        </div>
                        <BasicColoredButton
                            id='load-btton'
                            label='Load'
                            style='rounded-xl mb-2 py-2'
                            disabled={false}
                            tooltip={loadButtonTooltip}
                            tooltipPlacement='left'
                            onClick={handleLoad}
                        />
                        <CheckBoxField
                            label='Replace current diagram'
                            value={replace}
                            onChange={handleReplace}
                        />
                    </div>
                    <Modal
                        isOpen={modalShown}
                        closeTimeoutMS={750}
                        onAfterOpen={modalOnAfterOpen}
                        style={dialogStyle}
                        overlayClassName={overlayClass}
                        contentLabel={dialog.contentLabel}
                        onRequestClose={modalOnRequestClose}
                        onAfterClose={modalOnAfterClose}
                    >
                        <div className={modalDialogClass} onClick={modalOnClick}>
                            {dialog.title && (
                                <div className='w-full text-center mb-4'>
                                    <h2 className='text-lg font-semibold mt-2 mb-0 py-2'>{dialog.title}</h2>
                                </div>
                            )}
                            <div className='grid w-full justify-items-center text-center'>
                                {dialog.content}
                                <style>
                                    pre {'{'} text-align: left; {'}'}
                                </style>
                            </div>
                            <BasicColoredButton
                                id='ok-button'
                                ref={okButtonRef}
                                label='OK'
                                style={okButtonClass}
                                disabled={false}
                                onClick={okButtonOnClick}
                            />
                        </div>
                    </Modal>
                </div>
            </div>
        </DarkModeContext.Provider>
    );
};

export default MainPanel;
