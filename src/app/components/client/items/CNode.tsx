import clsx from 'clsx/lite'
import Item, { HSL, Range } from './Item'
import Node, { DEFAULT_LINEWIDTH, DEFAULT_DASH, DEFAULT_SHADING, MAX_LINEWIDTH } from './Node.tsx'
import ENode from './ENode.tsx'
import CNodeGroup, { angle } from '../CNodeGroup.tsx'
import { Entry } from '../ItemEditor.tsx'
import { H, MAX_X, MAX_Y, MIN_Y, MARK_LINEWIDTH, MIN_TRANSLATION_LOG_INCREMENT, getRankMover } from '../MainPanel.tsx'
import { validFloat, parseInputValue, parseCyclicInputValue } from '../EditorComponents.tsx'
import { getCyclicValue } from '../../../util/MathTools.tsx'
import { MIN_ROTATION, MAX_ROTATION_INPUT } from '../ItemEditor.tsx'


const CNODE_RADIUS = 7
const CNODE_ARROW_DIV_RADIUS = 10
export const CNODE_MIN_DISTANCE_TO_NEXT_NODE_FOR_ARROW = 30
const CNODE_ARROW_DISTANCE_RATIO = 0.3
const CNODE_ARROW_DISTANCE_MIN = 15
const CNODE_ARROW_DISTANCE_MAX = 40
const CNODE_ARROW_POINTS = '6,10 5,7 15,10 5,13, 6,10'
const CNODE_ARROW_MITER_LIMIT = 5
const MIN_DISTANCE = -9999
const MAX_DISTANCE = 9999

export const DEFAULT_DISTANCE = 10

/**
 * CNodes ('contour nodes') are members of CNodeGroups ('contour node groups'). They define the shape and beheavior of contours. Although each CNode inherits
 * its own shading, linewidth, and dash pattern from the superclass, these values don't matter in practice. The relevant setter functions instead affect the 
 * values of the node's CNodeGroup.
 */
export default class CNode extends Node {

    fixedAngles: boolean = true;
    omitLine: boolean = false;
    angle0: number = 0; // angle to control point 0
    angle1: number = 0; // angle to controle point 1
    dist0: number = DEFAULT_DISTANCE; // distance to control point 0
    dist1: number = DEFAULT_DISTANCE; // distance to control point 1
    dist0_100: number = DEFAULT_DISTANCE; // the 'original' distance to control point 0
    dist1_100: number = DEFAULT_DISTANCE; // the 'original' distance to control point 1
    numberOfCopies: number = 0; // to help generate unique ids


    constructor(id: string, x: number, y: number, a0: number, a1: number, group: CNodeGroup) {
        super(id, x, y);
        this.radius = this.radius100 = CNODE_RADIUS;
        this.angle0 = a0;
        this.angle1 = a1;
        this.group = group;
        this.isActiveMember = true;
    }

    override setLinewidth(lw: number) {
        const group = this.group as CNodeGroup;
        group.linewidth = group.linewidth100 = lw;
    }

    override setShading(sh: number) {
        const group = this.group as CNodeGroup;
        group.shading = sh;
    }

    override setDash(dash: number[]) {
        const group = this.group as CNodeGroup;
        group.dash = group.dash100 = dash;
    }

    override reset() {
        super.reset();
        
        this.fixedAngles = true;
        this.omitLine = false;
        this.angle0 = this.angle1 = 0;
        this.dist0 = this.dist0_100 = this.dist1 = this.dist1_100 = DEFAULT_DISTANCE;

        const group = this.group as CNodeGroup;
        group.linewidth = group.linewidth100 = DEFAULT_LINEWIDTH;
        group.dash = group.dash100 = DEFAULT_DASH;
        group.shading = DEFAULT_SHADING;
    }

    override getInfo(list: (ENode | CNodeGroup)[]): Entry[] {
        const group = this.group as CNodeGroup;
        return [
            {type: 'checkbox', key: 'fixed', text: 'Dragging preserves angles', value: this.fixedAngles,
                tooltip: clsx('Dragging this node will move its two neighbors in parallel with it if this helps to preserve the angles between them.',
                    'Where the movement is parallel to the X- or Y-axis, distances between nodes may be lengthened or shortened.'),
                tooltipPlacement: 'left'
            },
            {type: 'checkbox', key: 'line', text: 'No line to next node', value: this.omitLine},
            {type: 'number input', key: 'a0', text: 'Angle 1', width: 'long', value: this.angle0, step: 0, min: -MAX_ROTATION_INPUT, max: MAX_ROTATION_INPUT,
                tooltip: 'The angle (in degrees) by which a straight line to the previous control point would deviate from a straight line to the previous contour node.',
                tooltipPlacement: 'left'
            },
            {type: 'number input', key: 'd0', text: 'Distance 1', width: 'long', value: this.dist0, step: 0,
                tooltip: 'The distance from the present contour node to the previous control point.',
                tooltipPlacement: 'left'
            },
            {type: 'number input', key: 'a1', text: 'Angle 2', width: 'long', value: this.angle1, step: 0,
                tooltip: 'The angle (in degrees) by which a straight line to the next control point would deviate from a straight line to the next contour node.',
                tooltipPlacement: 'left'
            },
            {type: 'number input', key: 'd1', text: 'Distance 2', width: 'long', value: this.dist1, step: 0,
                tooltip: 'The distance from the present contour node to the next control point.',
                tooltipPlacement: 'left'
            },
            {type: 'number input', key: 'x', text: 'X-coordinate', width: 'long', value: this.x, step: 0},
            {type: 'number input', key: 'y', text: 'Y-coordinate', width: 'long', value: this.y, step: 0},
            {type: 'logIncrement', extraBottomMargin: true},
            {type: 'number input', key: 'lw', text: 'Line width', width: 'medium', value: group.linewidth, step: 0.1},
            {type: 'string input', key: 'dash', text: 'Stroke pattern', width: 'long', value: group.dashValidator.write(group.dash)},
            {type: 'number input', key: 'shading', text: 'Shading', width: 'medium', value: group.shading, min: 0, max: 1, step: 0.1},
            {type: 'number input', key: 'rank', text: 'Rank in paint-order', value: list.indexOf(group), step: 1, extraBottomMargin: true},
            {type: 'button', key: 'defaults', text: 'Defaults'},
            {type: 'button', key: 'angles', text: 'Equalize central angles', style: 'text-sm'},
            {type: 'button', key: 'distances', text:<>Equalize distances<br/> from center</>, style: 'text-sm'},
            {type: 'label', text: '', style: 'flex-1'}, // a filler to ensure that there's some margin at the bottom
        ]
    }

    override handleEditing(
            e: React.ChangeEvent<HTMLInputElement> | null, 
            logIncrement: number, 
            selection: Item[],
            unitscale: number,
            displayFontFactor: number,
            key: string): [(item: Item, list: (ENode | CNodeGroup)[]) => (ENode | CNodeGroup)[], applyTo: Range] {
        switch(key) {
            case 'fixed':
                const fa = !this.fixedAngles;
                return [(item, array) => {
                    if (item instanceof CNode) {
                        item.fixedAngles = fa;
                    }
                    return array
                }, 'wholeSelection']
            case 'line':
                const omit = !this.omitLine;
                return [(item, array) => {
                    if (item instanceof CNode) {
                        item.omitLine = omit;
                    }
                    return array
                }, 'wholeSelection']
            case 'a0': if (e) {
                    const delta = parseCyclicInputValue(e.target.value, this.angle0, logIncrement)[1]; 
                    return [(item, array) => {
                        if(!isNaN(delta) && delta!==0 && item instanceof CNode) {
                            item.angle0 = getCyclicValue(item.angle0 + delta, MIN_ROTATION, 360, 10 ** Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT));
                        }
                        return array
                    }, 'wholeSelection']
                }
            case 'd0': if (e) {
                    const d = parseInputValue(e.target.value, MIN_DISTANCE, MAX_DISTANCE, this.dist0, 
                        logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.dist0;
                    return [(item, array) => {
                        if (!isNaN(d) && d!==0 && item instanceof CNode) {
                            item.dist0 = item.dist0_100 = item.dist0 + d;
                        }
                        return array
                    }, 'wholeSelection']
                }
            case 'a1': if (e) {
                    const delta = parseCyclicInputValue(e.target.value, this.angle1, logIncrement)[1]; 
                    return [(item, array) => {
                        if(!isNaN(delta) && delta!==0 && item instanceof CNode) {
                            item.angle1 = getCyclicValue(item.angle1 + delta, MIN_ROTATION, 360, 10 ** Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT));
                        }
                        return array
                    }, 'wholeSelection']
                }
            case 'd1': if (e) {
                    const d = parseInputValue(e.target.value, MIN_DISTANCE, MAX_DISTANCE, this.dist1, 
                        logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.dist1;
                    return [(item, array) => {
                        if (!isNaN(d) && d!==0 && item instanceof CNode) {
                            item.dist1 = item.dist1_100 = item.dist1 + d;
                        }
                        return array
                    }, 'wholeSelection']
                }
            case 'x': if (e) {
                    const dmin = -(selection.filter(item => item instanceof Node) as Node[]).reduce((min, item) => min<item.x? min: item.x, this.x);
                    const delta = parseInputValue(e.target.value, 0, MAX_X, this.x, logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.x;
                    const dx = delta>dmin? delta: 0; // this is to avoid items from being moved beyond the left border of the canvas                        
                    return [(item, array) => {
                        if (item instanceof Node && dx!==0) item.move(dx, 0); 
                        return array
                    }, 'wholeSelection']
                }
            case 'y': if (e) {
                    const dy = parseInputValue(e.target.value, MIN_Y, MAX_Y, this.y, logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.y;
                    return [(item, array) => {
                        if (item instanceof Node && !isNaN(dy) && dy!==0) {
                            item.move(0, dy);
                        }
                        return array
                    }, 'wholeSelection']
                }
            case 'lw': if (e) return [(item, array) => {
                    if (item instanceof Node) item.setLinewidth(validFloat(e.target.value, 0, MAX_LINEWIDTH, 0)); 
                    return array
                }, 'ENodesAndCNodeGroups']
            case 'dash': if (e) {
                    const dash = (this.group as CNodeGroup).dashValidator.read(e.target);
                    return [(item, array) => {
                        if (item instanceof Node) item.setDash(dash); 
                        return array
                    }, 'ENodesAndCNodeGroups']
                }
            case 'shading': if (e) return [(item, array) => {
                    if (item instanceof Node) item.setShading(validFloat(e.target.value, 0, 1)); 
                    return array
                }, 'ENodesAndCNodeGroups']
            case 'rank': if (e) {
                    return [getRankMover(e.target.value, selection), 'onlyThis'];
                }
            case 'defaults': return [(item, array) => {
                    item.reset();
                    return array
                }, 'wholeSelection']
            case 'angles': return [(item, array) => {
                if (item.group instanceof CNodeGroup) {
                    item.group.equalizeCentralAngles(item as CNode);
                }
                return array
            }, 'ENodesAndCNodeGroups']
            case 'distances': return [(item, array) => {
                if (item.group instanceof CNodeGroup) {
                    item.group.equalizeDistancesFromCenter(item as CNode);
                }
                return array
            }, 'ENodesAndCNodeGroups']
            default: 
                return [(item, array) => array, 'onlyThis']        
        }
    }
}


export interface CNodeCompProps {
    id: string
    cnode: CNode
    yOffset: number
    unitscale: number
    displayFontFactor: number
    primaryColor: HSL // needed for ornaments of CNodes
    markColor: string
    focusItem: Item | null
    selected: boolean
    preselected: boolean
    selection: Item[]  // needed for ornaments of CNodes
    preselection: Item[] // ditto
    arrow: boolean // indicates whether an arrow to the next CNodeComp should be displayed
    onMouseDown: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    onMouseEnter: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    onMouseLeave: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}

export const CNodeComp = ({ id, cnode, yOffset, unitscale, displayFontFactor, 
    primaryColor, markColor, focusItem, selected, preselected, selection, preselection, arrow, 
    onMouseDown, onMouseEnter, onMouseLeave }: CNodeCompProps
) => {
    const x = cnode.x;
    const y = cnode.y;
    const radius = CNODE_RADIUS;
    const focus = focusItem===cnode;

    // coordinates (and dimensions) of the inner rectangle, relative to the div:
    const top = MARK_LINEWIDTH / 2;
    const left = MARK_LINEWIDTH / 2;
    const mW = 2 * radius; // width and...
    const mH = 2 * radius; // ...height relevant for drawing the 'mark border'
    const l = Math.min(Math.max(5, mW / 5), 25);
    const m = 0.9 * l;

    let arrowDiv = null;
    if (arrow && cnode.group) {
        const index = cnode.group.members.indexOf(cnode);
        const next = (cnode.group as CNodeGroup).members[index==cnode.group.members.length - 1? 0: index + 1];
        const d = Math.sqrt((cnode.x - next.x) ** 2 + (cnode.y - next.y) ** 2);
        const factor = Math.min(Math.max(d * CNODE_ARROW_DISTANCE_RATIO, CNODE_ARROW_DISTANCE_MIN), CNODE_ARROW_DISTANCE_MAX) / d;
        const r = CNODE_ARROW_DIV_RADIUS;
        arrowDiv = (
            <div className={focus || selected? 'selected': 'preselected'}
                style={{
                    position: 'absolute',
                    left: `${x + (next.x - x) * factor - r}px`,
                    top: `${H + yOffset - (y + (next.y - y) * factor + r)}px`,
                    pointerEvents: 'none'
                }}>
                <svg width={2*r} height={2*r} xmlns="http://www.w3.org/2000/svg">
                    <g opacity='0.5' transform={`rotate(${-angle(x, y, next.x, next.y)} 10 10)`}>
                        <polyline stroke={markColor} points={CNODE_ARROW_POINTS} fill={markColor} strokeMiterlimit={CNODE_ARROW_MITER_LIMIT} />
                    </g>
                </svg>
            </div>
        );
    }   

    //console.log(`Rendering ${id}... x=${x}  y=${y}`);

    return (
        <>
            <div className={focus? 'focused': selected? 'selected': preselected? 'preselected': 'unselected'}
                id={id}
                onMouseDown={(e) => onMouseDown(cnode, e)}
                onMouseEnter={(e) => onMouseEnter(cnode, e)}
                onMouseLeave={(e) => onMouseLeave(cnode, e)}
                style={{
                    position: 'absolute',
                    left: `${x - radius - MARK_LINEWIDTH / 2}px`,
                    top: `${H + yOffset - y - radius - MARK_LINEWIDTH / 2}px`,
                    cursor: 'pointer'
                }}>
                <svg width={mW + MARK_LINEWIDTH} height={mH + MARK_LINEWIDTH} xmlns="http://www.w3.org/2000/svg">
                    {Node.markBorder(left, top, l, m, mW, mH, markColor)}
                </svg>
            </div>
            {cnode.ornaments.map((o, i) => o.getComponent(i, yOffset, unitscale, displayFontFactor, primaryColor, markColor, 
                focusItem===o, selection.includes(o), preselection.includes(o), onMouseDown, onMouseEnter, onMouseLeave))}
            {arrowDiv}
        </>
    )
}