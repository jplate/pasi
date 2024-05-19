import React, {useState, useRef } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels, Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import NextImage, {StaticImageData} from 'next/image';  
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';
import clsx from 'clsx/lite';

import Point from './Point.tsx';
import ENode from './ENode.tsx';

import lblSrc from '../../../icons/lbl.png';
import adjSrc from '../../../icons/adj.png';
import cntSrc from '../../../icons/cnt.png';
import entSrc from '../../../icons/ent.png';
import exsSrc from '../../../icons/exs.png';
import idtSrc from '../../../icons/idt.png';
import incSrc from '../../../icons/inc.png';
import insSrc from '../../../icons/ins.png';
import negSrc from '../../../icons/neg.png';
import orpSrc from '../../../icons/orp.png';
import prdSrc from '../../../icons/prd.png';
import ptrSrc from '../../../icons/ptr.png';
import rstSrc from '../../../icons/rst.png';
import trnSrc from '../../../icons/trn.png';
import unvSrc from '../../../icons/unv.png';

export const MARK_COLOR0_LIGHT_MODE = '#8877bb';
export const MARK_COLOR0_DARK_MODE = '#000000';
export const MARK_COLOR1_LIGHT_MODE = '#b0251a';
export const MARK_COLOR1_DARK_MODE = '#000000';
export const MARK_LINEWIDTH = 1.0;


class Item {
    constructor(public key: string, public x: number, public y: number) {}
}

class PointRep extends Item {
    constructor(public x: number, public y: number) {
        super(`x${x}y${y}`, x, y);
    }
}

class ENodeRep extends Item {
    constructor(public key: string, public x: number, public y: number) {
        super(key, x, y);
    }
}


class DepItemLabel {   
    constructor(public label: string, public src: StaticImageData, public alt: string) {}
    getImageComp(dark: boolean): React.ReactNode {
        return <NextImage src={this.src} alt={this.alt} width={28} className={clsx('inline object-contain', (dark? 'filter invert sepia': ''))} />;    
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
    const ENODE_ID_PREFIX = 'E';
    const CANVAS_CLICK_THRESHOLD = 3; // For determining when a mouseUp is a mouseClick

    const canvasRef = useRef<HTMLDivElement>(null);
    const [depItemIndex, setDepItemIndex] = useState(depItemLabels.indexOf(labelItemLabel));
    const [pixel, setPixel] = useState(1.0);
    const [replace, setReplace] = useState(true);
    const [points, setPoints] = useState<PointRep[]>([]);
    const [enodes, setEnodes] = useState<ENodeRep[]>([]);
    const [enodeCounter, setEnodeCounter] = useState(0); // used for generating keys
    const [selection, setSelection] = useState<Item[]>([]); // list of selected items; multiple occurrences are allowed    
    const [focusItem, setFocusItem] = useState<Item | null>(null); // the item that carries the 'focus', relevant for the editor pane
    const [limit, setLimit] = useState<PointRep>(new PointRep(0,0)); // the current bottom-right corner of the 'occupied' area of the canvas (which can be adjusted by the user moving items around)


    const getLimit = (nodes: ENodeRep[]) => { // return the bottom-right-most limit of the nodes 
        let right = 0;
        let bottom = 0;
        nodes.forEach((enode) => {
            if(enode.x > right) right = enode.x;
            if(enode.y > bottom) bottom = enode.y;
        });
        return new PointRep(right, bottom);
    }

    const getSelectPositions = (item: Item, array = selection) => {
        let result: number[] = [];
        let index = 0;
        if(item instanceof ENodeRep) {
            array.forEach(element => {
                if(element===item) {
                    result = [...result, index];
                }
                if(element instanceof ENodeRep) { // if the element isn't an ENode, we're not counting it.
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
        const index = selection.lastIndexOf(item);
        if(index<0) {
            console.log(`Error: Item ${item.key}, to be deselected, is not in selection!`);
        } else {
            console.log(`Deselecting; ${item.key}`);
            if(focusItem===item && index==selection.indexOf(item)) {
                setFocusItem(null);
            }
            const newSelection = selection.slice(0, index).concat(selection.slice(index+1));
            setSelection(newSelection);
            return item;
        }
    }

    
    const itemMouseDown = (id: string, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => { // mouse down handler for items on the canvas
        e.stopPropagation();
        const item = id.startsWith(ENODE_ID_PREFIX)? enodes.find(element => element.key===id): null;
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
                const startY = e.clientY - item.y; 
                const selectionWithoutDuplicates = newSelection.filter((item, i) => i===newSelection.indexOf(item));
                const xMinD = item.x - selectionWithoutDuplicates.reduce((min, it) => it.x<min? it.x: min, item.x); // x-distance to the left-most selected item
                const yMinD = item.y - selectionWithoutDuplicates.reduce((min, it) => it.y<min? it.y: min, item.y); // y-distance to the top-most selected item
                
                const handleMouseMove = (e: MouseEvent) => {
                    // We have to prevent the enode, as well as the left-most and top-most selected item, from being dragged outside the 
                    // canvas to the left or top (from where they couldn't be recovered):
                    const dx = Math.max(e.clientX, startX + xMinD) - startX - item.x;
                    const dy = Math.max(e.clientY, startY + yMinD) - startY - item.y;
                    selectionWithoutDuplicates.forEach(item => {
                        item.x += dx;
                        item.y += dy;
                    });
                    setPoints([...points]); // We're triggering a re-render with the points array, which should be relatively cheap.
                };            
                const handleMouseUp = () => {
                    window.removeEventListener('mousemove', handleMouseMove);
                    window.removeEventListener('mouseup', handleMouseUp);
                    setLimit(getLimit(enodes)); // set the new bottom-right limit
                };
            
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);

                setPoints(newPoints);
                setSelection(newSelection);
                setFocusItem(item);
            }           
        } 
    };

    const canvasMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {  // mouseDown handler for the canvas. Adds and removes Points. The reason why we have to go through the trouble
            // of effectively implementing a mouseClick handler is that, after dragging an item over the canvas, the mouse might end up being over the canvas instead of the item. If the mouse button 
            // is then released, this would normally cause a mouseClick event. To prevent that, we have to make sure that we don't count these events unless the mouse was originally pressed over the canvas.
        const { left, top } = canvasRef.current?.getBoundingClientRect()?? {left: 0, top: 0};
        const { scrollLeft, scrollTop} = canvasRef.current?? {scrollLeft: 0, scrollTop:0};
        const x = e.clientX - left + scrollLeft;
        const y = e.clientY - top + scrollTop;
        const newPoint = new PointRep(x, y);
        
        const handleMouseUp = (mue: MouseEvent) => {
            canvasRef.current?.removeEventListener('mouseup', handleMouseUp);
            const dx = mue.clientX - e.clientX;
            const dy = mue.clientY - e.clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if(dist < CANVAS_CLICK_THRESHOLD) { // Only in this case, the mouseUp event should be interpreted as a click event.
                if (!e.shiftKey) {
                    setPoints([newPoint]);
                    setSelection([]);
                    setFocusItem(null);
                } else {
                    let included = points.some(p => newPoint.key==p.key);
                    if (!included) setPoints(prevPoints => [...prevPoints, newPoint]);
                }
            }
        };
    
        canvasRef.current?.addEventListener('mouseup', handleMouseUp);
    };

    const addEntityNodes = () => { // onClick handler for the node button
        if(points.length>0) {
            let counter = enodeCounter;
            const newNodes = points.map((point, i) => new ENodeRep(ENODE_ID_PREFIX+counter++, point.x, point.y));
            const nodes = [...enodes, ...newNodes];
            setEnodeCounter(counter);
            setEnodes(nodes);
            setPoints([]);
            setSelection(newNodes);
            setFocusItem(newNodes[newNodes.length-1]);
            setLimit(getLimit(nodes));
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



    console.log(`Rendering... darMode=${dark} focusItem=${focusItem && focusItem.key} selected=[${selection.map(item => item.key).join(', ')}]`);

    const basicButtonClass = clsx('block px-2 py-1 text-base font-medium border', 
        'disabled:opacity-50 enabled:hover:font-semibold enabled:hover:border-transparent transition',
        'focus:outline-none focus:ring-1');

    const btnClassName0 = clsx(basicButtonClass, 'bg-btnbg/85 text-btncolor border-btnborder/50 enabled:hover:text-btnhovercolor enabled:hover:bg-btnhoverbg',
        'enabled:active:bg-btnactivebg enabled:active:text-btnactivecolor focus:ring-btnfocusring');

    // The standard button:
    const btnClassName1 = clsx(btnClassName0, 'rounded-xl');

    // The delete button gets some special colors:
    const btnClassName2 = clsx(basicButtonClass, 'rounded-xl', 
        (dark? 'bg-[#55403c]/85 text-red-700 border-btnborder/50 enabled:hover:text-btnhovercolor enabled:hover:bg-btnhoverbg enabled:active:bg-btnactivebg enabled:active:text-black focus:ring-btnfocusring':
            'bg-pink-50/85 text-pink-600 border-pink-600/50 enabled:hover:text-pink-600 enabled:hover:bg-pink-200 enabled:active:bg-red-400 enabled:active:text-white focus:ring-pink-400'));

    const tabClassName = clsx('py-1 px-2 text-sm/6 bg-btnbg/85 text-btncolor border border-btnborder/50', 
        'focus:outline-none data-[selected]:bg-tabselected/85 data-[selected]:font-semibold data-[hover]:bg-btnhoverbg data-[hover]:text-btnhovercolor data-[hover]:font-semibold transition',
        'data-[selected]:data-[hover]:bg-tabselected/85 data-[selected]:data-[hover]:text-btncolor data-[focus]:outline-1 data-[focus]:outline-btnhoverbg');


    return ( // We give this div the 'pasi' class to prevent certain css styles from taking effect:
        <div id='main-panel' className='pasi flex mt-8 p-6'> 
            <div id='canvas-and-code' className = 'flex-1 mb-3 scrollbox'>
                <div id='canvas' ref={canvasRef} className='bg-canvasbg border-canvasborder min-w-[800px] max-w-[1200px] h-[600px] relative overflow-auto border'
                        onMouseDown= {canvasMouseDown}>
                    {enodes.map((enode, i) => 
                        <ENode key={enode.key} id={enode.key} x={enode.x} y={enode.y} 
                            markColor={dark? MARK_COLOR1_DARK_MODE: MARK_COLOR1_LIGHT_MODE}
                            selected={getSelectPositions(enode)} 
                            focus={focusItem===enode} 
                            onMouseDown={itemMouseDown} />)}
                    {points.map(point => 
                        <Point key={point.key} x={point.x} y={point.y} 
                            markColor={dark? MARK_COLOR0_DARK_MODE: MARK_COLOR0_LIGHT_MODE} />)}
                    <style> {/* we're using polylines for the 'mark borders' of items */}
                        @keyframes oscillate {'{'} 0% {'{'} opacity: 1; {'}'} 50% {'{'} opacity: 0.1; {'}'} 100% {'{'} opacity: 1; {'}}'}
                        polyline {'{'} stroke: {dark? MARK_COLOR1_DARK_MODE: MARK_COLOR1_LIGHT_MODE}; stroke-width: {`${MARK_LINEWIDTH}px`}; {'}'}
                        .focused polyline {'{'} opacity: 1; animation: oscillate 1.5s infinite {'}'}
                        .selected polyline {'{'} opacity: 1; {'}'}
                        .unselected polyline {'{'} opacity: 0; {'}'}
                        .unselected:hover polyline {'{'} opacity: 0.65; transition: 0.3s; {'}'}
                    </style>
                    <Point key={limit.key} x={limit.x + 20} y={limit.y + 20} markColor='red' visible={false} />
                </div>
                <div id='code-panel' className='bg-codepanelbg text-codepanelcolor min-w-[800px] h-[190px] my-[25px] shadow-inner'>
                </div>
            </div>
            <div id='button-panels' style={{flex: 1, minWidth: '300px', maxWidth: '380px', userSelect: 'none'}}>
                <div id='button-panel-1' className='flex flex-col' style={{height: '600px', margin: '0px 25px 0px'}}>
                    <div id='add-panel' className='grid grid-cols-2 mb-3'>
                        <button id='node-button' className={clsx(btnClassName1, 'mr-1.5')} disabled={points.length<1} onClick={addEntityNodes}>  
                            Node
                        </button>
                        <button id='contour-button' className={btnClassName1} disabled={points.length<1} onClick={addContours}>  
                            Contour
                        </button> 
                    </div>                    

                    <div id='di-panel' className='grid justify-items-stretch border border-btnborder p-1.5 mb-3 rounded-xl'>
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
                        <button id='create-button' className={clsx(btnClassName0, 'rounded-md')}> 
                            Create
                        </button>
                    </div>
                    <button id='combi-button' className={clsx(btnClassName1, 'mb-3')} disabled={selection.length<1}> 
                        Copy Selection
                    </button> 

                    <TabGroup className='flex-1'>
                        <TabList className="grid grid-cols-3">
                            <Tab key='editor-tab'className={clsx(tabClassName, 'rounded-l-lg')}>
                                Editor
                            </Tab>
                            <Tab key='transform-tab' className={tabClassName}>
                                Transform
                            </Tab>
                            <Tab key='group-tab' className={clsx(tabClassName, 'rounded-r-lg')}>
                                Groups
                            </Tab>
                        </TabList>
                        <TabPanels className="mt-3 flex-1">
                            <TabPanel key='editor-panel' className="rounded-xl bg-white/5 p-3 overflow-y-auto">
                                Editor panel
                                <ul>
                                </ul>
                            </TabPanel>
                            <TabPanel key='transform-panel' className="rounded-xl bg-white/5 p-3">
                                Transform panel
                                <ul>
                                </ul>
                            </TabPanel>
                            <TabPanel key='groups-panel' className="rounded-xl bg-white/5 p-3">
                                Groups panel
                                <ul>
                                </ul>
                            </TabPanel>
                        </TabPanels>
                    </TabGroup>

                    <div id='undo-panel' className='grid grid-cols-3'>
                        <Tippy theme={dark? 'dark': 'light'} delay={[400,0]} arrow={false} content='Undo'>
                            <button id='undo-button' className={clsx(btnClassName1, 'mr-1.5')}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto">
                                    <g transform="rotate(-45 12 12)">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                                    </g>
                                </svg>
                                <span className='sr-only'>Undo</span>
                            </button>
                        </Tippy>
                        <Tippy theme={dark? 'dark': 'light'} delay={[400,0]} arrow={false} content='Redo'>
                            <button id='redo-button' className={clsx(btnClassName1, 'mr-1.5')}> 
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto">
                                    <g transform="rotate(45 12 12)">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
                                    </g>
                                </svg>
                                <span className='sr-only'>Redo</span> 
                            </button>
                        </Tippy>
                        <Tippy theme={dark? 'dark': 'light'} delay={[400,0]} arrow={false} content='Delete'>
                            <button id='del-button' className={btnClassName2} disabled={selection.length<1} onClick={deleteSelection} > 
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>                         
                                <span className='sr-only'>Delete</span> 
                            </button>
                        </Tippy>
                    </div>
                </div>
                <div id='button-panel-2'
                        className='grid justify-items-stretch'
                        style={{margin: '25px 25px 25px'}}>
                    <button className={clsx(btnClassName1, 'mb-1')}> 
                        Generate
                    </button>
                    <div className='flex items-center justify-end mb-4 px-4 py-1 text-sm'>
                        1 pixel = 
                        <input className='w-16 ml-1 px-2 py-1 mr-1 text-right border border-btnborder rounded-md focus:outline-none bg-textfieldbg text-textfieldcolor'
                            type='number' step='0.1' value={pixel}
                            onChange={(e) => setPixel(parseFloat(e.target.value))}/>
                        pt
                    </div>
                    <button className={clsx(btnClassName1, 'mb-1')}> 
                        Load
                    </button>
                    <div className='px-4 py-1 text-sm'>
                        <input type='checkbox' className='mr-2' checked={replace} onChange={()=>{setReplace(!replace);}} /> 
                        <a className='text-textcolor hover:text-textcolor' href='#' 
                                onClick={(e) => {
                                    e.preventDefault();
                                    setReplace(!replace);
                                }}> 
                            Replace current diagram 
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainPanel;