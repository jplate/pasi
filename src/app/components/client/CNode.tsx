import Item from './Item.tsx'
import Riv from './Riv.tsx'
import Group from './Group.tsx'
import { H, MARK_LINEWIDTH } from './MainPanel.tsx'
import { DEFAULT_COLOR, DEFAULT_LINEWIDTH, DEFAULT_SHADING, DEFAULT_DASH, HSL } from './Item.tsx'

const STANDARD_CONTOUR_HEIGHT = 50
const STANDARD_CONTOUR_WIDTH = 70
const STANDARD_CONTOUR_CORNER_RADIUS = 16
const CNODE_RADIUS = 7

export const DEFAULT_DISTANCE = 10;

export default class CNode extends Item {

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
}

export class NodeGroup implements Group<CNode> {

    public members: CNode[];
    public group: Group<Item | Group<any>> | null;
    public isActiveMember: boolean;

    public linewidth: number = DEFAULT_LINEWIDTH
    public linewidth100: number = DEFAULT_LINEWIDTH
    public shading: number = DEFAULT_SHADING
    public dash: number[] = DEFAULT_DASH
    public dash100: number[] = DEFAULT_DASH
    
    public readonly id: string;
    
    constructor(i: number, x: number, y: number, standard: boolean) {
        this.id = `NG${i}`;
        this.group = null;
        this.isActiveMember = false;
        if (standard) {
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

    public getLines = () => {
        const l = this.members.length;
        return this.members.map((node, i) => getLine(node, this.members[i+1<l? i+1: 0]));
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

const lineString = (line: CubicLine) => `(${line.x0}, ${line.y0}) (${line.x1} ${line.y1}) (${line.x2}, ${line.y2}) (${line.x3}, ${line.y3})`;

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
        const minX = lines.reduce((min, line) => {
            const mx = Math.min(line.x0, line.x1, line.x2);
            return mx<min? mx: min
        }, Infinity);
        const maxX = lines.reduce((max, line) => {
            const mx = Math.max(line.x0, line.x1, line.x2);
            return mx>max? mx: max
        }, -Infinity);
        const minY = lines.reduce((min, line) => {
            const my = Math.min(line.y0, line.y1, line.y2);
            return my<min? my: min
        }, Infinity);
        const maxY = lines.reduce((max, line) => {
            const my = Math.max(line.y0, line.y1, line.y2);
            return my>max? my: max
        }, -Infinity);
        const h = maxY-minY;
        const lwc = linewidth; // linewidth correction

        const d = `M ${lines[0].x0-minX+lwc} ${h-lines[0].y0+minY+lwc} ` + 
            lines.map(line => `C ${line.x1-minX+lwc} ${h-line.y1+minY+lwc}, ${line.x2-minX+lwc} ${h-line.y2+minY+lwc}, ${line.x3-minX+lwc} ${h-line.y3+minY+lwc}`).join(' ');

        return (
            <div id={id} style={{
                position: 'absolute',
                left: `${minX - lwc}px`,
                top: `${H + yOffset - maxY - lwc}px`
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

    console.log(`Rendering ${id}... x=${x}  y=${y}`);

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