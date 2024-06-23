import clsx from 'clsx/lite'
import Item, { DEFAULT_LINEWIDTH, DEFAULT_DASH, DEFAULT_SHADING, MAX_LINEWIDTH, Range } from './Item.tsx'
import ENode from './ENode.tsx'
import NodeGroup, { angle } from './NodeGroup.tsx'
import { Entry } from './ItemEditor.tsx'
import { H, MAX_X, MAX_Y, MIN_Y, MARK_LINEWIDTH, MIN_TRANSLATION_LOG_INCREMENT, MAX_TRANSLATION_LOG_INCREMENT } from './MainPanel.tsx'
import { validInt, validFloat, parseInputValue, parseCyclicInputValue, getCyclicValue } from './EditorComponents.tsx'
import { Config } from './ItemEditor.tsx'

const CNODE_RADIUS = 7
const CNODE_ARROW_DIV_RADIUS = 10
export const CNODE_MIN_DISTANCE_TO_NEXT_NODE_FOR_ARROW = 30
const CNODE_ARROW_DISTANCE_RATIO = 0.3
const CNODE_ARROW_DISTANCE_MIN = 15
const CNODE_ARROW_DISTANCE_MAX = 40
const CNODE_ARROW_POINTS = '6,10 5,7 15,10 5,13, 6,10'
const CNODE_ARROW_MITER_LIMIT = 5
const MIN_ROTATION = -180
const MAX_ROTATION_INPUT = 9999
const MIN_DISTANCE = -9999
const MAX_DISTANCE = 9999

export const DEFAULT_DISTANCE = 10
export const MAX_NODEGROUP_SIZE = 1000


export default class CNode extends Item {

    public radius: number = CNODE_RADIUS;
    public fixedAngles: boolean = true;
    public omitLine: boolean = false;
    public angle0: number = 0; // angle to control point 0
    public angle1: number = 0; // angle to controle point 1
    public dist0: number = DEFAULT_DISTANCE; // distance to control point 0
    public dist1: number = DEFAULT_DISTANCE; // distance to control point 1
    public dist0_100: number = DEFAULT_DISTANCE; // the 'original' distance to control point 0
    public dist1_100: number = DEFAULT_DISTANCE; // the 'original' distance to control point 1
    public numberOfCopies: number = 0; // to help generate unique ids


    constructor(id: string, x: number, y: number, a0: number, a1: number, group: NodeGroup) {
        super(id, x, y);
        this.angle0 = a0;
        this.angle1 = a1;
        this.group = group;
        this.isActiveMember = true;
    }

    public override setLinewidth(lw: number) {
        const group = this.group as NodeGroup;
        group.linewidth = group.linewidth100 = lw;
    }

    public override setShading(sh: number) {
        const group = this.group as NodeGroup;
        group.shading = sh;
    }

    public override setDash(dash: number[]) {
        const group = this.group as NodeGroup;
        group.dash = group.dash100 = dash;
    }

    public override reset() {
        const group = this.group as NodeGroup;
        super.reset();
        this.fixedAngles = true;
        this.omitLine = false;
        this.angle0 = this.angle1 = 0;
        this.dist0 = this.dist0_100 = this.dist1 = this.dist1_100 = DEFAULT_DISTANCE;
        group.linewidth = group.linewidth100 = DEFAULT_LINEWIDTH;
        group.dash = group.dash100 = DEFAULT_DASH;
        group.shading = DEFAULT_SHADING;
    }

    public override getInfo(list: (ENode | NodeGroup)[], config: Config): Entry[] {
        const group = this.group as NodeGroup;
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
            {type: 'number input', key: 'd0', text: 'Distance 1', width: 'medium', value: this.dist0, step: 0,
                tooltip: 'The distance from the present contour node to the previous control point.',
                tooltipPlacement: 'left'
            },
            {type: 'number input', key: 'a1', text: 'Angle 2', width: 'long', value: this.angle1, step: 0,
                tooltip: 'The angle (in degrees) by which a straight line to the next control point would deviate from a straight line to the next contour node.',
                tooltipPlacement: 'left'
            },
            {type: 'number input', key: 'd1', text: 'Distance 2', width: 'medium', value: this.dist1, step: 0,
                tooltip: 'The distance from the present contour node to the next control point.',
                tooltipPlacement: 'left'
            },
            {type: 'number input', key: 'x', text: 'X-coordinate', width: 'long', value: this.x, step: 0},
            {type: 'number input', key: 'y', text: 'Y-coordinate', width: 'long', value: this.y, step: 0},
            {type: 'number input', key: 'inc', text: 'log Increment', width: 'short', value: config.logIncrement, step: 1, 
                extraBottomMargin: true,
                onChange: (e) => {
                    if(e) {
                        const val = validInt(e.target.value, MIN_TRANSLATION_LOG_INCREMENT, MAX_TRANSLATION_LOG_INCREMENT)
                        config.logIncrement = val
                    }
                }
            },
            {type: 'number input', key: 'lw', text: 'Line width', width: 'long', value: group.linewidth, step: 0.1},
            {type: 'string input', key: 'dash', text: 'Stroke pattern', width: 'long', value: group.dashValidator.write(group.dash)},
            {type: 'number input', key: 'shading', text: 'Shading', width: 'long', value: group.shading, min: 0, max: 1, step: 0.1},
            {type: 'number input', key: 'rank', text: 'Rank (akin to Z-index)', value: list.indexOf(group), step: 1, extraBottomMargin: true},
            {type: 'button', key: 'defaults', text: 'Defaults'},
            {type: 'button', key: 'angles', text: 'Equalize central angles', style: 'text-sm'},
            {type: 'button', key: 'distances', text:'Equalize distances\n from center', style: 'text-sm'},
            {type: 'label', text: '', style: 'flex-1'}, // a filler to ensure that there's some margin at the bottom
        ]
    }

    public override handleEditing(
            e: React.ChangeEvent<HTMLInputElement> | null, 
            config: Config, 
            selection: Item[],
            key: string): [(item: Item, list: (ENode | NodeGroup)[]) => (ENode | NodeGroup)[], applyTo: Range] {
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
                    const delta = parseCyclicInputValue(e.target.value, this.angle0, config.logIncrement)[1]; 
                    return [(item, array) => {
                        if(!isNaN(delta) && delta!==0 && item instanceof CNode) {
                            item.angle0 = getCyclicValue(item.angle0 + delta, MIN_ROTATION, 360, 10 ** Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT));
                        }
                        return array
                    }, 'wholeSelection']
                }
            case 'd0': if (e) {
                    const d = parseInputValue(e.target.value, MIN_DISTANCE, MAX_DISTANCE, this.dist0, 
                        config.logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.dist0;
                    return [(item, array) => {
                        if (!isNaN(d) && d!==0 && item instanceof CNode) {
                            item.dist0 = item.dist0_100 = item.dist0 + d;
                        }
                        return array
                    }, 'wholeSelection']
                }
            case 'a1': if (e) {
                    const delta = parseCyclicInputValue(e.target.value, this.angle1, config.logIncrement)[1]; 
                    return [(item, array) => {
                        if(!isNaN(delta) && delta!==0 && item instanceof CNode) {
                            item.angle1 = getCyclicValue(item.angle1 + delta, MIN_ROTATION, 360, 10 ** Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT));
                        }
                        return array
                    }, 'wholeSelection']
                }
            case 'd1': if (e) {
                    const d = parseInputValue(e.target.value, MIN_DISTANCE, MAX_DISTANCE, this.dist1, 
                        config.logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.dist1;
                    return [(item, array) => {
                        if (!isNaN(d) && d!==0 && item instanceof CNode) {
                            item.dist1 = item.dist1_100 = item.dist1 + d;
                        }
                        return array
                    }, 'wholeSelection']
                }
            case 'x': if (e) {
                    const dmin = -selection.reduce((min, item) => min<item.x? min: item.x, this.x);
                    const delta = parseInputValue(e.target.value, 0, MAX_X, this.x, config.logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.x;
                    const dx = delta>dmin? delta: 0; // this is to avoid items from being moved beyond the left border of the canvas                        
                    return [(item, array) => {
                        if (dx!==0) item.move(dx, 0); 
                        return array
                    }, 'wholeSelection']
                }
            case 'y': if (e) {
                    const dy = parseInputValue(e.target.value, MIN_Y, MAX_Y, this.y, config.logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.y;
                    return [(item, array) => {
                        if (!isNaN(dy) && dy!==0) {
                            item.move(0, dy);
                        }
                        return array
                    }, 'wholeSelection']
                }
            case 'lw': if (e) return [(item, array) => {
                    item.setLinewidth(validFloat(e.target.value, 0, MAX_LINEWIDTH, 0)); 
                    return array
                }, 'ENodesAndNodeGroups']
            case 'dash': if (e) {
                    const dash = this.dashValidator.read(e.target);
                    return [(item, array) => {
                        item.setDash(dash); 
                        return array
                    }, 'ENodesAndNodeGroups']
                }
            case 'shading': if (e) return [(item, array) => {
                    item.setShading(validFloat(e.target.value, 0, 1)); 
                    return array
                }, 'ENodesAndNodeGroups']
            case 'rank': if (e) return [(item, array) => {
                    if (item.group instanceof NodeGroup) {
                        const currentPos = array.indexOf(item.group);
                        const newPos = parseInt(e.target.value);
                        let result = array;
                        if (newPos>currentPos && currentPos+1<array.length) { // move group up in the Z-order (i.e., towards the end of the array), but only by one
                            [result[currentPos], result[currentPos+1]] = [result[currentPos+1], result[currentPos]];
                        } 
                        else if (newPos<currentPos && currentPos>0) { // move group down in the Z-order, but only by one
                            [result[currentPos], result[currentPos-1]] = [result[currentPos-1], result[currentPos]];
                        }
                        return result
                    }
                    else return array
                }, 'onlyThis']
            case 'defaults': return [(item, array) => {
                    item.reset();
                    return array
                }, 'wholeSelection']
            case 'angles': return [(item, array) => {
                if (item.group instanceof NodeGroup) {
                    item.group.equalizeCentralAngles(item as CNode);
                }
                return array
            }, 'ENodesAndNodeGroups']
            case 'distances': return [(item, array) => {
                if (item.group instanceof NodeGroup) {
                    item.group.equalizeDistancesFromCenter(item as CNode);
                }
                return array
            }, 'ENodesAndNodeGroups']
            default: 
                return [(item, array) => array, 'onlyThis']        
        }
    }
}


export interface CNodeCompProps {
    id: string
    cnode: CNode
    yOffset: number
    markColor: string
    focus: boolean
    selected: boolean
    preselected: boolean
    arrow: boolean // indicates whether an arrow to the next CNodeComp should be displayed
    onMouseDown: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    onMouseEnter: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    onMouseLeave: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}

export const CNodeComp = ({id, cnode, yOffset, markColor, focus, selected, preselected, arrow, onMouseDown, onMouseEnter, onMouseLeave}: CNodeCompProps) => {
    const x = cnode.x;
    const y = cnode.y;
    const radius = CNODE_RADIUS;


    // coordinates (and dimensions) of the inner rectangle, relative to the div:
    const top = MARK_LINEWIDTH;
    const left = MARK_LINEWIDTH;
    const mW = 2 * radius; // width and...
    const mH = 2 * radius; // ...height relevant for drawing the 'mark border'
    const l = Math.min(Math.max(5, mW / 5), 25);
    const m = 0.9 * l;

    let arrowDiv = null;
    if (arrow && cnode.group) {
        const index = cnode.group.members.indexOf(cnode);
        const next = (cnode.group as NodeGroup).members[index==cnode.group.members.length-1? 0: index+1];
        const d = Math.sqrt((cnode.x - next.x) ** 2 + (cnode.y - next.y) ** 2);
        const factor = Math.min(Math.max(d * CNODE_ARROW_DISTANCE_RATIO, CNODE_ARROW_DISTANCE_MIN), CNODE_ARROW_DISTANCE_MAX) / d;
        const r = CNODE_ARROW_DIV_RADIUS;
        arrowDiv = (
            <div className={focus || selected? 'selected': 'preselected'}
                style={{
                    position: 'absolute',
                    left: `${x + (next.x-x) * factor - r}px`,
                    top: `${H + yOffset - (y + (next.y-y) * factor + r)}px`,
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
                    left: `${x - radius - MARK_LINEWIDTH}px`,
                    top: `${H + yOffset - y - radius - MARK_LINEWIDTH}px`,
                    cursor: 'pointer'
                }}>
                <svg width={mW + MARK_LINEWIDTH * 2} height={mH + MARK_LINEWIDTH * 2} xmlns="http://www.w3.org/2000/svg">
                    <polyline stroke={markColor} points={`${left},${top + l} ${left + m},${top + m} ${left + l},${top}`} fill='none' />
                    <polyline stroke={markColor} points={`${left + mW - l},${top} ${left + mW - m},${top + m} ${left + mW},${top + l}`} fill='none' />
                    <polyline stroke={markColor} points={`${left + mW},${top + mH - l} ${left + mW - m},${top + mH - m} ${left + mW - l},${top + mH}`} fill='none' />
                    <polyline stroke={markColor} points={`${left + l},${top + mH} ${left + m},${top + mH - m} ${left},${top + mH - l}`} fill='none' />
                </svg>
            </div>
            {arrowDiv}
        </>
    )
}