import React, {useState, useRef } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels, Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import NextImage, {StaticImageData} from 'next/image';  
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';

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

export const MARK_COLOR0 = '#8877bb';
export const MARK_COLOR1 = '#b0251a';
export const MARK_LINEWIDTH = 1.0;

const tailwindColors = {
    'slate-50': '#f8fafc',
    'slate-200': '#e2e8f0',
    'slate-400': '#cbd5e1',
    'slate-500': '#718096',
    'slate-600': '#475569',
    'slate-700': '#4a5568',
    'slate-800': '#2d3748',
};

class DepItemLabel {   
    constructor(public label: string, public src: StaticImageData, public alt: string) {}
    getImageComp(): React.ReactNode {
        return <NextImage src={this.src} alt={this.alt} width={28} className='inline object-contain' />;    
    }
}


class Item {
    constructor(public key: string, public x: number, public y: number) {}
}

class PointRep extends Item {
    constructor(public key: string, public x: number, public y: number) {
        super(key, x, y);
    }
}

class ENodeRep extends Item {
    constructor(public key: string, public x: number, public y: number) {
        super(key, x, y);
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

type CustomToggleProps = {
    children: React.ReactNode;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

const MainPanel = () => {
    const ENODE_ID_PREFIX = 'E';
    const CANVAS_CLICK_THRESHOLD = 3;

    const canvasRef = useRef<HTMLDivElement>(null);
    const [depItemIndex, setDepItemIndex] = useState(depItemLabels.indexOf(labelItemLabel));
    const [pixel, setPixel] = useState(1.0);
    const [replace, setReplace] = useState(true);

    const [points, setPoints] = useState<PointRep[]>([]);
    const pointsRef = useRef<PointRep[]>([]);

    const [enodes, setEnodes] = useState<ENodeRep[]>([]);
    const [enodeCounter, setEnodeCounter] = useState(0); // this is used for generating keys

    const [selection, setSelection] = useState<Item[]>([]); // list of selected items; multiple occurrences are allowed
    const selectionRef = useRef<Item[]>([]);
    
    const [focusItem, setFocusItem] = useState<Item | null>(null); // the item that carries the 'focus', relevant for the editor pane
    const focusRef = useRef<Item | null>(null);

    const clearSelection = () => { 
        selection.forEach(item => {
            if(item===focusItem) {
                setFocusItem(focusRef.current = null);
            }
        });
        setSelection(selectionRef.current = []);
    }

    const getSelectPositions = (item: Item, array = selectionRef.current) => {
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

    const select = (item: Item) => {
        setSelection(selectionRef.current = [...selectionRef.current, item]);
    } 

    const selectAll = (items: Item[]) => {
        setSelection(selectionRef.current = [...selectionRef.current, ...items]);
    }

    const deselect = (item: Item) => {
        const index = selectionRef.current.lastIndexOf(item);
        if(index<0) {
            console.log(`Error: Item ${item.key}, to be deselected, is not in selection!`);
        } else {
            console.log(`Deselecting; ${item.key}`);
            if(focusRef.current===item && index==selectionRef.current.indexOf(item)) {
                setFocusItem(focusRef.current = null);
            }
            const newSelection = selectionRef.current.slice(0, index).concat(selectionRef.current.slice(index+1));
            setSelection(selectionRef.current = newSelection);
            return item;
        }
    }

    const focusOn = (item: Item) => {
        if(!focusRef.current || focusRef.current!==item) {
            setFocusItem(focusRef.current = item);
        } 
    }
    
    const itemMouseDown = (id: string, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => { // mouse down handler for items on the canvas
        e.stopPropagation();
        const item = id.startsWith(ENODE_ID_PREFIX)? enodes.find(element => element.key===id): null;
        if(item) {
            if(e.ctrlKey && selectionRef.current.includes(item)) {
                deselect(item);
            } else {
                console.log(`Selecting: ${item.key}`);
                if(!e.shiftKey) {
                    clearSelection();
                    setPoints([]);
                }
                select(item);
                focusOn(item);

                // Handle dragging:
                const startX = e.clientX - item.x; 
                const startY = e.clientY - item.y; 
                const sel = selectionRef.current;
                const selectionWithoutDuplicates = sel.filter((item, i) => i===sel.indexOf(item));
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
                    setPoints([...pointsRef.current]); // We're triggering a re-render with the points array, which should be relatively cheap.
                };            
                const handleMouseUp = () => {
                    window.removeEventListener('mousemove', handleMouseMove);
                    window.removeEventListener('mouseup', handleMouseUp);
                };
            
                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);
            }           
        } 
    };

    const canvasMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {  // mouseDown handler for the canvas. Adds and removes Points. The reason why we have to go through the trouble
            // of effectively implementing a mouseClick handler is that, after dragging an item over the canvas if scrollbars are present, the mouse
            // might end up being over the canvas instead of the item. If the mouse button is then released, this would normally cause a mouseClick 
            // event. To prevent that, we have to make sure that we don't count these events unless the mouse was originally pressed over the canvas.
        const { left, top } = canvasRef.current?.getBoundingClientRect()?? {left: 0, top: 0};
        const { scrollLeft, scrollTop} = canvasRef.current?? {scrollLeft: 0, scrollTop:0};
        const x = e.clientX - left + scrollLeft;
        const y = e.clientY - top + scrollTop;
        const newPoint = new PointRep(`x${x}y${y}`, x, y);
        
        const handleMouseUp = (mue: MouseEvent) => {
            canvasRef.current?.removeEventListener('mouseup', handleMouseUp);
            const dx = mue.clientX - e.clientX;
            const dy = mue.clientY - e.clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            //console.log(`mouse up, distance: ${dist}px`);
            if(dist < CANVAS_CLICK_THRESHOLD) {
                //console.log(`key: x${x}y${y} e.clientX=${e.clientX} left=${left}$ scrollLeft=${scrollLeft}`);    
                if (!e.shiftKey) {
                    setPoints([newPoint]);
                    clearSelection();
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
            setEnodeCounter(counter);
            setEnodes([...enodes, ...newNodes]);
            setPoints([]);
            selectAll(newNodes);
            focusOn(newNodes[newNodes.length-1]);
        }
    }

    const addContours = () => { // onClick handler for the contour button
        setPoints([]);
    }
    
    const deleteSelection = () => { // onClick handler for the delete button
        if(selection && selection.length>0) {
            setEnodes(enodes.filter(item => !selection.includes(item)));
            clearSelection();
            setFocusItem(null);
        }
    }



    console.log(`Rendering... focusItem=${focusItem && focusItem.key} selected=[${selectionRef.current.map(item => item.key).join(', ')}]`);

    return (
        <div id='main-panel' className='flex mt-8'>
            <div id='canvas-and-code' className = 'flex-1 mb-3'>
                <div id='canvas' ref={canvasRef} style={{background: 'white', minWidth: '800px', maxWidth: '1200px', height: '600px', position: 'relative', 
                            overflow: 'auto', border: 'solid', borderColor: tailwindColors['slate-400']}}
                        onMouseDown= {canvasMouseDown}>
                    {enodes.map((enode, i) => 
                        <ENode key={enode.key} id={enode.key} x={enode.x} y={enode.y} 
                                selected={getSelectPositions(enode)} focus={focusItem===enode} onMouseDown={itemMouseDown} />)}
                    {points.map(point => 
                        <Point key={point.key} x={point.x} y={point.y} />)}
                    <style> {/* we're using polylines for the 'mark borders' of items */}
                        @keyframes oscillate {'{'} 0% {'{'} opacity: 1; {'}'} 50% {'{'} opacity: 0.1; {'}'} 100% {'{'} opacity: 1; {'}}'}
                        polyline {'{'} stroke: {MARK_COLOR1}; stroke-width: {`${MARK_LINEWIDTH}px`}; {'}'}
                        .focused polyline {'{'} opacity: 1; animation: oscillate 1.5s infinite {'}'}
                        .selected polyline {'{'} opacity: 1; {'}'}
                        .unselected polyline {'{'} opacity: 0; {'}'}
                        .unselected:hover polyline {'{'} opacity: 0.65; transition: 0.3s; {'}'}
                    </style>
                </div>
                <div id='code-panel'
                    style={{background: 'lightgrey', minWidth: '800px', height: '190px', 
                        margin: '25px 0px 25px'}} className='shadow-inner'>
                </div>
            </div>
            <div id='button-panels' style={{flex: 1, minWidth: '300px', maxWidth: '380px', userSelect: 'none'}}>
                <div id='button-panel-1' className='flex flex-col' style={{height: '600px', margin: '0px 25px 0px'}}>
                    <div id='add-panel' className='grid grid-cols-2 mb-2'>
                        <button id='node-button' className='block mr-1 px-4 py-1 text-base bg-slate-50/85 text-slate-600 font-medium rounded-lg border 
                                    disabled:opacity-50 enabled:hover:text-slate-600 enabled:hover:bg-slate-200 enabled:hover:font-semibold enabled:hover:border-transparent transition 
                                    enabled:active:bg-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:ring-offset-1'
                                disabled={points.length<1} onClick={addEntityNodes}>  
                            Node
                        </button>
                        <button id='contour-button' className='block px-4 py-1 text-base bg-slate-50/85 text-slate-600 font-medium rounded-lg border 
                                    disabled:opacity-50 enabled:hover:text-slate-600 enabled:hover:bg-slate-200 enabled:hover:font-semibold enabled:hover:border-transparent transition 
                                    enabled:active:bg-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:ring-offset-1'
                                disabled={points.length<1} onClick={addContours}>  
                            Contour
                        </button> 
                    </div>                    

                    <div id='di-panel' className='grid justify-items-stretch border border-slate-300 p-2 mb-2 rounded-lg'>
                        <Menu>
                            <MenuButton className='inline-flex items-center gap-2 mb-2 rounded-lg bg-slate-50/85 px-4 py-1 text-sm text-slate-600 shadow-inner 
                                        focus:outline-none data-[hover]:bg-slate-200 data-[open]:bg-slate-200 data-[focus]:outline-1 data-[focus]:outline-white'>
                                <div className='flex-none text-left mr-2'>
                                    {depItemLabels[depItemIndex].getImageComp()}
                                </div>
                                <div className='flex-1'>
                                    {depItemLabels[depItemIndex].label}
                                </div>
                                <div className='flex-none w-[28px] ml-2 text-right'>
                                    <ChevronDownIcon className="size-4 fill-slate-600" />                                    
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
                                        className='w-72 origin-top-right rounded-lg border border-slate-300 bg-slate-50/85 p-1 text-sm text-slate-600 [--anchor-gap:var(--spacing-1)] focus:outline-none'>
                                    {depItemLabels.map((label, index) => 
                                        <MenuItem key={'di-'+index}>
                                            <button className="group flex w-full items-center gap-2 rounded-lg px-2 py-1 data-[focus]:bg-slate-200/60" onClick={() => setDepItemIndex(index)}>
                                                <div className='inline mr-2'>
                                                    {label.getImageComp()}
                                                </div>
                                                {label.label}
                                            </button>
                                        </MenuItem>
                                    )}
                                </MenuItems>
                            </Transition>
                        </Menu>                
                        <button id='create-button' className='block px-4 py-1 text-base bg-slate-50/85 text-slate-600 font-medium rounded-lg border 
                                    disabled:opacity-50 enabled:hover:text-slate-600 enabled:hover:bg-slate-200 enabled:hover:font-semibold enabled:hover:border-transparent transition 
                                    enabled:active:bg-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:ring-offset-1'> 
                            Create
                        </button>
                    </div>
                    <button id='combi-button' className='block mb-3 px-4 py-1 text-base bg-slate-50/85 text-slate-600 font-medium rounded-lg border 
                                disabled:opacity-50 enabled:hover:text-slate-600 enabled:hover:bg-slate-200 enabled:hover:font-semibold enabled:hover:border-transparent transition 
                                enabled:active:bg-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:ring-offset-1'
                            disabled={selection.length<1}> 
                        Copy Selection
                    </button> 

                    <TabGroup className='flex-1'>
                        <TabList className="grid grid-cols-3">
                            <Tab key='editor-tab'className="rounded-l-lg py-1 px-3 text-sm/6 bg-slate-50/85 text-slate-600 border
                                    focus:outline-none data-[selected]:bg-slate-100/85 data-[selected]:font-semibold data-[hover]:bg-slate-200 data-[hover]:font-semibold transition
                                    data-[selected]:data-[hover]:bg-slate-100/85 data-[focus]:outline-1 data-[focus]:outline-white">
                                Editor
                            </Tab>
                            <Tab key='transform-tab' className="py-1 px-3 text-sm/6 bg-slate-50/85 text-slate-600 border
                                    focus:outline-none data-[selected]:bg-slate-100/85 data-[selected]:font-semibold data-[hover]:bg-slate-200 data-[hover]:font-semibold transition
                                    data-[selected]:data-[hover]:bg-slate-100/85 data-[focus]:outline-1 data-[focus]:outline-white">
                                Transform
                            </Tab>
                            <Tab key='group-tab' className="rounded-r-lg py-1 px-3 text-sm/6 bg-slate-50/85 text-slate-600 border
                                    focus:outline-none data-[selected]:bg-slate-100/85 data-[selected]:font-semibold data-[hover]:bg-slate-200 data-[hover]:font-semibold transition
                                    data-[selected]:data-[hover]:bg-slate-100/85 data-[focus]:outline-1 data-[focus]:outline-white">
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
                        <Tippy theme='light' delay={[400,0]} arrow={false} content='Undo'>
                            <button id='undo-button' className='block mr-1 px-4 py-1 text-base bg-slate-50/85 text-slate-600 font-medium rounded-lg border 
                                    disabled:opacity-50 enabled:hover:text-slate-600 enabled:hover:bg-slate-200 enabled:hover:font-semibold enabled:hover:border-transparent transition 
                                    enabled:active:bg-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:ring-offset-1'>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto">
                                    <g transform="rotate(-45 12 12)">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                                    </g>
                                </svg>
                                <span className='sr-only'>Undo</span>
                            </button>
                        </Tippy>
                        <Tippy theme='light' delay={[400,0]} arrow={false} content='Redo'>
                            <button id='redo-button' className='block mr-1 px-4 py-1 text-base bg-slate-50/85 text-slate-600 font-medium rounded-lg border 
                                        disabled:opacity-50 enabled:hover:text-slate-600 enabled:hover:bg-slate-200 enabled:hover:font-semibold enabled:hover:border-transparent transition 
                                        enabled:active:bg-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:ring-offset-1'> 
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mx-auto">
                                    <g transform="rotate(45 12 12)">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
                                    </g>
                                </svg>
                                <span className='sr-only'>Redo</span> 
                            </button>
                        </Tippy>
                        <Tippy theme='light' delay={[400,0]} arrow={false} content='Delete'>
                            <button id='del-button' className='block px-4 py-1 text-base bg-pink-50/85 text-pink-600 font-medium rounded-lg border 
                                        disabled:opacity-50 enabled:hover:text-pink-600 enabled:hover:bg-pink-200 enabled:hover:font-semibold enabled:hover:border-transparent transition 
                                        enabled:active:text-white enabled:active:bg-red-400-400 focus:outline-none focus:ring-1 focus:ring-pink-400 focus:ring-offset-1'
                                    disabled={selection.length<1} onClick={deleteSelection} > 
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
                   <button className='block mb-2 px-4 py-1 text-lg bg-slate-50/85 text-slate-600 font-medium rounded-lg border 
                        disabled:opacity-50 enabled:hover:text-slate-600 enabled:hover:bg-slate-200 enabled:hover:font-semibold enabled:hover:border-transparent transition 
                        enabled:active:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2'> 
                      Generate
                    </button>
                    <div className='flex items-center justify-end mb-4 px-4 py-1 text-sm'>
                        1 pixel = 
                        <input className='w-16 ml-1 p-1 mr-1 text-right border rounded-sm border-slate-300 focus:border-slate-400 focus:outline-none' type='number' step='0.1' value={pixel}
                            onChange={(e) => setPixel(parseFloat(e.target.value))}/>
                        pt
                    </div>
                    <button className='block mb-2 px-4 py-1 text-lg bg-slate-50/85 text-slate-600 font-medium rounded-lg border 
                        disabled:opacity-50 enabled:hover:text-slate-600 enabled:hover:bg-slate-200 enabled:hover:font-semibold enabled:hover:border-transparent transition 
                        enabled:active:bg-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2'> 
                      Load
                    </button>
                    <div className='px-4 py-1 text-sm'>
                        <input type='checkbox' className='mr-2' checked={replace} onChange={()=>{setReplace(!replace);}}/> 
                        <a href='#' 
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