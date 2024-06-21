import React, { useState, useRef, useEffect, createContext } from 'react'
import Modal from 'react-modal'
import { Tab, TabGroup, TabList, TabPanel, TabPanels, Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import NextImage, { StaticImageData } from 'next/image'
import clsx from 'clsx/lite'

import Item, { MAX_LINEWIDTH, MAX_DASH_VALUE, DEFAULT_HSL_LIGHT_MODE, DEFAULT_HSL_DARK_MODE, Range } from './Item.tsx'
import { BasicButton, BasicColoredButton } from './Button.tsx'
import { CheckBoxField, validFloat } from './EditorComponents.tsx'
import CanvasEditor from './CanvasEditor.tsx'
import ItemEditor, { Config } from './ItemEditor.tsx'
import TransformTab from './TransformTab.tsx'
import GroupTab from './GroupTab.tsx'
import ENode, { ENodeComp, MAX_RADIUS } from './ENode.tsx'
import Point, { PointComp } from './Point.tsx'
import Group, { GroupMember, StandardGroup, getGroups, getLeafMembers, depth, MAX_GROUP_LEVEL } from './Group.tsx'
import CNode, { CNodeComp, DEFAULT_DISTANCE, MAX_NODEGROUP_SIZE, CNODE_MIN_DISTANCE_TO_NEXT_NODE_FOR_ARROW,  } from './CNode.tsx'
import NodeGroup, { Contour, CONTOUR_CENTER_DIV_MAX_WIDTH, CONTOUR_CENTER_DIV_MAX_HEIGHT } from './NodeGroup.tsx'

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
export const MAX_X = 32*W-1 // the highest possible TeX coordinate for an Item
export const MIN_Y = -16*H+1 // the lowest possible TeX coordinate for an Item 
export const MAX_Y = 16*H-1 // the highest possible TeX coordinate for an Item 
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
export const DEFAULT_HDISPLACEMENT = 20
export const DEFAULT_VDISPLACEMENT = 0
export const MIN_DISPLACEMENT = -9999
export const MAX_DISPLACEMENT = 9999
export const MIN_TRANSLATION_LOG_INCREMENT = -2
export const MAX_TRANSLATION_LOG_INCREMENT = 2
const DEFAULT_TRANSLATION_LOG_INCREMENT = 0
const DEFAULT_ROTATION_LOG_INCREMENT = 1
const DEFAULT_SCALING_LOG_INCREMENT = 1

const CONTOUR_CENTER_SNAP_RADIUS = 10 // radius around contour centers where snapping ignores grid points
const CONTOUR_NODE_SNAP_RADIUS = 15 // radius around contour nodes where snapping ignores grid points

const CANVAS_CLICK_THRESHOLD = 4 // For determining when a mouseUp is a mouseClick
const SCROLL_X_OFFSET = 20 // How close to the left edge of the viewport the limit point may be before we resize the canvas
const SCROLL_Y_OFFSET = 20 // How close to the top edge of the viewport the limit point may be before we resize the canvas
const CANVAS_HSL_LIGHT_MODE = {hue: 0, sat: 0, lgt: 100} // to be passed to ENodes
const CANVAS_HSL_DARK_MODE = {hue: 29.2, sat: 78.6, lgt: 47.65} 
const LASSO_DESELECT_LIGHT_MODE = 'rgba(255, 255, 255, 0.5)'
const LASSO_DESELECT_DARK_MODE = 'rgba(0, 0, 0, 0.1)'

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
 * dragging, elements of the selection (which is being dragged) have to be ignored. Same for the centers of NodeGroups containing elements of the selection.
 */
const getSnapPoint = (x: number, y: number, grid: Grid, list: (Item | NodeGroup)[], selection: Item[], 
        dccDx: number | undefined, 
        dccDy: number | undefined) => {
    let [rx, ry] = nearestGridPoint(x, y, grid),
        d = Math.sqrt(Math.pow(x-rx, 2) + Math.pow(y-ry, 2)),
        snappingToGrid = true;
    if (grid.snapToContourCenters || grid.snapToNodes) {
        for (const it of list) {
            if (it instanceof NodeGroup) {
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
 * Rotates a point around another point by a given angle.
 * @returns The new coordinates {x, y} of the rotated point.
 */
const rotatePoint = (px: number, py: number, cx: number, cy: number, angle: number): { x: number, y: number } => {
    // Convert angle from degrees to radians
    const radians: number = angle * Math.PI / 180;

    // Translate point to origin
    const translatedX: number = px - cx;
    const translatedY: number = py - cy;

    // Rotate point
    const rotatedX: number = translatedX * Math.cos(radians) - translatedY * Math.sin(radians);
    const rotatedY: number = translatedX * Math.sin(radians) + translatedY * Math.cos(radians);

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



interface MainPanelProps {
    dark: boolean;
}

const MainPanel = ({dark}: MainPanelProps) => {

    const canvasRef = useRef<HTMLDivElement>(null)
    const [depItemIndex, setDepItemIndex] = useState(depItemLabels.indexOf(labelItemLabel))
    const [pixel, setPixel] = useState(1.0)
    const [replace, setReplace] = useState(true)
    const [points, setPoints] = useState<Point[]>([])
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
    const preselection1Ref = useRef<Item[]>([])
    preselection1Ref.current = preselection1
    const [preselection2, setPreselection2] = useState<Item[]>([])
    const preselection2Ref = useRef<Item[]>([])
    preselection2Ref.current = preselection2

    const [userSelectedTabIndex, setUserSelectedTabIndex] = useState(0) // canvas editor is default
    const [itemEditorConfig, ] = useState<Config>({logIncrement: DEFAULT_TRANSLATION_LOG_INCREMENT})
    const [rotation, setRotation] = useState(0)
    const [scaling, setScaling] = useState(100) // default is 100%
    const [origin, ] = useState({x: 0, y: 0}) // the point around which to rotate and from which to scale
    const [logIncrements, ] = useState({rotate: DEFAULT_ROTATION_LOG_INCREMENT, scale: DEFAULT_SCALING_LOG_INCREMENT})
    const [transformFlags, ] = useState({scaleArrowheads: false, scaleENodes: false, scaleDash: false, scaleLinewidths: false, flipArrowheads: false})

    const [adding, setAdding] = useState(false)
    const [dissolveAdding, setDissolveAdding] = useState(false)

    const [showModal, setShowModal] = useState(false)
    const [modalMsg, setModalMsg] = useState<[string, string]>(['', '']) // the first element is the content label, the second the message.

    useEffect(() => {
        const element = document.getElementById('content');
        if(element) Modal.setAppElement(element)
    }, []);

    // Sets the origin point for transformations, and performs checkFlip().
    // This function should be called whenever we've changed the points, the selection, or the focusItem.
    // The first parameter indicates whether the transformation should be reset.
    const setOrigin = (resetTransform: boolean, pts: Point[] = points, focus: Item | null = focusItem, sel: Item[] = selection) => {
        // Compute new origin:
        const {x, y} = (pts.length>0)? pts[pts.length-1]: (focus?? ((sel.length>0)? sel[sel.length-1]: {x: 0, y: 0}))
        
        const originChanged = origin.x!==x || origin.y!==y;
        origin.x = x;
        origin.y = y;

        if(resetTransform && originChanged) {
            setRotation(0);
            setScaling(100);
            list.forEach(it => { // resetting the items for new scaling 
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
                else if (it instanceof CNode) {
                    item.dist0_100 = item.dist0;
                    item.dist1_100 = item.dist1;
                }
                });
            });
        }
    }

    const adjustLimit = (nodes: (ENode | NodeGroup)[] = list) => {
        let top = 0,
            right = 0,
            bottom = H;
        nodes.forEach(it => {
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
            const delta1 = Math.max(0, top - H) - yOffset;
            const delta2 = Math.ceil((delta1%H===0? delta1-1: delta1) / H) * H;
            const adjust = top<H? -yOffset: (yOffset+delta2<scrollTop-SCROLL_Y_OFFSET || delta2>0)? delta2: Math.max(-scrollTop, delta2);
            if (adjust !== 0) {
                setYOffset(yOffset + adjust);
                setTimeout(() => {
                    canvas.scrollBy(0, adjust);
                }, 0);
            }
        }
        const newLimit = new Point(right, bottom);
        if (limit.x!==newLimit.x || limit.y!==newLimit.y) setLimit(newLimit); // set the new bottom-right limit
    }

    const scrollTo = (item: Item) => {
        const canvas = canvasRef.current;
        if (canvas) { // scroll to the position of focusItem, if there has been a change in position
            const dx = item.x - canvas.scrollLeft;
            const scrollRight = Math.floor((dx%W===0? dx-1: dx) / W) * W;
            const dy = canvas.scrollTop + item.y - yOffset;
            const scrollDown = -Math.floor((dy%H===0? dy+1: dy) / H) * H;
            setTimeout(() => {
                canvas.scrollBy(scrollRight, scrollDown);
            }, 0);
        }
    }

    const updateSecondaryPreselection = (prim: Item[] = preselection1) => {
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
    }


    const deselect = (item: Item) => {
        const index = selection.lastIndexOf(item);
        setSelection(prev => {
            const newSelection = prev.filter((it, i) => i!==index);
            if(focusItem && !newSelection.includes(focusItem)) {
                setFocusItem(null);
            }
            return newSelection;
        });
        setOrigin(true);
        return item;
    }


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

    
    const itemMouseDown = (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => { // mouse down handler for items on the canvas
        e.stopPropagation();
        if(e.ctrlKey && !e.shiftKey && selection.includes(item)) {
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
                const pres = preselection2Ref.current; // This may be empty if we've just selected the same item.
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
                    }
                    else {
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
                const [snapX, snapY] = getSnapPoint(e.clientX - startX, H + yOffset - e.clientY + startY, grid, newList, selectionWithoutDuplicates, dccDx, dccDy);
                // Next, we have to prevent the enode, as well as the left-most selected item, from being dragged outside the 
                // canvas to the left (from where they couldn't be recovered), and also respect the lmits of MAX_X, MAX_Y, and MIN_Y:
                const x = Math.min(Math.max(snapX, xMinD), MAX_X);
                const y = Math.min(Math.max(snapY, MIN_Y), MAX_Y);
                const dx = x - item.x;
                const dy = y - item.y;
                // Finally, we move each item in the selection:
                if(dx!==0 || dy!==0) {
                    const nodeGroups: NodeGroup[] = []; // To keep track of the node groups whose members we've already moved.
                    selectionWithoutDuplicates.forEach(item => {
                        // console.log(`moving: ${item.id}`);
                        if (item.group instanceof NodeGroup && !nodeGroups.includes(item.group)) {
                            nodeGroups.push(item.group);
                            const members = item.group.members;
                            (item.group as NodeGroup).groupMove(
                                selectionWithoutDuplicates.filter(m => m instanceof CNode && members.includes(m)) as CNode[], 
                                dx, dy);
                        }
                        else if (!(item.group instanceof NodeGroup)) {
                            item.move(dx, dy)
                        }
                    });
                    setPoints(prevPoints => [...prevPoints]);  // to trigger a re-render 
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
                    item.x100 = origin.x + (item.x - origin.x) * 100/scaling;
                    item.y100 = origin.y + (item.y - origin.y) * 100/scaling;
                })
            }
        
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);

            setFocusItem(item);
            setList(newList);
            setPoints(newPoints);
            setPreselection1([]);
            setPreselection2([]);
            setSelection(newSelection);
        }           
    }

    const groupMouseDown = (group: NodeGroup, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => { // mouse down handler for contour center divs
        if (group.members.length>0) {
            itemMouseDown(group.members[group.members.length-1], e);
        }
    }


    const itemMouseEnter = (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => { // mouseEnter handler for items on the canvas
        if(!dragging) {
            setPreselection1(prev => [item]); 
            if (e.ctrlKey) {
                setPreselection2(prev => [item]); // if Ctrl is pressed, only add item by itself
            }
            else {
                updateSecondaryPreselection([item]); // otherwise add all the leaf members of its highest active group
            }
        }
    }

    const groupMouseEnter = (group: NodeGroup, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => { // mouseEnter handler for the 'center divs' of contours
        if(!dragging) {
            setPreselection1(prev => group.members); 
            if (e.ctrlKey) {
                setPreselection2(prev => group.members); // if Ctrl is pressed, only add group members by themselves
            }
            else {
                updateSecondaryPreselection(group.members); // otherwise add all the leaf members of their highest active group
            }
        }
    }

    const mouseLeft = () => {
        if(!dragging) {
            setPreselection1(prev => []); 
            updateSecondaryPreselection([]);
        }
    }

    const canvasMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {  // mouseDown handler for the canvas. Adds and removes Points. 
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
                const pres1 = preselection1Ref.current;
                let changed = false;
                const newPres1 = [
                    ...pres1.filter(item => {
                        const result = lasso.contains(item, yOffset);
                        changed = changed || !result;
                        return result
                    }),
                    ...getNodes(list, item => {
                        const result = lasso.contains(item, yOffset) && !pres1.includes(item) && (!deselect || selection.includes(item));
                        changed = changed || result;
                        return result
                    })];
                if (changed) {
                    setPreselection1(prev => newPres1);
                    setPreselection2(prev => newPres1);
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
    }

    const addEntityNodes = () => { // onClick handler for the node button
        if (points.length>0) {
            let counter = enodeCounter;
            const newNodes = points.map((point, i) => new ENode(counter++, point.x, point.y));
            setEnodeCounter(counter);
            setList(list => {
                const newList = [...list, ...newNodes];
                adjustLimit(newList); 
                return newList
            });
            setPoints([]);
            setSelection(newNodes);
            setFocusItem(newNodes[newNodes.length-1]);
            setOrigin(true);
        }
    }

    const addContours = () => { // onClick handler for the contour button
        if (points.length>0) {
            let counter = nodeGroupCounter;
            const newNodeGroups = points.map((point, i) => new NodeGroup(counter++, point.x, point.y));
            setNodeGroupCounter(counter);
            setList(list => {
                const newList = [...list, ...newNodeGroups];
                adjustLimit(newList); 
                return newList
            });
            const nodes = getNodes(newNodeGroups);
            setPoints([]);
            setSelection(nodes);
            setFocusItem(nodes[nodes.length-1]);
            setOrigin(true);
        }
    }

    const deduplicatedSelection = selection.filter((item, i) => i===selection.indexOf(item));

    const allNodes = getNodes(list);

    /**
     * An array of the highest-level Groups and Items that will need to be copied if the 'Copy Selection' button is pressed. The same array is also used for 
     * the purposes of the 'Create Group' button in the GroupTab.
     */
    const topTbc: (Item | Group<any>)[] = getTopToBeCopied(deduplicatedSelection, allNodes.filter(item => !deduplicatedSelection.includes(item))); 

    const copySelection = () => {
        if (selection.length>0) {
            const copies: Record<string, ENode | NodeGroup> = {}; // This will store the keys of the copied ENodes and NodeGroups, mapped to their respective copies.
            const cNodeCopies: Record<string, CNode> = {}; // Same, but for the members of NodeGroups.
            let counter = enodeCounter,
                ngCounter = nodeGroupCounter;
            topTbc.forEach(m => {
                if (m instanceof ENode) {
                    const node = copyENode(m, counter++, hDisplacement, vDisplacement);
                    if (node.group) {
                        node.group.members.push(node);
                    }
                    copies[m.id] = node;
                }
                else if(m instanceof CNode) {
                    const node = copyCNode(m, hDisplacement, vDisplacement, 0, 0);
                    if (node.group) {
                        node.group.members.splice(node.group.members.indexOf(m)+1, 0, node);
                    }
                    m.angle1 = node.angle0 = 0;
                    m.dist1 = node.dist0 = DEFAULT_DISTANCE;
                    cNodeCopies[m.id] = node;
                }
                else if(m instanceof NodeGroup) {
                    const group = copyNodeGroup(m, ngCounter++, hDisplacement, vDisplacement, cNodeCopies);
                    if (group.group) {
                        group.group.members.push(group);
                    }
                    copies[m.id] = group;
                }
                else if(m instanceof StandardGroup) { 
                    const [group, newCounter, newNGCounter] = copyStandardGroup(m as StandardGroup<Item | Group<any>>, 
                            counter, ngCounter, hDisplacement, vDisplacement, copies, cNodeCopies);
                    if (group.group) {
                        group.group.members.push(group);
                    }
                    counter = newCounter;
                    ngCounter = newNGCounter;
                }
                else {
                    console.log(`Unexpected list member: ${m}`);
                }
            });
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
            adjustLimit(newList);
            setEnodeCounter(counter);
            setNodeGroupCounter(ngCounter);
            setList(newList);
            setFocusItem(prev => newFocus);
            setOrigin(true, points, newFocus, newSelection); 
            setSelection(newSelection);
            scrollTo(newFocus);
        }
    }

    /**
     * Returns a copy of the supplied ENode.
     */
    const copyENode = (node: ENode, i: number, dx: number, dy: number): ENode => {
        const copy = new ENode(i, node.x+dx, node.y+dy);
        copy.radius = node.radius;
        copy.radius100 = node.radius100;
        copy.linewidth = node.linewidth;
        copy.linewidth100 = node.linewidth100;
        copy.shading = node.shading;
        copy.dash = node.dash;
        copy.dash100 = node.dash100;
        copy.isActiveMember = node.isActiveMember;
        copy.group = node.group;
        return copy;
    }

    /**
     * Returns a copy of the supplied CNode. If ngCounter is zero, we use an id that is based on the copied node's id; otherwise the copy's id will be composed out of 
     * ngCounter and nodeCoutner.
     */
    const copyCNode = (node: CNode, dx: number, dy: number, ngCounter: number, nodeCounter: number): CNode => {
        if (node.group) {
            const copy = new CNode(ngCounter===0? `${node.id}c${node.numberOfCopies++}`: `CN${ngCounter}/${nodeCounter}`, 
                node.x+dx, node.y+dy, node.angle0, node.angle1, node.group as NodeGroup);
            copy.omitLine = node.omitLine;
            copy.fixedAngles = node.fixedAngles;
            copy.isActiveMember = node.isActiveMember;
            copy.dist0 = node.dist0;
            copy.dist1 = node.dist1;
            return copy;
        }
        else return null as never;
    }

    /**
     * Returns a copy of the supplied NodeGroup.
     */
    const copyNodeGroup = (
            group: NodeGroup, 
            i: number, dx: number, dy: number, 
            cNodeCopies: Record<string, CNode>): NodeGroup => {
        const copiedGroup = new NodeGroup(i);
        const members = group.members.map((m: CNode, j: number) => {
            const copy = copyCNode(m, dx, dy, i, j);
            copy.group = copiedGroup;
            cNodeCopies[m.id] = copy;
            return copy
        });
        copiedGroup.linewidth = group.linewidth;
        copiedGroup.linewidth100 = group.linewidth100;
        copiedGroup.shading = group.shading;
        copiedGroup.dash = group.dash;
        copiedGroup.dash100 = group.dash100;
        copiedGroup.members = members;
        copiedGroup.group = group.group;
        copiedGroup.isActiveMember = group.isActiveMember;
        return copiedGroup;
    }

    /**
     * Returns a copy of the supplied StandardGroup together with an updated ENode-counter that is used for the creation of the copied group's leaf members (at least those
     * that are ENodes). 
     */
    const copyStandardGroup = (
            group: StandardGroup<Item | Group<any>>, 
            eNodeCounter: number, nGCounter: number,
            dx: number, dy: number, 
            copies: Record<string, ENode | NodeGroup>,
            cNodeCopies: Record<string, CNode>): [StandardGroup<Item | Group<any>>, newENodeCounter: number, newNGCounter: number] => {
        const copiedGroup = new StandardGroup<Item | Group<any>>([]);
        const members: (Item | Group<any>)[] = group.members.map(m => {
            let copy;
            if (m instanceof ENode) {                
                copy = copyENode(m, eNodeCounter++, dx, dy);
                copies[m.id] = copy;
            }
            else if (m instanceof NodeGroup) {
                copy = copyNodeGroup(m, nGCounter++, dx, dy, cNodeCopies);
                copies[m.id] = copy;
            }
            else if (m instanceof StandardGroup) { 
                [copy, eNodeCounter, nGCounter] = copyStandardGroup(m, eNodeCounter, nGCounter, dx, dy, copies, cNodeCopies);
            }
            else return null as never;
            copy.group = copiedGroup;
            return copy;
        });
        copiedGroup.members = members;
        copiedGroup.group = group.group;
        copiedGroup.isActiveMember = group.isActiveMember;
        return [copiedGroup, eNodeCounter, nGCounter];
    }


    const deleteSelection = () => { // onClick handler for the delete button
        if (selection.length>0) {
            const newList: (ENode | NodeGroup)[]  = [];
            for (let it of list) {
                if (it instanceof ENode) {
                    if (!selection.includes(it)) newList.push(it);
                }
                else if (it instanceof NodeGroup) {
                    const newMembers = it.members.filter(node => !selection.includes(node));
                    if (newMembers.length>0) {
                        it.members = newMembers;
                        newList.push(it);
                    }                    
                }
            }
            const whitelist = new Set<Group<Item | Group<any>>>();
            newList.forEach(it => { // Whitelist each group that contains (directly or indirectly) a not-to-be-deleted node.
                getGroups(it)[0].forEach(g => whitelist.add(g));
            });
            whitelist.forEach(g => { // For each of those groups, filter out all the members that are either to-be-deleted nodes or non-whitelisted groups.
                g.members = g.members.filter(m => ((m instanceof ENode) && newList.includes(m)) || 
                        (!(m instanceof Item) && whitelist.has(m)));
            });
            setList(newList);
            setSelection([]);
            setPreselection1([]);
            setPreselection2([]);
            setFocusItem(null);
            adjustLimit(newList);
            setOrigin(true);
        }
    }

    const adjustSelection = (item: Item) => {
        const ha = highestActive(item);
        if (ha instanceof Item) {
            setSelection([ha]);
        }
        else {
            const lm = getLeafMembers(ha, true);
            setSelection([item, ...getNodes(list, it => it!==item && lm.has(it))]);
        }
    }


    const tabIndex = selection.length==0? 0: userSelectedTabIndex;

     // The delete button gets some special colors:
    const deleteButtonStyle = clsx('rounded-xl', 
        (dark? 'bg-[#55403c]/85 text-red-700 border-btnborder/50 enabled:hover:text-btnhovercolor enabled:hover:bg-btnhoverbg enabled:active:bg-btnactivebg enabled:active:text-black focus:ring-btnfocusring':
            'bg-pink-50/85 text-pink-600 border-pink-600/50 enabled:hover:text-pink-600 enabled:hover:bg-pink-200 enabled:active:bg-red-400 enabled:active:text-white focus:ring-pink-400'));

    const tabClassName = clsx('py-1 px-2 text-sm/6 bg-btnbg/85 text-btncolor border border-t-0 border-btnborder/50 data-[selected]:border-b-0 disabled:opacity-50 tracking-wider', 
        'focus:outline-none data-[selected]:bg-btnbg/5 data-[selected]:font-semibold data-[hover]:bg-btnhoverbg data-[hover]:text-btnhovercolor data-[hover]:font-semibold',
        'data-[selected]:data-[hover]:text-btncolor data-[focus]:outline-1 data-[focus]:outline-btnhoverbg');

    const sorry = () => {setModalMsg(['Apology', 'Sorry, this feature has not yet been implemented!']); setShowModal(true);}

    console.log(`Rendering... listLength=${list.length}  focusItem=${focusItem && focusItem.id}  ha=${focusItem && highestActive(focusItem).getString()}`);
    //console.log(`Rendering... preselected=[${preselection.map(item => item.id).join(', ')}]`);

    return ( // We give this div the 'pasi' class to prevent certain css styles from taking effect:
        <DarkModeContext.Provider value={dark}>
            <div id='main-panel' className='pasi flex my-8 p-6'> 
                <div id='canvas-and-code' className='flex flex-col flex-grow scrollbox min-w-[900px] max-w-[1200px] '>
                    <div id='canvas' ref={canvasRef} className='bg-canvasbg border-canvasborder h-[650px] relative overflow-auto border'
                            onMouseDown= {canvasMouseDown}>
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
                                let allSelected = true, 
                                    allPreselected = true;
                                const selectedNodes = it.members.map(m => {
                                    if (deduplicatedSelection.includes(m)) return true;
                                    else {
                                        allSelected = false;
                                        return false
                                    }
                                });
                                const preselectedNodes = it.members.map(m => {
                                    if (preselection2.includes(m)) return true;
                                    else {
                                        allPreselected = false;
                                        return false
                                    }
                                });
                                const last = it.members.length-1;
                                // Space permitting, we arrange for one or more of the CNodeComps to be decorated by an arrow that will give the user an idea of what is meant by 'next node' and 'previous node' in the tooltips
                                // and elsewhere in the UI. But, to avoid clutter, only one CNodeComp per run of selected or preselected nodes should be decorated in this way.
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
                                            (preselected && (defer || (allPreselected && j==0) || (!allPreselected && !preselectedNodes[j==0? last: j-1])));
                                        if (arrow && d<CNODE_MIN_DISTANCE_TO_NEXT_NODE_FOR_ARROW) {
                                            defer = true;
                                        }
                                        else {
                                            defer = false;
                                        }
                                        arrowNodes[j] = arrow && !defer;
                                    }
                                }
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
                                return [
                                    <Contour key={it.id} id={it.id+'Contour'} group={it} yOffset={yOffset} 
                                        selected={selectedNodes.some(b => b)}
                                        preselected={preselectedNodes.some(b => b)}
                                        bg={dark? CANVAS_HSL_DARK_MODE: CANVAS_HSL_LIGHT_MODE} 
                                        primaryColor={dark? DEFAULT_HSL_DARK_MODE: DEFAULT_HSL_LIGHT_MODE} 
                                        markColor={dark? MARK_COLOR0_DARK_MODE: MARK_COLOR0_LIGHT_MODE} 
                                        centerDivClickable={centerDivClickable}
                                        showCenterDiv={focusItem instanceof CNode && focusItem.fixedAngles}
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
                                disabled={points.length<1 || list.length>=MAX_LIST_SIZE} onClick={addEntityNodes} />
                            <BasicColoredButton id='contour-button' label='Contour' style='rounded-xl' 
                                disabled={points.length<1 || list.length>=MAX_LIST_SIZE} onClick={addContours} />  
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
                                            className='menu w-72 origin-top-right rounded-md border border-menuborder bg-btnbg/20 p-1 text-sm font-serif text-btncolor [--anchor-gap:var(--spacing-1)] focus:outline-none'>
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
                            disabled={
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
                                (hDisplacement<0 && deduplicatedSelection.reduce((min, item) => (min<item.x)? min: item.x, Infinity) + hDisplacement < 0) ||
                                (vDisplacement>0 && deduplicatedSelection.reduce((max, item) => (max>item.y)? max: item.y, -Infinity) + vDisplacement > MAX_Y) ||
                                (hDisplacement>0 && deduplicatedSelection.reduce((max, item) => (max>item.x)? max: item.x, -Infinity) + hDisplacement > MAX_X) ||
                                (vDisplacement<0 && deduplicatedSelection.reduce((min, item) => (min<item.y)? min: item.y, Infinity) + vDisplacement < MIN_Y)
                            } onClick={copySelection} /> 

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
                            <TabPanels className='flex-1 h-[364px] bg-btnbg/5 overflow-auto scrollbox'>
                                <TabPanel key='editor-panel' className='rounded-xl px-2 py-1 h-full'>
                                    {focusItem?
                                        <ItemEditor info={focusItem.getInfo(list, itemEditorConfig)} 
                                            onChange={(e, key) => {
                                                const [edit, range] = focusItem.handleEditing(e, itemEditorConfig, selection, key);
                                                const nodeGroups: Set<NodeGroup> | null = range==='ENodesAndNodeGroups'? new Set<NodeGroup>(): null;
                                                const nodes = range!=='onlyThis'? 
                                                    deduplicatedSelection.reduce((acc: (ENode | NodeGroup)[], item: Item) => {
                                                            //console.log(`Editing item ${item.key}`);
                                                            if (item instanceof CNode && nodeGroups) {
                                                                if (nodeGroups.has(item.group as NodeGroup)) return acc;
                                                                else {
                                                                    nodeGroups.add(item.group as NodeGroup);
                                                                }
                                                            }
                                                            return edit(item, acc) as (ENode | NodeGroup)[]
                                                    }, list):
                                                    edit(focusItem, list);
                                                setList(prev => nodes); // for some reason, the setter function is called twice here.
                                                adjustLimit();
                                                setOrigin(false);
                                                scrollTo(focusItem);
                                                setPoints(prevPoints => [...prevPoints]);  // to trigger a re-render (in case it hasn't already)                               
                                        }} />:
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
                                        hFlipPossible={!deduplicatedSelection.some(item => {
                                            const x = 2*origin.x - item.x; // simulate hFlip on item
                                            return x<0 || x>MAX_X;
                                        })} 
                                        vFlipPossible={!deduplicatedSelection.some(item => {
                                            const y = 2*origin.y - item.y; // simulate vFlip on item
                                            return y<MIN_Y || y>MAX_Y;
                                        })} 
                                        logIncrements={logIncrements} transformFlags={transformFlags}
                                        testRotation={angle => {
                                            for(const item of deduplicatedSelection) {
                                                const {x, y} = rotatePoint(item.x, item.y, origin.x, origin.y, angle);
                                                if (x<0 || x>MAX_X) return false;
                                                if (y<MIN_Y || y>MAX_Y) return false;
                                            }
                                            return true
                                        }}
                                        rotate={(angle, newValue) => {
                                            deduplicatedSelection.forEach(item => {
                                                ({x: item.x, y: item.y} = rotatePoint(item.x, item.y, origin.x, origin.y, angle));
                                                ({x: item.x100, y: item.y100} = rotatePoint(item.x100, item.y100, origin.x, origin.y, angle))                              
                                            });
                                            adjustLimit();
                                            setRotation(newValue);
                                        }}
                                        testScaling={val => {
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
                                        }}
                                        scale={newValue => {
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
                                            adjustLimit();
                                            setScaling(newValue);
                                        }}
                                        hFlip={() => {
                                            deduplicatedSelection.forEach(item => {
                                                item.x = 2*origin.x - item.x;
                                                item.x100 = 2*origin.x - item.x100;
                                                if (item instanceof CNode) {
                                                    item.angle0 = -item.angle0;
                                                    item.angle1 = -item.angle1;
                                                }
                                            });
                                            adjustLimit();
                                            setPoints(prevPoints => [...prevPoints]);  // to trigger a re-render                                   
                                        }}
                                        vFlip={() => {
                                            deduplicatedSelection.forEach(item => {
                                                item.y = 2*origin.y - item.y;
                                                item.y100 = 2*origin.y - item.y100;
                                                if (item instanceof CNode) {
                                                    item.angle0 = -item.angle0;
                                                    item.angle1 = -item.angle1;
                                                }
                                            });
                                            adjustLimit();
                                            setPoints(prevPoints => [...prevPoints]);  // to trigger a re-render                                  
                                        }} />
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
                                disabled={selection.length<1} 
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
                            overlayClassName='fixed inset-0 bg-gray-900/70' 
                            contentLabel={modalMsg[0]}
                            onRequestClose={() => setShowModal(false)}>
                        <div className='grid justify-items-center bg-modalbg px-8 py-4 border border-btnfocusring rounded-2xl'>
                            <h2>
                                {modalMsg[1]}
                            </h2>
                            <BasicColoredButton id='close-button' label='OK' style='w-20 mt-4 rounded-xl' disabled={false} onClick={() => setShowModal(false)} />
                        </div>
                    </Modal>
                </div>
            </div>
        </DarkModeContext.Provider>
    );
};

export default MainPanel;