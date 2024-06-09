import React, { useState, useRef, useEffect, createContext } from 'react'
import Modal from 'react-modal'
import { Tab, TabGroup, TabList, TabPanel, TabPanels, Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import NextImage, { StaticImageData } from 'next/image'
import Tippy from '@tippyjs/react'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'
import 'tippy.js/themes/translucent.css'
import clsx from 'clsx/lite'

import Item, { MAX_LINEWIDTH, MAX_DASH_VALUE } from './Item.tsx'
import { BasicButton, BasicColoredButton } from './Button.tsx'
import { CheckBoxField, validFloat } from './EditorComponents.tsx'
import CanvasEditor from './CanvasEditor.tsx'
import ItemEditor, { Config } from './ItemEditor.tsx'
import TransformTab from './TransformTab.tsx'
import GroupTab from './GroupTab.tsx'
import ENode, { ENodeComp, MAX_RADIUS } from './ENode.tsx'
import Point, { PointComp } from './Point.tsx'
import Group, { GroupMember, StandardGroup, getGroups, getLeafMembers, isGroup, isGroupMember } from './Group.tsx'

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

export const H = 640; // the height of the canvas; needed to convert screen coordinates to Tex coordinates
export const W = 900; // the width of the canvas
export const MAX_X = 16*W // the highest possible TeX coordinate for an Item
export const MIN_Y = -15*H // the lowest possible TeX coordinate for an Item 

const MAX_NUMBER_OF_ENODES = 1024

export const MARK_COLOR0_LIGHT_MODE = '#8877bb'
export const MARK_COLOR0_DARK_MODE = '#000000'
export const MARK_COLOR1_LIGHT_MODE = '#b0251a'
export const MARK_COLOR1_DARK_MODE = '#000000'
export const MARK_LINEWIDTH = 1.0
export const LASSO_COLOR_LIGHT_MODE = 'rgba(136, 119, 187, 200)'
export const LASSO_COLOR_DARK_MODE = 'rgba(100, 50, 0, 200)'
export const LASSO_DASH = '2'

export const DEFAULT_HGAP = 10
export const DEFAULT_VGAP = 10
export const MIN_GAP = 1
export const MAX_GAP = 255
export const DEFAULT_HSHIFT = 0
export const DEFAULT_VSHIFT = 0
export const MIN_SHIFT = 0
export const MAX_SHIFT = 255
export const DEFAULT_HDISPLACEMENT = 20
export const DEFAULT_VDISPLACEMENT = 0
export const MIN_DISPLACEMENT = -9999
export const MAX_DISPLACEMENT = 9999
export const MIN_TRANSLATION_LOG_INCREMENT = -2
export const MAX_TRANSLATION_LOG_INCREMENT = 2
const DEFAULT_TRANSLATION_LOG_INCREMENT = 0
const DEFAULT_ROTATION_LOG_INCREMENT = 1
const DEFAULT_SCALING_LOG_INCREMENT = 1

const CONTOUR_CENTER_SNAP_RADIUS = 10
const CONTOUR_NODE_SNAP_RADIUS = 15

const CANVAS_CLICK_THRESHOLD = 4 // For determining when a mouseUp is a mouseClick
const canvasHSLLight = {hue: 0, sat: 0, lgt: 100} // to be passed to ENodes
const canvasHSLDark = {hue: 29.2, sat: 78.6, lgt: 47.65} 
const lassoDeselectLight = 'rgba(255, 255, 255, 0.5)'
const lassoDeselectDark = 'rgba(0, 0, 0, 0.1)'


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

class Lasso {
    constructor(public x0: number, public y0: number, public x1: number, public y1: number, public deselect: boolean) {
    }
    contains(item: Item): boolean {
        return item.getLeft() >= this.x0 && item.getLeft()+item.getWidth() <= this.x1 && 
            H-item.getBottom() <= this.y1 && H-(item.getBottom()+item.getHeight()) >= this.y0;  
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



export const DarkModeContext = createContext(false);

interface MainPanelProps {
    dark: boolean;
}

const MainPanel = ({dark}: MainPanelProps) => {

    const canvasRef = useRef<HTMLDivElement>(null)
    const [depItemIndex, setDepItemIndex] = useState(depItemLabels.indexOf(labelItemLabel))
    const [pixel, setPixel] = useState(1.0)
    const [replace, setReplace] = useState(true)
    const [points, setPoints] = useState<Point[]>([])
    const [enodes, setEnodes] = useState<ENode[]>([])
    const [enodeCounter, setEnodeCounter] = useState(0) // used for generating keys
    const [selection, setSelection] = useState<Item[]>([]);// list of selected items; multiple occurrences are allowed    
    const [focusItem, setFocusItem] = useState<Item | null>(null) // the item that carries the 'focus', relevant for the editor pane
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
    const [itemEditorConfig, ] = useState<Config>({logTranslationIncrement: DEFAULT_TRANSLATION_LOG_INCREMENT})
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
            enodes.forEach(item => { // resetting the items for new scaling 
                item.x100 = item.x;
                item.y100 = item.y;
                item.radius100 = item.radius;
                item.linewidth100 = item.linewidth;
                item.dash100 = item.dash;
            });
        }
    }

    const adjustLimit = (nodes: ENode[] = enodes) => {
        let right = 0;
        let bottom = H;
        nodes.forEach((enode) => {
            if(enode.x > right) {
                right = enode.x
            }
            if(enode.y < bottom) {
                bottom = enode.y
            }
        });
        const newLimit = new Point(right, bottom);
        if(limit.x!==newLimit.x || limit.y!==newLimit.y) setLimit(newLimit); // set the new bottom-right limit
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
        setPreselection2(prev => [...prim, ...enodes.filter(it => !prim.includes(it) && lm.has(it))]);
    }


    const getSelectPositions = (item: Item, array = selection) => {
        let result: number[] = [];
        let index = 0;
        if(item instanceof ENode) {
            array.forEach(element => {
                if(element===item) {
                    result = [...result, index];
                }
                if(element instanceof ENode) { // if the element isn't an ENode, we're not counting it.
                    index++;
                }
            });
        } 
        else { // Items that aren't ENodes don't need that much detail; just give them a [0] if they're included in the selection.
            if(array.includes(item)) {
                result = [0];
            }
        }  
        return result;
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


    const nearestGridPoint = (x: number, y: number) => {
        return [x + grid.hGap/2 - ((x + grid.hGap/2 - grid.hShift) % grid.hGap), 
                y + grid.vGap/2 - ((y + grid.vGap/2 - grid.vShift) % grid.vGap)]
    }
    
    const itemMouseDown = (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => { // mouse down handler for items on the canvas
        e.stopPropagation();
        if(item) {
            if(e.ctrlKey && !e.shiftKey && selection.includes(item)) {
                deselect(item);
            } 
            else {
                let newPoints = points,
                    newSelection = selection;

                if (focusItem && (adding || dissolveAdding)) {
                    newPoints = [];
                    const itemToAdd = e.ctrlKey? item: highestActive(item);
                    const oldGroup = itemToAdd.group;
                    const group = highestActive(focusItem);
                    if (isGroup(group, isGroupMember) && group!==itemToAdd && !group.members.includes(itemToAdd)) {
                        if (itemToAdd instanceof Item) {
                            newSelection=[...selection, itemToAdd];
                        }
                        else {
                            const lm = getLeafMembers(itemToAdd);
                            newSelection=[...selection, item, ...enodes.filter(it => it!==item && !selection.includes(it) && lm.has(it))];
                        }
                        if (oldGroup) {
                            oldGroup.members = oldGroup.members.filter(m => m!==itemToAdd);
                        }
                        if (adding || (itemToAdd instanceof Item)) {
                            group.members.push(itemToAdd);
                            itemToAdd.group = group;
                            itemToAdd.isActiveMember = true;
                        }
                        else { // dissolve adding
                            group.members.push(...itemToAdd.members);
                            itemToAdd.members.forEach(m => {m.group = group; m.isActiveMember = true});
                            itemToAdd.members = [];
                        }
                    }
                }
                else {
                    const pres = preselection2Ref.current;
                    if (e.shiftKey) { // increase selection
                        if (e.ctrlKey) {
                            newSelection = [...selection, item];
                        }
                        else {               
                            newSelection = [...selection, ...pres];
                        }
                    }
                    else { // replace selection
                        if (e.ctrlKey) {
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
                const startX = e.clientX - item.x;
                const startY = e.clientY - (H-item.y);
                const selectionWithoutDuplicates = newSelection.filter((item, i) => i===newSelection.indexOf(item));
                const xMinD = item.x - selectionWithoutDuplicates.reduce((min, it) => it.x<min? it.x: min, item.x); // x-distance to the left-most selected item
                const yMinD = selectionWithoutDuplicates.reduce((max, it) => it.y>max? it.y: max, item.y) - item.y; // y-distance to the top-most selected item
                
                const handleMouseMove = (e: MouseEvent) => {
                    // We have to prevent the enode, as well as the left-most and top-most selected item, from being dragged outside the 
                    // canvas to the left or top (from where they couldn't be recovered):
                    const newX = Math.min(Math.max(e.clientX, startX + xMinD) - startX, MAX_X);
                    const newY = Math.max(H-(Math.max(e.clientY, startY + yMinD) - startY), MIN_Y);
                    // Next, we take into account the grid:
                    const [x, y] = nearestGridPoint(newX, newY);
                    const dx = x - item.x;
                    const dy = y - item.y;
                    // Finally, we move each item in the selection:
                    if(dx!==0 || dy!==0) {
                        selectionWithoutDuplicates.forEach(item => item.move(dx, dy));
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
                setPoints(newPoints);
                setPreselection1([]);
                setPreselection2([]);
                setSelection(newSelection);
            }           
        } 
    }

    const itemMouseEnter = (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => { // mouseOver handler for items on the canvas
        if(!dragging) {
            setPreselection1(pre1 => {
                const newPres = pre1.includes(item)? pre1: [...pre1, item];
                if (e.ctrlKey) {
                    setPreselection2(pre2 => pre2.includes(item)? pre2: [...pre2, item]) // if Ctrl is pressed, only add item by itself
                }
                else {
                    updateSecondaryPreselection(newPres) // otherwise add all the leaf members of its highest active group
                }
                return newPres
            });
        }
    }

    const itemMouseLeave = (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => { // mouseLeave handler for items on the canvas
        if(!dragging) {
            setPreselection1(pre1 => {
                const newPres = pre1.filter(it => it!==item);
                updateSecondaryPreselection(newPres);
                return newPres
            });
        }
    }

    const canvasMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {  // mouseDown handler for the canvas. Adds and removes Points. 
        const {left, top} = canvasRef.current?.getBoundingClientRect()?? {left: 0, top: 0};
        const {scrollLeft, scrollTop} = canvasRef.current?? {scrollLeft: 0, scrollTop:0};
        const x = e.clientX - left + scrollLeft;
        const y = e.clientY - top + scrollTop;
        const deselect = e.ctrlKey && !e.shiftKey && selection.length>0;
        let newPoints = e.shiftKey? points: [];


        const handleMouseUp = (mue: MouseEvent) => {
            canvasRef.current?.removeEventListener('mouseup', handleMouseUp);
            canvasRef.current?.removeEventListener('mousemove', handleMouseMove);
            let newFocus = focusItem;
            let newSelection = selection;

            const dx = mue.clientX - e.clientX;
            const dy = mue.clientY - e.clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if(dist < CANVAS_CLICK_THRESHOLD) { // Only in this case, the mouseUp event should be interpreted as a click event.
                const [gx, gy] = nearestGridPoint(x, H-y);
                const newPoint = new Point(gx, gy);
                if (!e.shiftKey) {
                    newPoints = [newPoint];
                    newSelection = [];
                    newFocus = null;
                } 
                else {
                    const included = points.some(p => newPoint.key==p.key);
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

        const handleMouseMove = (mme: MouseEvent) => {
            const dx = mme.clientX - e.clientX;
            const dy = mme.clientY - e.clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist >= CANVAS_CLICK_THRESHOLD) { // Only in this case do we create a Lasso.
                setPoints(newPoints);
                const lasso = new Lasso(Math.min(x, x+dx), Math.min(y, y+dy), Math.max(x, x+dx), Math.max(y, y+dy), deselect);
                const pres1 = preselection1Ref.current;
                const newPres1 = [
                    ...pres1.filter(item => lasso.contains(item)),
                    ...enodes.filter(item => 
                        lasso.contains(item) && !pres1.includes(item) && (!deselect || selection.includes(item)))];
                setPreselection1(prev => newPres1);
                if (mme.ctrlKey) { // Pressing the Ctrl key leads to group membership being ignored.
                    setPreselection2(newPres1);
                }
                else {
                    updateSecondaryPreselection(newPres1);
                }
                setLasso(prevLasso => lasso);;
            }
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
            setEnodes(prevEnodes => {
                const nodes = [...prevEnodes, ...newNodes];
                adjustLimit(nodes); 
                return nodes});
            setPoints([]);
            setSelection(newNodes);
            setFocusItem(newNodes[newNodes.length-1]);
            setOrigin(true);
        }
    }

    const addContours = () => { // onClick handler for the contour button
        setPoints([]);
        setOrigin(true);
    }
    

    const copySelection = () => {
        if (selection.length>0) {
            const deduplicatedSelection = selection.filter((item, i) => i===selection.indexOf(item));
            const ntbc = enodes.filter(item => !selection.includes(item)); // not-to-be-copied nodes
            const topTbc: (Item | Group<any>)[] = []; // top-level to-be-copied groups or items
            const copies: Record<string, ENode> = {}; // This will store the keys of the copied nodes, mapped to their respective copies.
            const visitedGroups = new Set<Group<any>>(); // already-visited groups
            deduplicatedSelection.forEach(item => {
                const groups = getGroups(item)[0];
                let j = -1, // The index of that group, if some such group exists; -1 otherwise.
                    visited = false;
                for (let i = 0; i<groups.length; i++) { // We are looking for the lowest group that has both item and a not-to-be-copied node among its leaf members.
                    if (visitedGroups.has(groups[i])) {
                        visited = true;
                        break;
                    }
                    visitedGroups.add(groups[i]);
                    const ml = getLeafMembers(groups[i]);
                    if (ntbc.some(item => ml.has(item))) {
                        j = i;
                        break;
                    }
                }
                if (!visited) {
                    topTbc.push((j<0 && groups.length>0)? groups[groups.length-1]: // item is in a group, and no group in its hierarchy contains not-to-be-copied nodes
                        j<1? item: // either item is not in any group (j==-1), or the group that it is a direct member of also contains a not-to-be-copied node
                        groups[j-1]);
                }
            });
            let counter = enodeCounter;
            topTbc.forEach(m => {
                if (m instanceof ENode) {
                    const node = copyENode(m, counter++, hDisplacement, vDisplacement);
                    if (node.group) {
                        node.group.members.push(node);
                    }
                    copies[m.key] = node;
                }
                else if(!(m instanceof Item)) { // In this case, we have to copy a group:
                    const [group, newCounter] = copyStandardGroup(m as StandardGroup<Item | Group<any>>, counter, hDisplacement, vDisplacement, copies);
                    if (group.group) {
                        group.group.members.push(group);
                    }
                    counter = newCounter;
                }
            });
            const copiedNodes = enodes.reduce((acc: ENode[], node) => { // an array that holds the copied nodes in the same 
                // order as enodes holds the nodes that they're copies of
                if (node.key in copies) {
                    acc.push(copies[node.key]);
                }
                return acc;
            }, []);
            const newSelection = selection.map(node => copies[node.key]);
            const oldFocus = focusItem;
            const newNodes = [...enodes, ...copiedNodes];
            const newFocus = focusItem && copies[focusItem.key];
            adjustLimit(newNodes);
            setEnodeCounter(counter);
            setEnodes(newNodes);
            setFocusItem(prev => newFocus);
            setOrigin(true, points, newFocus, newSelection); 
            setSelection(newSelection);
            if (oldFocus && newFocus) {
                setTimeout(() => {
                    canvasRef.current?.scrollBy({left: newFocus.x-oldFocus.x, top: oldFocus.y-newFocus.y, behavior: 'smooth'});
                }, 0);
            }
        }
    }

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

    const copyStandardGroup = (
            group: StandardGroup<Item | Group<any>>, 
            i: number, dx: number, dy: number, 
            copiedNodes: Record<string, ENode>): [StandardGroup<Item | Group<any>>, newCounter: number] => {
        const copiedGroup = new StandardGroup<Item | Group<any>>([]);
        const members: (Item | Group<any>)[] = group.members.map(m => {
            let copy;
            if (m instanceof ENode) {                
                copy = copyENode(m, i++, dx, dy);
                copiedNodes[m.key] = copy;
            }
            else if (m instanceof StandardGroup) { 
                const [c, newCounter] = copyStandardGroup(m, i, dx, dy, copiedNodes);
                copy = c;
                i = newCounter;
            }
            else return new StandardGroup([]);
            copy.group = copiedGroup;
            return copy;
        });
        copiedGroup.members = members;
        copiedGroup.group = group.group;
        copiedGroup.isActiveMember = group.isActiveMember;
        return [copiedGroup, i];
    }

    const deleteSelection = () => { // onClick handler for the delete button
        if (selection.length>0) {
            const whitelist = new Set<Group<Item | Group<any>>>();
            const nodes = enodes.filter(item => !selection.includes(item)); 
            nodes.forEach(item => { // Whitelist each group that contains (directly or indirectly) a not-to-be-deleted node.
                getGroups(item)[0].forEach(g => whitelist.add(g));
            });
            whitelist.forEach(g => { // For each of those groups, filter out all the members that are either to-be-deleted nodes or non-whitelisted groups.
                g.members = g.members.filter(m => ((m instanceof ENode) && nodes.includes(m)) || 
                        (!(m instanceof Item) && whitelist.has(m)));
            });
            setEnodes(nodes);
            setSelection([]);
            setPreselection1([]);
            setPreselection2([]);
            setFocusItem(null);
            adjustLimit(nodes);
            setOrigin(true);
        }
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


    const adjustSelection = (item: Item) => {
        const ha = highestActive(item);
        if (ha instanceof Item) {
            setSelection([ha]);
        }
        else {
            const lm = getLeafMembers(ha, true);
            setSelection([item, ...enodes.filter(it => it!==item && lm.has(it))]);
        }
    }


    const deduplicatedSelection = selection.filter((item, i) => i===selection.indexOf(item));


    // The delete button gets some special colors:
    const deleteButtonStyle = clsx('rounded-xl', 
        (dark? 'bg-[#55403c]/85 text-red-700 border-btnborder/50 enabled:hover:text-btnhovercolor enabled:hover:bg-btnhoverbg enabled:active:bg-btnactivebg enabled:active:text-black focus:ring-btnfocusring':
            'bg-pink-50/85 text-pink-600 border-pink-600/50 enabled:hover:text-pink-600 enabled:hover:bg-pink-200 enabled:active:bg-red-400 enabled:active:text-white focus:ring-pink-400'));

    const tabClassName = clsx('py-1 px-2 text-sm/6 bg-btnbg/85 text-btncolor border border-btnborder/50 disabled:opacity-50 tracking-wider', 
        'focus:outline-none data-[selected]:bg-tabselected/85 data-[selected]:font-semibold data-[hover]:bg-btnhoverbg data-[hover]:text-btnhovercolor data-[hover]:font-semibold transition',
        'data-[selected]:data-[hover]:bg-tabselected/85 data-[selected]:data-[hover]:text-btncolor data-[focus]:outline-1 data-[focus]:outline-btnhoverbg');

    const sorry = () => {setModalMsg(['Apology', 'Sorry, this feature has not yet been implemented!']); setShowModal(true);}

    console.log(`Rendering... focusItem=${focusItem && focusItem.key} haGroup=${focusItem && highestActive(focusItem).getString()}]`);
    //console.log(`Rendering... preselected=[${preselection.map(item => item.key).join(', ')}]`);

    return ( // We give this div the 'pasi' class to prevent certain css styles from taking effect:
        <DarkModeContext.Provider value={dark}>
            <div id='main-panel' className='pasi flex my-8 p-6'> 
                <div id='canvas-and-code' className='flex flex-col flex-grow scrollbox min-w-[900px] max-w-[1200px] '>
                    <div id='canvas' ref={canvasRef} className='bg-canvasbg border-canvasborder h-[640px] relative overflow-auto border'
                            onMouseDown= {canvasMouseDown}>
                        {enodes.map((enode, i) => 
                            <ENodeComp key={enode.key} id={enode.key} enode={enode} bg={dark? canvasHSLDark: canvasHSLLight}
                                markColor={dark && enode.shading<0.5? MARK_COLOR1_DARK_MODE: MARK_COLOR1_LIGHT_MODE}  // a little hack to ensure that the 'titles' of nodes remain visible when the nodes become heavily shaded
                                focus={focusItem===enode} 
                                selected={getSelectPositions(enode)} 
                                preselected={preselection2.includes(enode)}
                                onMouseDown={itemMouseDown}
                                onMouseEnter={itemMouseEnter} 
                                onMouseLeave={itemMouseLeave} />)}
                        {points.map(point => 
                            <PointComp key={point.key} x={point.x} y={point.y} 
                                markColor={dark? MARK_COLOR0_DARK_MODE: MARK_COLOR0_LIGHT_MODE} />)}
                        <style> {/* we're using polylines for the 'mark borders' of items */}
                            @keyframes oscillate {'{'} 0% {'{'} opacity: 1; {'}'} 50% {'{'} opacity: 0.1; {'}'} 100% {'{'} opacity: 1; {'}}'}
                            polyline {'{'} stroke: {dark? MARK_COLOR1_DARK_MODE: MARK_COLOR1_LIGHT_MODE}; stroke-width: {`${MARK_LINEWIDTH}px`}; {'}'}
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
                                    fill={lasso.deselect? (dark? lassoDeselectDark: lassoDeselectLight): 'none'}
                                    stroke={dark? LASSO_COLOR_DARK_MODE: LASSO_COLOR_LIGHT_MODE} strokeWidth = {MARK_LINEWIDTH} strokeDasharray={LASSO_DASH} />
                            </svg>
                        }
                        {/* Finally we add an invisible bottom-right 'limit point', which is needed to block automatic adjustment of canvas scrollbars during dragging: */}
                        {(limit.x>W || limit.y<0) &&
                            <PointComp key={limit.key} 
                                x={Math.ceil(limit.x/W)*W + (limit.x>W? 10: -40)}  // The extra term is to provide a bit of margin and to avoid an unnecessary scroll bar.
                                y={Math.floor(limit.y/H)*H + (limit.y<0? -10: 40)} // Ditto.
                                markColor='red' visible={false} /> 
                        }
                    </div>
                    <div id='code-panel' className='bg-codepanelbg text-codepanelcolor min-w-[900px] h-[190px] mt-[25px] shadow-inner'>
                    </div>
                </div>
                <div id='button-panels' className='flex-grow min-w-[300px] max-w-[380px] select-none'>
                    <div id='button-panel-1' className='flex flex-col ml-[25px] h-[640px]'>
                        <div id='add-panel' className='grid grid-cols-2 mb-3'>
                            <BasicColoredButton id='node-button' label='Node' style='rounded-xl mr-1.5' 
                                disabled={points.length<1 || enodes.length>=MAX_NUMBER_OF_ENODES} onClick={addEntityNodes} />
                            <BasicColoredButton id='contour-button' label='Contour' style='rounded-xl' disabled={points.length<1} onClick={sorry} />  
                        </div>                    

                        <div id='di-panel' className='grid justify-items-stretch border border-btnborder/50 p-1.5 mb-3 rounded-xl'>
                            <Menu>
                                <MenuButton className='group inline-flex items-center gap-2 mb-2 rounded-md bg-btnbg/85 px-4 py-1 text-sm text-btncolor shadow-inner 
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
                                            className='w-72 origin-top-right rounded-md border border-menuborder bg-btnbg/20 backdrop-blur-md p-1 text-sm text-btncolor [--anchor-gap:var(--spacing-1)] focus:outline-none'>
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
                        <BasicColoredButton id='combi-button' label='Copy selection' style='rounded-xl mb-3' 
                            disabled={
                                selection.length<1 || 
                                enodes.length + selection.length >= MAX_NUMBER_OF_ENODES ||
                                (hDisplacement<0 && selection.reduce((min, item) => (min<item.x)? min: item.x, Infinity) + hDisplacement < 0) ||
                                (vDisplacement>0 && selection.reduce((max, item) => (max>item.y)? max: item.y, -Infinity) + vDisplacement > H) ||
                                (hDisplacement>0 && selection.reduce((max, item) => (max>item.x)? max: item.x, -Infinity) + hDisplacement > MAX_X) ||
                                (vDisplacement<0 && selection.reduce((min, item) => (min<item.y)? min: item.y, Infinity) + vDisplacement < MIN_Y)
                            } onClick={copySelection} /> 

                        <TabGroup className='flex-1 w-[275px]' selectedIndex={selection.length==0? 0: userSelectedTabIndex} onChange={setUserSelectedTabIndex}>
                            <TabList className="grid grid-cols-3">
                                <Tab key='editor-tab'className={clsx(tabClassName, 'rounded-tl-xl')}>
                                    Editor
                                </Tab>
                                <Tippy theme={dark? 'translucent': 'light'} delay={[400,0]} arrow={false} content='Transform selection'>
                                    <Tab key='transform-tab' className={tabClassName} disabled={selection.length==0}>
                                        Transform
                                    </Tab>
                                </Tippy>
                                <Tippy theme={dark? 'translucent': 'light'} delay={[400,0]} arrow={false} content='Manage groups'>
                                    <Tab key='group-tab' className={clsx(tabClassName, 'rounded-tr-xl')} disabled={!focusItem}>
                                        Groups
                                    </Tab>
                                </Tippy>
                            </TabList>
                            <TabPanels className='mb-2 flex-1 bg-white/5 border border-btnborder/50 h-[372px] rounded-b-xl overflow-auto scrollbox'>
                                <TabPanel key='editor-panel' className='rounded-xl px-2 pt-2 pb-3 h-full'>
                                    {focusItem?
                                        <ItemEditor info={focusItem.getInfo(focusItem instanceof ENode? enodes: [], itemEditorConfig)} 
                                            onChange={(e, i) => {
                                                const [edit, applyToAll] = focusItem.handleEditing(e, itemEditorConfig, selection, i);
                                                const nodes = applyToAll? 
                                                    deduplicatedSelection.reduce((acc: ENode[], item: Item) => {
                                                            //console.log(`Editing item ${item.key}`);
                                                            return edit(item, acc) as ENode[]
                                                    }, enodes):
                                                    edit(focusItem, enodes);
                                                setEnodes(prev => nodes as ENode[]); // for some reason, the setter function is called twice here.
                                                adjustLimit();
                                                setOrigin(false);
                                                const canvas = canvasRef.current;
                                                if (canvas) {
                                                    const dx = focusItem.x - canvas.scrollLeft;
                                                    const scrollRight = Math.floor(dx/W) * W;
                                                    const dy = canvas.scrollTop + focusItem.y;
                                                    const scrollDown = -Math.floor(dy/H) * H;
                                                    setTimeout(() => {
                                                        canvas.scrollBy(scrollRight, scrollDown);
                                                    }, 0);
                                                }
                                                setPoints(prevPoints => [...prevPoints]);  // to trigger a re-render                               
                                            }} />
                                        :
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
                                        hFlipPossible={!selection.some(item => {
                                            const x = 2*origin.x - item.x; // simulate hFlip on item
                                            return x<0 || x>MAX_X;
                                        })} 
                                        vFlipPossible={!selection.some(item => {
                                            const y = 2*origin.y - item.y; // simulate vFlip on item
                                            return y<MIN_Y || y>H;
                                        })} 
                                        logIncrements={logIncrements} transformFlags={transformFlags}
                                        testRotation={angle => {
                                            for(const item of deduplicatedSelection) {
                                                const {x, y} = rotatePoint(item.x, item.y, origin.x, origin.y, angle);
                                                if (x<0 || x>MAX_X) return false;
                                                if (y<MIN_Y || y>H) return false;
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
                                                if (y<MIN_Y || y>H) return false;
                                                if (transformFlags.scaleENodes && item instanceof ENode) {
                                                    const v = item.radius100 * val/100;
                                                    if(v<0 || v>MAX_RADIUS) return false;
                                                }
                                                if (transformFlags.scaleLinewidths) {
                                                    const v = item.linewidth100 * val/100;
                                                    if(v<0 || v>MAX_LINEWIDTH) return false;
                                                }
                                                if (transformFlags.scaleDash) {
                                                    if(item.dash100.some(l => {
                                                            const v = l * val/100;
                                                            return v<0 || v>MAX_DASH_VALUE;
                                                    })) return false;
                                                }
                                            }
                                            return true
                                        }}
                                        scale={newValue => {
                                            deduplicatedSelection.forEach(item => {
                                                ({x: item.x, y: item.y} = scalePoint(item.x100, item.y100, origin.x, origin.y, newValue/100));
                                                if(transformFlags.scaleENodes && item instanceof ENode) item.radius = item.radius100 * newValue/100;
                                                if(transformFlags.scaleLinewidths) item.linewidth = item.linewidth100 * newValue/100;
                                                if(transformFlags.scaleDash) item.dash = item.dash100.map(l => l * newValue/100);
                                            }); 
                                            adjustLimit();
                                            setScaling(newValue);
                                        }}
                                        hFlip={() => {
                                            deduplicatedSelection.forEach(item => {
                                                item.x = 2*origin.x - item.x;
                                                item.x100 = 2*origin.x - item.x100;
                                            });
                                            adjustLimit();
                                            setPoints(prevPoints => [...prevPoints]);  // to trigger a re-render                                   
                                        }}
                                        vFlip={() => {
                                            deduplicatedSelection.forEach(item => {
                                                item.y = 2*origin.y - item.y;
                                                item.y100 = 2*origin.y - item.y100;
                                            });
                                            adjustLimit();
                                            setPoints(prevPoints => [...prevPoints]);  // to trigger a re-render                                  
                                        }} />
                                </TabPanel>
                                <TabPanel key='groups-panel' className="rounded-xl p-3">
                                    {focusItem &&
                                        <GroupTab item={focusItem} adding={adding} dissolveAdding={dissolveAdding} 
                                            create={() => {
                                                const members = deduplicatedSelection.map(highestActive).filter((m, i, array) => i===array.indexOf(m));
                                                const group = new StandardGroup<Item | Group<any>>(members);
                                                members.forEach(member => {
                                                    const oldGroup = member.group;
                                                    if(oldGroup) oldGroup.members = oldGroup.members.filter(m => m!==member);
                                                    member.group = group;
                                                    member.isActiveMember = true;
                                                })
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

                        <div id='undo-panel' className='mt-1 grid grid-cols-3'>
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
                    <Modal isOpen={showModal} closeTimeoutMS={1000}
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