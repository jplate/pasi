import React, { useState, useRef, useEffect } from 'react'
import { Tab, TabGroup, TabList, TabPanel, TabPanels, Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import NextImage, { StaticImageData } from 'next/image'
import Tippy from '@tippyjs/react'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'
import 'tippy.js/themes/translucent.css'
import clsx from 'clsx/lite'

import Item, { MAX_LINEWIDTH, MAX_DASH_LENGTH, MAX_DASH_VALUE } from './Item.tsx'
import { CheckBoxField, validFloat } from './EditorComponents.tsx'
import CanvasEditor from './CanvasEditor.tsx'
import ItemEditor from './ItemEditor.tsx'
import TransformTab from './TransformTab.tsx'
import ENode, { ENodeComp, MAX_RADIUS } from './ENode.tsx'
import Point, { PointComp } from './Point.tsx'

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

export const H = 638; // the height of the canvas; needed to convert screen coordinates to Tex coordinates
export const MAX_X = 9999 // the highest possible TeX coordinate for an Item
export const MIN_Y = H-9999 // the lowest possible TeX coordinate for an Item 

export const MARK_COLOR0_LIGHT_MODE = '#8877bb';
export const MARK_COLOR0_DARK_MODE = '#000000';
export const MARK_COLOR1_LIGHT_MODE = '#b0251a';
export const MARK_COLOR1_DARK_MODE = '#000000';
export const MARK_LINEWIDTH = 1.0;
export const LASSO_COLOR_LIGHT_MODE = 'rgba(136, 119, 187, 200)';
export const LASSO_COLOR_DARK_MODE = 'rgba(100, 50, 0, 200)';
export const LASSO_DASH = '2';

export const DEFAULT_HGAP = 10;
export const DEFAULT_VGAP = 10;
export const MIN_GAP = 1;
export const MAX_GAP = 255;
export const DEFAULT_HSHIFT = 0;
export const DEFAULT_VSHIFT = 0;
export const MIN_SHIFT = 0;
export const MAX_SHIFT = 255;
export const DEFAULT_HDISPLACEMENT = 20;
export const DEFAULT_VDISPLACEMENT = 0;
export const MIN_DISPLACEMENT = 0;
export const MAX_DISPLACEMENT = 255;
const DEFAULT_ROTATION_LOG_INCREMENT = 1
const DEFAULT_SCALING_LOG_INCREMENT = 1

export const CONTOUR_CENTER_SNAP_RADIUS = 10;
export const CONTOUR_NODE_SNAP_RADIUS = 15;

const CANVAS_CLICK_THRESHOLD = 3; // For determining when a mouseUp is a mouseClick
const canvasHSLLight = {hue: 0, sat: 0, lgt: 100} // to be passed to ENodes
const canvasHSLDark = {hue: 29.2, sat: 78.6, lgt: 47.65} 
const lassoDeselectLight = 'rgba(255, 255, 255, 0.5)';
const lassoDeselectDark = 'rgba(0, 0, 0, 0.1)';

export const basicButtonClass = clsx('block px-2 py-1 text-base font-medium border', 
    'disabled:opacity-50 enabled:hover:font-semibold enabled:hover:border-transparent transition',
    'focus:outline-none focus:ring-1');

export const basicColoredButtonClass = clsx(basicButtonClass, 'bg-btnbg/85 text-btncolor border-btnborder/50 enabled:hover:text-btnhovercolor enabled:hover:bg-btnhoverbg',
    'enabled:active:bg-btnactivebg enabled:active:text-btnactivecolor focus:ring-btnfocusring');

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



interface MainPanelProps {
    dark: boolean;
}

const MainPanel = ({dark}: MainPanelProps) => {

    const canvasRef = useRef<HTMLDivElement>(null);
    const [depItemIndex, setDepItemIndex] = useState(depItemLabels.indexOf(labelItemLabel));
    const [pixel, setPixel] = useState(1.0);
    const [replace, setReplace] = useState(true);
    const [points, setPoints] = useState<Point[]>([]);
    const [enodes, setEnodes] = useState<ENode[]>([]);
    const [enodeCounter, setEnodeCounter] = useState(0); // used for generating keys
    const [selection, setSelection] = useState<Item[]>([]); // list of selected items; multiple occurrences are allowed    
    const [focusItem, setFocusItem] = useState<Item | null>(null); // the item that carries the 'focus', relevant for the editor pane
    const [limit, setLimit] = useState<Point>(new Point(0,0)); // the current bottom-right corner of the 'occupied' area of the canvas (which can be adjusted by the user moving items around)

    const [grid, setGrid] = useState(createGrid());
    const [hDisplacement, setHDisplacement] = useState(DEFAULT_HDISPLACEMENT);
    const [vDisplacement, setVDisplacement] = useState(DEFAULT_VDISPLACEMENT);

    const [lasso, setLasso] = useState<Lasso | null>(null);
    const [preselection, setPreselection] = useState<Item[]>([]);
    const preselectionRef = useRef<Item[]>([]);
    preselectionRef.current = preselection;

    const [userSelectedTabIndex, setUserSelectedTabIndex] = useState(0); // canvas editor is default
    const [rotation, setRotation] = useState(0);
    const [scaling, setScaling] = useState(100); // default is 100%
    const [origin, ] = useState({x: 0, y: 0}); // the point around which to rotate and from which to scale
    const [logIncrements, ] = useState({rotate: DEFAULT_ROTATION_LOG_INCREMENT, scale: DEFAULT_SCALING_LOG_INCREMENT});
    const [transformFlags, ] = useState({scaleArrowheads: false, scaleENodes: false, scaleDash: false, scaleLinewidths: false, flipArrowheads: false});


    useEffect(() => { // record the origin, and reset the transformations if necessary
        const {x, y} = points.length>0? points[points.length-1]: 
            focusItem?? selection.length>0? selection[selection.length-1]: {x: 0, y: 0};
        if(x!==origin.x || y!==origin.y) {
            origin.x = x;
            origin.y = y;
            if(rotation!==0 || scaling!==100) resetTransform();
        }
    }, [points, focusItem, selection]);

    const resetTransform = () => {
        setRotation(0);
        setScaling(100);
        enodes.forEach(item => { // resetting the items for new scaling (if it should come to that)
            item.x100 = item.x;
            item.y100 = item.y;
            item.radius100 = item.radius;
            item.lineWidth100 = item.lineWidth;
            item.dash100 = item.dash;
        });
    }

    const getLimit = (nodes: ENode[]) => { // return the bottom-right-most limit of the nodes 
        let right = 0;
        let bottom = 0;
        nodes.forEach((enode) => {
            if(enode.x > right) right = enode.x;
            if(enode.y > bottom) bottom = enode.y;
        });
        return new Point(right, bottom);
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
        } else { // Items that aren't ENodes don't need that much detail; just give them a [0] if they're included in the selection.
            if(array.includes(item)) {
                result = [0];
            }
        }  
        return result;
    }

    const deselect = (item: Item) => {
        setSelection(prev => {
            const newSelection = prev.filter(it => it!==item);
            if(focusItem && !newSelection.includes(focusItem)) {
                setFocusItem(null);
            }
            return newSelection
        });
        return item;
    }
    
    const itemMouseDown = (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => { // mouse down handler for items on the canvas
        e.stopPropagation();
        if(item) {
            if(e.ctrlKey && selection.includes(item)) {
                deselect(item);
            } else {
                console.log(`Selecting: ${item.key}`);
                let newPoints = points;
                let newSelection = selection; 
                if(!e.shiftKey) { // clear the selection and the points
                    newSelection = [];
                    newPoints = [];
                }
                newSelection = [...newSelection, item];

                // Handle dragging:
                const startX = e.clientX - item.x; 
                const startY = e.clientY - (H-item.y); 
                const selectionWithoutDuplicates = newSelection.filter((item, i) => i===newSelection.indexOf(item));
                const xMinD = item.x - selectionWithoutDuplicates.reduce((min, it) => it.x<min? it.x: min, item.x); // x-distance to the left-most selected item
                const yMinD = (H-item.y) - selectionWithoutDuplicates.reduce((min, it) => (H-it.y)<min? it.y: min, H-item.y); // y-distance to the top-most selected item
                
                const handleMouseMove = (e: MouseEvent) => {
                    // We have to prevent the enode, as well as the left-most and top-most selected item, from being dragged outside the 
                    // canvas to the left or top (from where they couldn't be recovered):
                    const newX = Math.max(e.clientX, startX + xMinD) - startX;
                    const newY = H-(Math.max(e.clientY, startY + yMinD) - startY);
                    // Next, we take into account the grid:
                    const dx = newX + grid.hGap/2 - ((newX + grid.hGap/2 - grid.hShift) % grid.hGap) - item.x;
                    const dy = newY + grid.vGap/2 - ((newY + grid.vGap/2 - grid.vShift) % grid.vGap) - item.y;
                    // Finally, we move each item in the selection:
                    if(dx!==0 || dy!==0) {
                        selectionWithoutDuplicates.forEach(item => item.move(dx, dy));
                        setPoints(prevPoints => [...prevPoints]); // We're triggering a re-render with the points array, which should be relatively cheap.
                    }
                };            
                const handleMouseUp = () => {
                    window.removeEventListener('mousemove', handleMouseMove);
                    window.removeEventListener('mouseup', handleMouseUp);
                    const newLimit = getLimit(enodes);
                    if(limit.x!==newLimit.x || limit.y!==newLimit.y) setLimit(newLimit); // set the new bottom-right limit
                };
            
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);

                setPoints(newPoints);
                setSelection(newSelection);
                setFocusItem(item);
            }           
        } 
    };

    const itemMouseEnter = (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => { // mouseOver handler for items on the canvas
        setPreselection(prev => prev.includes(item)? prev: [...prev, item]);
    }

    const itemMouseLeave = (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => { // mouseLeave handler for items on the canvas
        setPreselection(prev => prev.filter(it => it!==item));
    }

    const canvasMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {  // mouseDown handler for the canvas. Adds and removes Points. One reason why we have to go through the trouble
            // of effectively implementing a mouseClick handler is that, after dragging an item over the canvas, the mouse might end up being over the canvas instead of the item. If the mouse button 
            // is then released, this would normally cause a mouseClick event. To prevent that, we have to make sure that we don't count these events unless the mouse was originally pressed over the canvas.
            // The other reason is that we need to add a mouseMoveListener to take care of 'lassoing'.
        const {left, top} = canvasRef.current?.getBoundingClientRect()?? {left: 0, top: 0};
        const {scrollLeft, scrollTop} = canvasRef.current?? {scrollLeft: 0, scrollTop:0};
        const x = e.clientX - left + scrollLeft;
        const y = e.clientY - top + scrollTop;

        const handleMouseUp = (mue: MouseEvent) => {
            canvasRef.current?.removeEventListener('mouseup', handleMouseUp);
            canvasRef.current?.removeEventListener('mousemove', handleMouseMove);

            const dx = mue.clientX - e.clientX;
            const dy = mue.clientY - e.clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if(dist < CANVAS_CLICK_THRESHOLD) { // Only in this case, the mouseUp event should be interpreted as a click event.
                const newPoint = new Point(
                    x + grid.hGap/2 - ((x + grid.hGap/2 - grid.hShift) % grid.hGap), 
                    H - y + grid.vGap/2 - ((H - y + grid.vGap/2 - grid.vShift) % grid.vGap));
                if (!e.shiftKey) {
                    setPoints([newPoint]);
                    setSelection([]);
                    setFocusItem(null);
                } else {
                    const included = points.some(p => newPoint.key==p.key);
                    if (!included) setPoints(prevPoints => [...prevPoints, newPoint]);
                }
            } else { // in this case, we need to take care of the lasso, and either select or deselect items
                let newSelection: Item[];
                const pres = preselectionRef.current;
                const deselect = e.ctrlKey;
                if(deselect) {
                    const toDeselect = pres.reduce((acc: number[], item: Item) => [...acc, selection.lastIndexOf(item)], []);
                    newSelection = selection.filter((item, index) => !toDeselect.includes(index));
                } else {
                    newSelection = e.shiftKey? [...selection, ...pres]: pres;
                }
                setSelection(prev => newSelection);
                if(newSelection.length>0 && (!focusItem || !deselect)) {
                    setFocusItem(newSelection[newSelection.length-1]);
                } else if(newSelection.length==0 || (focusItem && !newSelection.includes(focusItem))) {
                    setFocusItem(null);
                }
            }

            setPreselection([]);
            setLasso(null);
        };

        const handleMouseMove = (mme: MouseEvent) => {
            const dx = mme.clientX - e.clientX;
            const dy = mme.clientY - e.clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if(dist >= CANVAS_CLICK_THRESHOLD) { // Only in this case do we create a Lasso.
                setPoints([]);
                const lasso = new Lasso(Math.min(x, x+dx), Math.min(y, y+dy), Math.max(x, x+dx), Math.max(y, y+dy), e.ctrlKey);
                setPreselection(prev => [
                    ...prev.filter(item => lasso.contains(item)),
                    ...enodes.filter(item => 
                        lasso.contains(item) && !prev.includes(item) && (!lasso.deselect || selection.includes(item)))]);
                setLasso(prevLasso => lasso);
            }
        }
    
        canvasRef.current?.addEventListener('mousemove', handleMouseMove);
        canvasRef.current?.addEventListener('mouseup', handleMouseUp);
    };

    const addEntityNodes = () => { // onClick handler for the node button
        if(points.length>0) {
            let counter = enodeCounter;
            const newNodes = points.map((point, i) => new ENode('E'+counter++, point.x, point.y));
            setEnodeCounter(counter);
            setEnodes(prevEnodes => {
                const nodes = [...prevEnodes, ...newNodes];
                setLimit(getLimit(nodes));                
                return nodes});
            setPoints([]);
            setSelection(newNodes);
            setFocusItem(newNodes[newNodes.length-1]);
        }
    }

    const addContours = () => { // onClick handler for the contour button
        setPoints([]);
    }
    
    const deleteSelection = () => { // onClick handler for the delete button
        if(selection && selection.length>0) {
            const nodes = enodes.filter(item => !selection.includes(item)); 
            setEnodes(nodes);
            setSelection([]);
            setFocusItem(null);
            setLimit(getLimit(nodes));
        }
    }

    /**
     * Rotates a point around another point by a given angle.
     * 
     * @param px - The x-coordinate of the point to rotate.
     * @param py - The y-coordinate of the point to rotate.
     * @param cx - The x-coordinate of the center of rotation.
     * @param cy - The y-coordinate of the center of rotation.
     * @param angle - The rotation angle in degrees.
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
     * 
     * @param px - The x-coordinate of the point to scale.
     * @param py - The y-coordinate of the point to scale.
     * @param ox - The x-coordinate of the origin point.
     * @param oy - The y-coordinate of the origin point.
     * @param scaleFactor - The factor by which to scale the point.
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

    const deduplicatedSelection = selection.filter((item, i) => i===selection.indexOf(item));

    // The standard button:
    const btnClassName1 = clsx(basicColoredButtonClass, 'rounded-xl');

    // The delete button gets some special colors:
    const btnClassName2 = clsx(basicButtonClass, 'rounded-xl', 
        (dark? 'bg-[#55403c]/85 text-red-700 border-btnborder/50 enabled:hover:text-btnhovercolor enabled:hover:bg-btnhoverbg enabled:active:bg-btnactivebg enabled:active:text-black focus:ring-btnfocusring':
            'bg-pink-50/85 text-pink-600 border-pink-600/50 enabled:hover:text-pink-600 enabled:hover:bg-pink-200 enabled:active:bg-red-400 enabled:active:text-white focus:ring-pink-400'));

    const tabClassName = clsx('py-1 px-2 text-sm/6 bg-btnbg/85 text-btncolor border border-btnborder/50 disabled:opacity-50', 
        'focus:outline-none data-[selected]:bg-tabselected/85 data-[selected]:font-semibold data-[hover]:bg-btnhoverbg data-[hover]:text-btnhovercolor data-[hover]:font-semibold transition',
        'data-[selected]:data-[hover]:bg-tabselected/85 data-[selected]:data-[hover]:text-btncolor data-[focus]:outline-1 data-[focus]:outline-btnhoverbg');


    console.log(`Rendering... darkMode=${dark} focusItem=${focusItem && focusItem.key} selected=[${selection.map(item => item.key).join(', ')}]`);
    //console.log(`Rendering... preselected=[${preselection.map(item => item.key).join(', ')}]`);

    return ( // We give this div the 'pasi' class to prevent certain css styles from taking effect:
        <div id='main-panel' className='pasi flex my-8 p-6'> 
            <div id='canvas-and-code' className='flex flex-col flex-grow scrollbox min-w-[900px] max-w-[1200px] '>
                <div id='canvas' ref={canvasRef} className='bg-canvasbg border-canvasborder h-[638px] relative overflow-auto border'
                        onMouseDown= {canvasMouseDown}>
                    {enodes.map((enode, i) => 
                        <ENodeComp key={enode.key} id={enode.key} enode={enode} bg={dark? canvasHSLDark: canvasHSLLight}
                            markColor={dark && enode.shading<0.5? MARK_COLOR1_DARK_MODE: MARK_COLOR1_LIGHT_MODE}  // a little hack to ensure that the 'titles' of nodes remain visible when the nodes become heavily shaded
                            focus={focusItem===enode} 
                            selected={getSelectPositions(enode)} 
                            preselected={preselection.includes(enode)}
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
                    <PointComp key={limit.key} x={limit.x + 20} y={limit.y + 20} markColor='red' visible={false} /> {/* The limiting point, needed to block automatic adjustment of canvas scrollbars during dragging */}
                </div>
                <div id='code-panel' className='bg-codepanelbg text-codepanelcolor min-w-[900px] h-[190px] mt-[25px] shadow-inner'>
                </div>
            </div>
            <div id='button-panels' className='flex-grow min-w-[300px] max-w-[380px] select-none'>
                <div id='button-panel-1' className='flex flex-col ml-[25px] h-[638px]'>
                    <div id='add-panel' className='grid grid-cols-2 mb-3'>
                        <button id='node-button' className={clsx(btnClassName1, 'mr-1.5')} disabled={points.length<1} onClick={addEntityNodes}>  
                            Node
                        </button>
                        <button id='contour-button' className={btnClassName1} disabled={points.length<1} onClick={addContours}>  
                            Contour
                        </button> 
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
                                    <ChevronDownIcon className="size-4 fill-btncolor group-hover:fill-btnhovercolor group-data-[open]:fill-btnhovercolor" />                                    
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
                        <button id='create-button' className={clsx(basicColoredButtonClass, 'rounded-md')}> 
                            Create
                        </button>
                    </div>
                    <button id='combi-button' className={clsx(btnClassName1, 'mb-3')} disabled={selection.length<1}> 
                        Copy Selection
                    </button> 

                    <TabGroup className='flex-1 w-[275px]' selectedIndex={selection.length==0? 0: userSelectedTabIndex} onChange={setUserSelectedTabIndex}>
                        <TabList className="grid grid-cols-3">
                            <Tab key='editor-tab'className={clsx(tabClassName, 'rounded-tl-xl')}>
                                Editor
                            </Tab>
                            <Tippy theme={dark? 'translucent': 'light'} delay={[400,0]} arrow={false} content='Transform selection'>
                                <Tab key='transform-tab' className={tabClassName} disabled={!focusItem}>
                                    Transform
                                </Tab>
                            </Tippy>
                            <Tippy theme={dark? 'translucent': 'light'} delay={[400,0]} arrow={false} content='Manage groups'>
                                <Tab key='group-tab' className={clsx(tabClassName, 'rounded-tr-xl')} disabled={!focusItem}>
                                    Groups
                                </Tab>
                            </Tippy>
                        </TabList>
                        <TabPanels className='mb-2 flex-1 bg-white/5 border border-btnborder/50 h-[368px] rounded-b-xl overflow-auto scrollbox'>
                            <TabPanel key='editor-panel' className='rounded-xl px-2 py-2 h-full'>
                                {focusItem?
                                    <ItemEditor item={focusItem} info={focusItem.getInfo(focusItem instanceof ENode? enodes: [])} 
                                        onChange={(e, i) => {
                                            const [edit, applyToAll] = focusItem.handleEditing(e, i);
                                            setEnodes(prevEnodes => applyToAll? 
                                                deduplicatedSelection.reduce((nodes, item) => edit(item, nodes) as ENode[], prevEnodes):
                                                edit(focusItem, prevEnodes) as ENode[]); 
                                            setPoints(prevPoints => [...prevPoints]);  // to trigger a re-render in case enodes has been left unchanged                                   
                                        }} />
                                    :
                                    <CanvasEditor grid={grid} hDisp={hDisplacement} vDisp={vDisplacement}
                                        onHGapChange={(e) => setGrid(prevGrid => ({...prevGrid, hGap: validFloat(e.target.value, MIN_GAP, MAX_GAP)}))} 
                                        onVGapChange={(e) => setGrid(prevGrid => ({...prevGrid, vGap: validFloat(e.target.value, MIN_GAP, MAX_GAP)}))} 
                                        onHShiftChange={(e) => setGrid(prevGrid => ({...prevGrid, hShift: validFloat(e.target.value, MIN_SHIFT, MAX_SHIFT)}))} 
                                        onVShiftChange={(e) => setGrid(prevGrid => ({...prevGrid, vShift: validFloat(e.target.value, MIN_SHIFT, MAX_SHIFT)}))} 
                                        onSnapToNodeChange={() => setGrid(prevGrid => ({...prevGrid, snapToNodes: !prevGrid.snapToNodes}))} 
                                        onSnapToCCChange={() => setGrid(prevGrid => ({...prevGrid, snapToContourCenters: !prevGrid.snapToContourCenters}))} 
                                        onHDispChange={(e) => setHDisplacement(validFloat(e.target.value, MIN_DISPLACEMENT, MAX_DISPLACEMENT))} 
                                        onVDispChange={(e) => setVDisplacement(validFloat(e.target.value, MIN_DISPLACEMENT, MAX_DISPLACEMENT))} 
                                        onReset={() => {
                                            setGrid(createGrid());
                                            setHDisplacement(DEFAULT_HDISPLACEMENT);
                                            setVDisplacement(DEFAULT_VDISPLACEMENT);
                                        }} />
                                }
                            </TabPanel>
                            <TabPanel key='transform-panel' className="rounded-xl px-2 py-2">
                                <TransformTab rotation={rotation} scaling={scaling} logIncrements={logIncrements} transformFlags={transformFlags}
                                    testRotation={(increment, newValue) => {
                                        const angle = -increment; // clockwise rotation
                                        for(const item of deduplicatedSelection) {
                                            const {x, y} = rotatePoint(item.x, item.y, origin.x, origin.y, angle);
                                            if(x && (x<0 || x>MAX_X)) return false
                                            if(y && (y<MIN_Y || y>H)) return false
                                        }
                                        return true
                                    }}
                                    rotate={(increment, newValue) => {
                                        const angle = -increment; // clockwise rotation
                                        deduplicatedSelection.forEach(item => {
                                            ({x: item.x, y: item.y} = rotatePoint(item.x, item.y, origin.x, origin.y, angle));
                                            ({x: item.x100, y: item.y100} = rotatePoint(item.x100, item.y100, origin.x, origin.y, angle))                              
                                        });
                                        setRotation(newValue);
                                    }}
                                    testScaling={val => {
                                        for(const item of deduplicatedSelection) {
                                            const {x, y} = scalePoint(item.x100, item.y100, origin.x, origin.y, val/100)
                                            if(x && (x<0 || x>MAX_X)) return false
                                            if(y && (y<MIN_Y || y>H)) return false
                                            if(transformFlags.scaleENodes && item instanceof ENode) {
                                                const v = item.radius100 * val/100
                                                if(v<0 || v>MAX_RADIUS) return false
                                            }
                                            if(transformFlags.scaleLinewidths) {
                                                const v = item.lineWidth100 * val/100
                                                if(v<0 || v>MAX_LINEWIDTH) return false
                                            }
                                            if(transformFlags.scaleDash) {
                                                if(item.dash100.some(l => {
                                                        const v = l * val/100
                                                        return v<0 || v>MAX_DASH_VALUE
                                                })) return false
                                            }
                                        }
                                        return true
                                    }}
                                    scale={newValue => {
                                        deduplicatedSelection.forEach(item => {
                                            ({x: item.x, y: item.y} = scalePoint(item.x100, item.y100, origin.x, origin.y, newValue/100));
                                            if(transformFlags.scaleENodes && item instanceof ENode) item.radius = item.radius100 * newValue/100;
                                            if(transformFlags.scaleLinewidths) item.lineWidth = item.lineWidth100 * newValue/100;
                                            if(transformFlags.scaleDash) item.dash = item.dash100.map(l => l * newValue/100);
                                        });  
                                        setScaling(newValue);
                                    }} 
                                    onHFlip={() => {
                                        deduplicatedSelection.forEach(item => {
                                            item.x = 2*origin.x - item.x;
                                            item.x100 = 2*origin.x - item.x100;
                                        });
                                        setPoints(prevPoints => [...prevPoints]);  // to trigger a re-render                                   
                                    }}
                                    onVFlip={() => {
                                        deduplicatedSelection.forEach(item => {
                                            item.y = 2*origin.y - item.y;
                                            item.y100 = 2*origin.y - item.y100;
                                        });
                                        setPoints(prevPoints => [...prevPoints]);  // to trigger a re-render                                  
                                    }} />
                            </TabPanel>
                            <TabPanel key='groups-panel' className="rounded-xl p-3">
                                Groups panel
                                <ul>
                                </ul>
                            </TabPanel>
                        </TabPanels>
                    </TabGroup>

                    <div id='undo-panel' className='mt-1 grid grid-cols-3'>
                        <Tippy theme={dark? 'translucent': 'light'} delay={[400,0]} arrow={false} content='Undo'>
                            <button id='undo-button' className={clsx(btnClassName1, 'mr-1.5')}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto">
                                    <g transform="rotate(-45 12 12)">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                                    </g>
                                </svg>
                                <span className='sr-only'>Undo</span>
                            </button>
                        </Tippy>
                        <Tippy theme={dark? 'translucent': 'light'} delay={[400,0]} arrow={false} content='Redo'>
                            <button id='redo-button' className={clsx(btnClassName1, 'mr-1.5')}> 
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto">
                                    <g transform="rotate(45 12 12)">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
                                    </g>
                                </svg>
                                <span className='sr-only'>Redo</span> 
                            </button>
                        </Tippy>
                        <Tippy theme={dark? 'translucent': 'light'} delay={[400,0]} arrow={false} content='Delete'>
                            <button id='del-button' className={btnClassName2} disabled={selection.length<1} onClick={deleteSelection} > 
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>                         
                                <span className='sr-only'>Delete</span> 
                            </button>
                        </Tippy>
                    </div>
                </div>
                <div id='button-panel-2' className='grid justify-items-stretch mt-[25px] ml-[25px]'>
                    <button className={clsx(btnClassName1, 'mb-1 py-2')}> 
                        Generate
                    </button>
                    <div className='flex items-center justify-end mb-4 px-4 py-1 text-sm'>
                        1 pixel = 
                        <input className='w-16 ml-1 px-2 py-0.5 mr-1 text-right border border-btnborder rounded-md focus:outline-none bg-textfieldbg text-textfieldcolor'
                            type='number' step='0.1' value={pixel}
                            onChange={(e) => setPixel(parseFloat(e.target.value))}/>
                        pt
                    </div>
                    <button className={clsx(btnClassName1, 'mb-1 py-2')}> 
                        Load
                    </button>
                    <CheckBoxField label='Replace current diagram' value={replace} onChange={()=>{setReplace(!replace)}} />
                </div>
            </div>
        </div>
    );
};

export default MainPanel;