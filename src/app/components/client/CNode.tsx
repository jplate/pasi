import Item, { DEFAULT_LINEWIDTH, DEFAULT_DASH, DEFAULT_SHADING, MAX_LINEWIDTH, MAX_DASH_LENGTH, MAX_DASH_VALUE, DEFAULT_COLOR, HSL } from './Item.tsx'
import ENode from './ENode.tsx'
import Group from './Group.tsx'
import { Entry } from './ItemEditor.tsx'
import { H, MAX_X, MAX_Y, MIN_Y, MARK_LINEWIDTH, MIN_TRANSLATION_LOG_INCREMENT, MAX_TRANSLATION_LOG_INCREMENT } from './MainPanel.tsx'
import { validInt, validFloat, parseInputValue, parseCyclicInputValue, getCyclicValue, DashValidator } from './EditorComponents.tsx'
import { Config } from './ItemEditor.tsx'

const STANDARD_CONTOUR_HEIGHT = 50
const STANDARD_CONTOUR_WIDTH = 70
const STANDARD_CONTOUR_CORNER_RADIUS = 16
const CNODE_RADIUS = 7
const MIN_ROTATION = -180
const MAX_ROTATION_INPUT = 9999;
const MIN_DISTANCE = -9999;
const MAX_DISTANCE = 9999;

export const DEFAULT_DISTANCE = 10;
export const MAX_NODEGROUP_SIZE = 1000;


export class NodeGroup implements Group<CNode> {

    public members: CNode[];
    public group: Group<Item | Group<any>> | null;
    public isActiveMember: boolean;

    public linewidth: number = DEFAULT_LINEWIDTH
    public linewidth100: number = DEFAULT_LINEWIDTH
    public shading: number = DEFAULT_SHADING
    public dash: number[] = DEFAULT_DASH
    public dash100: number[] = DEFAULT_DASH

    public dashValidator = new DashValidator(MAX_DASH_VALUE, MAX_DASH_LENGTH);
    
    public readonly id: string;
    
    constructor(i: number, x?: number, y?: number) {
        this.id = `NG${i}`;
        this.group = null;
        this.isActiveMember = false;
        if (x!==undefined && y!==undefined) {
            const w = STANDARD_CONTOUR_WIDTH,
                h = STANDARD_CONTOUR_HEIGHT,
                r = STANDARD_CONTOUR_CORNER_RADIUS;
            this.members = [
                new CNode(`CN${i}/0`, x, y, 0, -45, this),
                new CNode(`CN${i}/1`, x+r, y-r, 45, 0, this),
                new CNode(`CN${i}/2`, x+w-r, y-r, 0, -45, this),
                new CNode(`CN${i}/3`, x+w, y, 45, 0, this),
                new CNode(`CN${i}/4`, x+w, y+h-2*r, 0, -45, this),
                new CNode(`CN${i}/5`, x+w-r, y+h-r, 45, 0, this),
                new CNode(`CN${i}/6`, x+r, y+h-r, 0, -45, this),
                new CNode(`CN${i}/7`, x, y+h-2*r, 45, 0, this)
            ];
        } else {
            this.members = [];
        }
    }

    public getLines = (): CubicLine[] => {
        const l = this.members.length;
        return this.members.map((node, i) => getLine(node, this.members[i+1<l? i+1: 0]));
    }

    public getCenter = (): [x: number, y: number] => {
        let maxX = -Infinity, minX = Infinity, maxY = -Infinity, minY = Infinity;
        for (const node of this.members) {
            maxX = maxX>node.x? maxX: node.x;
            minX = minX<node.x? minX: node.x;
            maxY = maxY>node.y? maxY: node.y;
            minY = minY<node.y? minY: node.y;
        }
        return [(minX+maxX)/2, (minY+maxY)/2]
    }

    public getString = () => `NG[${this.members.map(member => member.getString()+(member.isActiveMember? '(A)': '')).join(', ')}]`;
}

export type CubicLine = {
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
}

const angle = (x1: number, y1: number, x2: number, y2: number): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const radians = Math.atan2(dy, dx);
    return radians * (180 / Math.PI);
}

const getLine = (node0: CNode, node1: CNode): CubicLine => {
    const a0 = (angle(node0.x, node0.y, node1.x, node1.y) + node0.angle1) * Math.PI / 180;
    const a1 = (angle(node1.x, node1.y, node0.x, node0.y) + node1.angle0) * Math.PI / 180;
    return {
        x0: node0.x, y0: node0.y, 
        x1: node0.x + Math.cos(a0)*node0.dist1, y1: node0.y + Math.sin(a0)*node0.dist1, 
        x2: node1.x + Math.cos(a1)*node1.dist0, y2: node1.y + Math.sin(a1)*node1.dist0,
        x3: node1.x, y3: node1.y
    }
}

export interface ContourProps {
    id: string
    group: NodeGroup
    yOffset: number
    bg: HSL
}

export const Contour = ({id, group, yOffset, bg}: ContourProps) => {
    const linewidth = group.linewidth;
    const shading = group.shading;
    const dash = group.dash;
    const lines = group.getLines();
    if (lines.length>0) {
        const minX = lines.reduce((min, line, i) => {
            const mx = Math.min(line.x0, line.x1, line.x2);
            return mx<min && !group.members[i].omitLine? mx: min
        }, Infinity);
        const maxX = lines.reduce((max, line, i) => {
            const mx = Math.max(line.x0, line.x1, line.x2);
            return mx>max && !group.members[i].omitLine? mx: max
        }, -Infinity);
        const minY = lines.reduce((min, line, i) => {
            const my = Math.min(line.y0, line.y1, line.y2);
            return my<min && !group.members[i].omitLine? my: min
        }, Infinity);
        const maxY = lines.reduce((max, line, i) => {
            const my = Math.max(line.y0, line.y1, line.y2);
            return my>max && !group.members[i].omitLine? my: max
        }, -Infinity);
        const h = maxY-minY;
        const lwc = linewidth; // linewidth correction

        const d = `M ${lines[0].x0-minX+lwc} ${h-lines[0].y0+minY+lwc} ` + 
            lines.map((line, i) => 
                group.members[i].omitLine?
                `M ${line.x3-minX+lwc} ${h-line.y3+minY+lwc} `:
                `C ${line.x1-minX+lwc} ${h-line.y1+minY+lwc}, ${line.x2-minX+lwc} ${h-line.y2+minY+lwc}, ${line.x3-minX+lwc} ${h-line.y3+minY+lwc}`).join(' ');

        return (
            <div id={id} style={{
                position: 'absolute',
                left: `${minX - lwc}px`,
                top: `${H + yOffset - maxY - lwc}px`,
                pointerEvents: 'none'
            }}>
                <svg width={maxX-minX+2*linewidth} height={maxY-minY+2*linewidth} >
                    <path d={d}  
                        fill={shading == 0 ? 'hsla(0,0%,0%,0)' : `hsla(${bg.hue},${bg.sat - Math.floor(bg.sat * shading)}%,${bg.lgt - Math.floor(bg.lgt * shading)}%,1)`}
                        stroke={DEFAULT_COLOR}
                        strokeWidth={linewidth}
                        strokeDasharray={dash.join(' ')} />
                </svg>
            </div>
        );
    }
    else return null
}


export default class CNode extends Item {

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

    public override getInfo(list: (ENode | NodeGroup)[], config: Config): Entry[] {
        const group = this.group as NodeGroup;
        return [
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
                onChange: (e) => {
                    if(e) {
                        const val = validInt(e.target.value, MIN_TRANSLATION_LOG_INCREMENT, MAX_TRANSLATION_LOG_INCREMENT)
                        config.logIncrement = val
                    }
                }
            },
            {type: 'checkbox', key: 'line', text: 'No line to next node', value: this.omitLine, extraBottomMargin: true},
            {type: 'number input', key: 'lw', text: 'Line width', width: 'long', value: group.linewidth, step: 0.1},
            {type: 'string input', key: 'dash', text: 'Stroke pattern', width: 'long', value: group.dashValidator.write(group.dash)},
            {type: 'number input', key: 'shading', text: 'Shading', width: 'long', value: group.shading, min: 0, max: 1, step: 0.1},
            {type: 'number input', key: 'rank', text: 'Rank (akin to Z-index)', value: list.indexOf(group), step: 1, extraBottomMargin: true},
            {type: 'button', key: 'defaults', text: 'Defaults'},
            {type: 'label', text: '', style: 'flex-1'}, // a filler to ensure that there's some margin at the bottom
        ]
    }

    public override handleEditing(
            e: React.ChangeEvent<HTMLInputElement> | null, 
            config: Config, 
            selection: Item[],
            key: string): [(item: Item, list: (ENode | NodeGroup)[]) => (ENode | NodeGroup)[], applyToAll: boolean] {
        switch(key) {
            case 'a0': if (e) {
                    const delta = parseCyclicInputValue(e.target.value, this.angle0, config.logIncrement)[1]; 
                    return [(item, array) => {
                        if(!isNaN(delta) && delta!==0 && item instanceof CNode) {
                            item.angle0 = getCyclicValue(item.angle0 + delta, MIN_ROTATION, 360, 10 ** Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT));
                        }
                        return array
                    }, true]
                }
            case 'd0': if (e) {
                    const d = parseInputValue(e.target.value, MIN_DISTANCE, MAX_DISTANCE, this.dist0, 
                        config.logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.dist0;
                    return [(item, array) => {
                        if (!isNaN(d) && d!==0 && item instanceof CNode) {
                            item.dist0 = item.dist0_100 = item.dist0 + d;
                        }
                        return array
                    }, true]
                }
            case 'a1': if (e) {
                    const delta = parseCyclicInputValue(e.target.value, this.angle1, config.logIncrement)[1]; 
                    return [(item, array) => {
                        if(!isNaN(delta) && delta!==0 && item instanceof CNode) {
                            item.angle1 = getCyclicValue(item.angle1 + delta, MIN_ROTATION, 360, 10 ** Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT));
                        }
                        return array
                    }, true]
                }
            case 'd1': if (e) {
                    const d = parseInputValue(e.target.value, MIN_DISTANCE, MAX_DISTANCE, this.dist1, 
                        config.logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.dist1;
                    return [(item, array) => {
                        if (!isNaN(d) && d!==0 && item instanceof CNode) {
                            item.dist1 = item.dist1_100 = item.dist1 + d;
                        }
                        return array
                    }, true]
                }
            case 'x': if (e) {
                    const dmin = -selection.reduce((min, item) => min<item.x? min: item.x, this.x);
                    const delta = parseInputValue(e.target.value, 0, MAX_X, this.x, config.logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.x;
                    const dx = delta>dmin? delta: 0; // this is to avoid items from being moved beyond the left border of the canvas                        
                    return [(item, array) => {
                        if (dx!==0) item.move(dx, 0); 
                        return array
                    }, true]
                }
            case 'y': if (e) {
                    const dy = parseInputValue(e.target.value, MIN_Y, MAX_Y, this.y, config.logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.y;
                    return [(item, array) => {
                        if (!isNaN(dy) && dy!==0) {
                            item.move(0, dy);
                        }
                        return array
                    }, true]
                }
            case 'line':
                const omit = !this.omitLine;
                return [(item, array) => {
                    if (item instanceof CNode) {
                        console.log(`item: ${item.id} this: ${this.id}`);
                        item.omitLine = omit;
                    }
                    return array
                }, true]
            case 'lw': if (e) return [(item, array) => {
                    if (item.group instanceof NodeGroup) {
                        item.group.linewidth = item.group.linewidth100 = validFloat(e.target.value, 0, MAX_LINEWIDTH, 0); 
                    }
                    return array
                }, true]
            case 'dash': if (e) return [(item, array) => {
                    if (item.group instanceof NodeGroup) {
                        item.group.dash = item.group.dash100 = item.group.dashValidator.read(e.target); 
                    }
                    return array
                }, true]
            case 'shading': if (e) return [(item, array) => {
                    if (item.group instanceof NodeGroup) {
                        item.group.shading = validFloat(e.target.value, 0, 1); 
                    }
                    return array
                }, true]
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
                }, false]
            case 'defaults': return [(item, array) => {
                    if (item instanceof CNode && item.group instanceof NodeGroup) {
                        item.omitLine = false;
                        item.angle0 = item.angle1 = 0;
                        item.dist0 = item.dist0_100 = item.dist1 = item.dist1_100 = DEFAULT_DISTANCE;
                        item.group.linewidth = item.group.linewidth100 = DEFAULT_LINEWIDTH;
                        item.group.dash = item.group.dash100 = DEFAULT_DASH;
                        item.group.shading = DEFAULT_SHADING;
                    }
                    return array
                }, true]
            default: 
                return [(item, array) => array, false]        
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
    onMouseDown: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    onMouseEnter: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    onMouseLeave: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}

export const CNodeComp = ({id, cnode, yOffset, markColor, focus, selected, preselected, onMouseDown, onMouseEnter, onMouseLeave}: CNodeCompProps) => {
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

    //console.log(`Rendering ${id}... x=${x}  y=${y}`);

    return (
        <div className={focus ? 'focused' : selected ? 'selected' : preselected? 'preselected': 'unselected'}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => onMouseDown(cnode, e)}
            onMouseEnter={(e) => onMouseEnter(cnode, e)}
            onMouseLeave={(e) => onMouseLeave(cnode, e)}
            style={{
                position: 'absolute',
                left: `${x - radius - MARK_LINEWIDTH}px`,
                top: `${H + yOffset - y - radius - MARK_LINEWIDTH}px`
            }}>
            <svg width={mW + MARK_LINEWIDTH} height={mH + MARK_LINEWIDTH * 2}>
                <polyline stroke={markColor}  points={`${left},${top + l} ${left + m},${top + m} ${left + l},${top}`} fill='none' />
                <polyline stroke={markColor} points={`${left + mW - l},${top} ${left + mW - m},${top + m} ${left + mW},${top + l}`} fill='none' />
                <polyline stroke={markColor} points={`${left + mW},${top + mH - l} ${left + mW - m},${top + mH - m} ${left + mW - l},${top + mH}`} fill='none' />
                <polyline stroke={markColor} points={`${left + l},${top + mH} ${left + m},${top + mH - m} ${left},${top + mH - l}`} fill='none' />
            </svg>
        </div>
    )
}