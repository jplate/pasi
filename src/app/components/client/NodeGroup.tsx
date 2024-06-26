import Item, { DEFAULT_LINEWIDTH, DEFAULT_DASH, DEFAULT_SHADING, MAX_LINEWIDTH, MAX_DASH_LENGTH, MAX_DASH_VALUE, HSL } from './Item.tsx'
import Group from './Group.tsx'
import { H, MARK_LINEWIDTH, MAX_X, MAX_Y, MIN_Y, round, ROUNDING_DIGITS } from './MainPanel.tsx'
import { DashValidator } from './EditorComponents.tsx'
import CNode from './CNode.tsx'

const STANDARD_CONTOUR_HEIGHT = 80
const STANDARD_CONTOUR_WIDTH = 120
const STANDARD_CONTOUR_CORNER_RADIUS = 18
const CONTOUR_CENTER_DIV_WIDTH_RATIO = 0.2
const CONTOUR_CENTER_DIV_HEIGHT_RATIO = 0.2
const CONTOUR_CENTER_DIV_MIN_WIDTH = 7
const CONTOUR_CENTER_DIV_MIN_HEIGHT = 7
export const CONTOUR_CENTER_DIV_MAX_WIDTH = 40
export const CONTOUR_CENTER_DIV_MAX_HEIGHT = 40

export const DEFAULT_DISTANCE = 10
const BUMP_DISTANCE = 5 // the minimal distance that the CNodes of a NodeGroup can be brought together through dragging while fixedAngles is true
export const MAX_NODEGROUP_SIZE = 1000


export const angle = (x1: number, y1: number, x2: number, y2: number, inRadians: boolean = false): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const radians = Math.atan2(dy, dx);
    return inRadians? radians: radians * (180 / Math.PI);
}


export default class NodeGroup implements Group<CNode> {

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

    /** Returns the bounds of this NodeGroup, taking into account also the control points of the various (non-omitted) lines connecting the nodes.
     */
    public getBounds = (
        lines: CubicLine[] = this.getLines(), 
    ): { minX: number, maxX: number, minY: number, maxY: number } => {
        const minX = lines.reduce((min, line, i) => {
            const mx = Math.min(line.x0, line.x1, line.x2);
            return mx<min && (this.shading>0 || !this.members[i].omitLine)? mx: min
        }, Infinity);
        const maxX = lines.reduce((max, line, i) => {
            const mx = Math.max(line.x0, line.x1, line.x2);
            return mx>max && (this.shading>0 || !this.members[i].omitLine)? mx: max
        }, -Infinity);
        const minY = lines.reduce((min, line, i) => {
            const my = Math.min(line.y0, line.y1, line.y2);
            return my<min && (this.shading>0 || !this.members[i].omitLine)? my: min
        }, Infinity);
        const maxY = lines.reduce((max, line, i) => {
            const my = Math.max(line.y0, line.y1, line.y2);
            return my>max && (this.shading>0 || !this.members[i].omitLine)? my: max
        }, -Infinity);
        return { minX, maxX, minY, maxY }
    }

    /** Returns the 'nodal center' of this NodeGroup, i.e., the non-weighted average of its members' locations.
     */
    public getNodalCenter = () => ({
        x: (this.members.reduce((acc, m) => m.x<acc? m.x: acc, Infinity) + this.members.reduce((acc, m) => m.x>acc? m.x: acc, -Infinity)) / 2,
        y: (this.members.reduce((acc, m) => m.y<acc? m.y: acc, Infinity) + this.members.reduce((acc, m) => m.y>acc? m.y: acc, -Infinity)) / 2
    });


    public getString = () => `NG[${this.members.map(member => member.getString()+(member.isActiveMember? '(A)': '')).join(', ')}]`;


    public groupMove = (nodes: CNode[], dx: number, dy: number) => {
        const members = this.members;
        const n = members.length;
        const bd = BUMP_DISTANCE;
        const dxs: number[] = new Array(n).fill(0);
        const dys: number[] = new Array(n).fill(0);
        nodes.forEach(node => {
            const index = members.indexOf(node);
            dxs[index] = dx;
            dys[index] = dy;
            if (node.fixedAngles) {
                let current: CNode,
                    x0, y0, cdx, cdy;
                for (const s of [-1, 1]) { 
                    // Starting from the current node, we propagate changes in both directions, as far as necessary. The changes are stored in the arrays dxs and dys.
                    current = node;
                    cdx = dx;
                    cdy = dy;

                    for (let i = 1; i<n && (cdx!==0 || cdy!==0); i++) { 
                        if (!current.fixedAngles) break;
                        x0 = current.x;
                        y0 = current.y;
                        const j = index + s*i;
                        const k = j<0? j+n: j>=n? j-n: j;
                        const next = members[k];
                        if (nodes.includes(next)) break;

                        if (x0==next.x) {
                            if ((y0<next.y && y0+cdy<next.y-bd) || (y0>next.y && y0+cdy>next.y+bd)) {
                                cdy = 0;
                            }
                            else if (y0<next.y) {
                                cdy = y0 + cdy - next.y + bd;
                            }
                            else if (y0>next.y) {
                                cdy = y0 + cdy - next.y - bd;
                            }
                        }
                        if (y0==next.y) {
                            if ((x0<next.x && x0+cdx<next.x-bd) || (x0>next.x && x0+cdx>next.x+bd)) {
                                cdx = 0;
                            }
                            else if (x0<next.x) {
                                cdx = x0 + cdx - next.x + bd;
                            }
                            else if (x0>next.x) {
                                cdx = x0 + cdx - next.x - bd;
                            }
                        }
                        dxs[k] = Math.abs(dxs[k])>Math.abs(cdx)? dxs[k]: cdx;
                        dys[k] = Math.abs(dys[k])>Math.abs(cdy)? dys[k]: cdy;
                        current = next;
                    }
                }
            }
        });
        // Apply the changes:
        if (members.every((m, i) => {
                const x = m.x + dxs[i];
                return x>=0 && x<=MAX_X
            })) {
            for (let i = 0; i<n; i++) {
                const m = members[i];
                m.x = m.x100 = m.x + dxs[i];
            }
        }
        if (members.every((m, i) => {
                const y = m.y + dys[i];
                return y>=MIN_Y && y<=MAX_Y
            })) {
            for (let i = 0; i<n; i++) {
                const m = members[i];
                m.y = m.y100 = m.y + dys[i];
            }
        }
    }


    public equalizeCentralAngles = (node: CNode) => {
        const n = this.members.length;
        if (n<3) return; // Nothing to do if n is less than 3.
        const index = this.members.indexOf(node);
        if (index<0) {
            console.log('Illegal argument');
            return; // In this case we h
        }

        const e = 10 ** -(ROUNDING_DIGITS+1);       
        const inc = 2*Math.PI/n;
        let c, newC = this.getNodalCenter();

        do { // Adjusting angles can move the center. We'll repeat the process until the center stops moving by more than e.
            c = newC;
            // Starting from focus, record the first two consecutive nodes that straddle the vertical center line. If n is even, then these two nodes will be placed symmetrically 
            // (as far as their central angles are concerned) with respect to this line, either above the center or below it, depending on where a straight line between the two nodes 
            // would cross the center line. If n is odd, then first node will be placed directly above or below the center point.
            let p0 = node,
                p1 = p0, 
                i0 = index, 
                i1;
            for (let i = 1; i<n; i++) {
                const j = index + i;
                const k = j>=n? j-n: j;
                p1 = this.members[k];
                i1 = k;
                if ((p0.x<=c.x && p1.x>=c.x) || (p1.x<=c.x && p0.x>=c.x)) break;
                p0 = p1;
                i0 = i1;
            }
            // Compute the y-value of where a straight line from p0 to p1 would cross the center line:
            const slope = (p0.y - p1.y) / (p0.x - p1.x);
            const yIntercept = p0.y - slope * p0.x;
            const crossing = slope * c.x + yIntercept;

            // Now we place the nodes:
            const dir = ((p0.x>c.x && crossing<c.y) || (p0.x<c.x && crossing>c.y))? -1: 1; // -1 means we're proceeding in a clockwise direction when arranging the nodes.
            const start = i0;
            for (
                let i = 0,
                    angle = ((crossing>c.y? 1: -1) * Math.PI - (n%2!==0? 0: dir*inc)) / 2;
                i < n;
                i++, angle += dir*inc
            ) {
                const j = start + i;
                const k = j>=n? j-n: j;
                const m = this.members[k];
                const d = Math.sqrt((m.x - c.x) ** 2 + (m.y - c.y) ** 2);
                m.x = c.x + Math.cos(angle) * d;
                m.y = c.y + Math.sin(angle) * d;
            }

            newC = this.getNodalCenter();
        }
        while (Math.abs(newC.x-c.x)>e || Math.abs(newC.y-c.y)>e);

        // Finally, we round all coordinates to the nearest (e/10)th.
        const factor = 10 ** ROUNDING_DIGITS;
        this.members.forEach(m => {
            // We apply extra rounding because the division by factor can yield numbers that differ from the intended values by a tiny amount.
            m.x = m.x100 = round(Math.round(m.x * factor) / factor, ROUNDING_DIGITS);
            m.y = m.y100 = round(Math.round(m.y * factor) / factor, ROUNDING_DIGITS);
        });
    }


    public equalizeDistancesFromCenter = (node: CNode) => {
        const n = this.members.length;
        if (n<3) return; // Nothing to do if n is less than 3.
       
        const e = 10 ** -(ROUNDING_DIGITS+1);       
        let c = this.getNodalCenter(),
            newC = c;
        const d = Math.sqrt((node.x - c.x) ** 2 + (node.y - c.y) ** 2);
        
        do {
            c = newC;
            this.members.forEach(m => {
                const a = angle(c.x, c.y, m.x, m.y, true);
                m.x = c.x + Math.cos(a) * d;
                m.y = c.y + Math.sin(a) * d;
            });
            newC = this.getNodalCenter();
        } 
        while (Math.abs(newC.x-c.x)>e || Math.abs(newC.y-c.y)>e);

        // Finally, we round all coordinates to the nearest (e/10)th.
        const factor = 10 ** ROUNDING_DIGITS;
        this.members.forEach(m => {
            // We apply extra rounding because the division by factor can yield numbers that differ from the intended values by a tiny amount.
            m.x = m.x100 = round(Math.round(m.x * factor) / factor, ROUNDING_DIGITS);
            m.y = m.y100 = round(Math.round(m.y * factor) / factor, ROUNDING_DIGITS);
        });
    }
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


export const getLine = (node0: CNode, node1: CNode): CubicLine => {
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
    primaryColor: HSL
    markColor: string
    selected: boolean
    preselected: boolean
    centerDivClickable: boolean
    showCenterDiv: boolean
    onMouseDown: (group: NodeGroup, e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onMouseEnter: (group: NodeGroup, e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onMouseLeave: (group: NodeGroup, e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>) => void
}

export const Contour = ({id, group, yOffset, selected, preselected, bg, primaryColor, markColor, centerDivClickable, showCenterDiv,
        onMouseDown, onMouseEnter, onMouseLeave}: ContourProps) => {
    const linewidth = group.linewidth;
    const shading = group.shading;
    const dash = group.dash;
    const lines = group.getLines();
    if (lines.length>0) {
        const { minX, maxX, minY, maxY } = group.getBounds(lines);
        if (!isFinite(minX)) return null;
        const h = maxY-minY;
        const lwc = linewidth; // linewidth correction
        const mlw = MARK_LINEWIDTH;

        const linePath = `M ${lines[0].x0-minX+lwc} ${h-lines[0].y0+minY+lwc} ` + 
            lines.map((line, i) => 
                group.members[i].omitLine?
                `M ${line.x3-minX+lwc} ${h-line.y3+minY+lwc} `:
                `C ${line.x1-minX+lwc} ${h-line.y1+minY+lwc}, ${line.x2-minX+lwc} ${h-line.y2+minY+lwc}, ${line.x3-minX+lwc} ${h-line.y3+minY+lwc}`).join(' ');

        const fillPath = `M ${lines[0].x0-minX+lwc} ${h-lines[0].y0+minY+lwc} ` + 
            lines.map((line, i) => 
                `C ${line.x1-minX+lwc} ${h-line.y1+minY+lwc}, ${line.x2-minX+lwc} ${h-line.y2+minY+lwc}, ${line.x3-minX+lwc} ${h-line.y3+minY+lwc}`).join(' ');
        
        const cdW = Math.min((maxX - minX) * CONTOUR_CENTER_DIV_WIDTH_RATIO, CONTOUR_CENTER_DIV_MAX_WIDTH);
        const cdH = Math.min((maxY - minY) * CONTOUR_CENTER_DIV_HEIGHT_RATIO, CONTOUR_CENTER_DIV_MAX_HEIGHT);

        return (
            <>
                <div id={id} style={{
                        position: 'absolute',
                        left: `${minX - lwc}px`,
                        top: `${H + yOffset - maxY - lwc}px`,
                        pointerEvents: 'none'
                    }}>
                    <svg width={maxX - minX + 2*linewidth + 1} height={maxY - minY + 2*linewidth + 1} xmlns="http://www.w3.org/2000/svg" 
                            pointerEvents={shading>0? 'fill': 'none'}>
                        {linewidth>0 &&
                            <path d={linePath}  
                                fill='none'
                                stroke={`hsl(${primaryColor.hue},${primaryColor.sat}%,${primaryColor.lgt}%`}
                                strokeWidth={linewidth}
                                strokeDasharray={dash.join(' ')} />
                        }
                        {shading>0 && 
                            <path d={fillPath}  
                                onMouseDown={(e) => onMouseDown(group, e)}
                                onMouseEnter={(e) => onMouseEnter(group, e)}
                                onMouseLeave={(e) => onMouseLeave(group, e)}
                                fill={shading==0? 'hsla(0,0%,0%,0)': // Otherwise we assmilate the background color to the primary color, to the extent that shading approximates 1.
                                    `hsla(${bg.hue - Math.floor((bg.hue - primaryColor.hue) * shading)},` +
                                    `${bg.sat - Math.floor((bg.sat - primaryColor.sat) * shading)}%,` +
                                    `${bg.lgt - Math.floor((bg.lgt - primaryColor.lgt) * shading)}%,1)`}
                                stroke='none' />
                        }
                    </svg>
                </div>
                {cdW>=CONTOUR_CENTER_DIV_MIN_WIDTH && cdH>=CONTOUR_CENTER_DIV_MIN_HEIGHT && 
                    <div className={showCenterDiv? 'selected': 'unselected'}
                            onMouseDown={(e) => onMouseDown(group, e)}
                            onMouseEnter={(e) => onMouseEnter(group, e)}
                            onMouseLeave={(e) => onMouseLeave(group, e)}
                            style={{                
                                position: 'absolute',
                                left: `${(minX + maxX - cdW)/2 - mlw}px`,
                                top: `${H + yOffset - (minY + maxY + cdH)/2 - mlw}px`,
                                cursor: centerDivClickable? 'pointer': 'auto',
                                pointerEvents: centerDivClickable? 'auto': 'none'

                        }}>
                        <svg width={cdW + 2*mlw} height={cdH + 2*mlw} opacity={0.5}>
                            <polyline points={`${mlw},${mlw} ${cdW},${mlw} ${cdW},${cdH} ${mlw},${cdH} ${mlw},${mlw} ${3},${mlw}`} stroke={markColor} fill='none' />
                        </svg>
                    </div>
                }
            </>
        );
    }
    else return null
}
