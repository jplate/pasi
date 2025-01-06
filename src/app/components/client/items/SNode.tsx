import React from 'react'
import Item, { HSL, Range, Direction } from './Item'
import Node, { DEFAULT_DASH, DEFAULT_LINEWIDTH, LINECAP_STYLE, LINEJOIN_STYLE  } from './Node'
import ENode, { ENodeCompProps } from './ENode'
import { H } from '../MainPanel'
import CNodeGroup from '../CNodeGroup'
import { Entry } from '../ItemEditor'
import { Shape, getBounds, getPath, angle, angleDiff, CubicCurve, cubicBezier, closestTo } from '../../../util/MathTools'

export const DEFAULT_RADIUS = 5
export const DEFAULT_GAP = .4;
export const MIN_HIDDEN_RADIUS = 12;
export const MAX_HIDDEN_RADIUS = 36;

/**
 * SNodes are 'state nodes': they represent states, typically relationships between other entities, by lines and arrows on the canvas.
 * This class roughly corresponds to the Connector class of the 2007 applet.
 */
export default abstract class SNode extends ENode {

    involutes: Node[] = [];
    conLinewidth: number = DEFAULT_LINEWIDTH
    conLinewidth100: number = DEFAULT_LINEWIDTH
    conDash: number[] = DEFAULT_DASH;
    conDash100: number[] = DEFAULT_DASH;

    gap: number = DEFAULT_GAP;
    gap0: number = 0;
    gap1: number = 0;
    protected w0 = 0; // parameter controlling the length of the 'stiff part' at the beginning of the connector
	protected w1 = 0; // ditto for the end of the connector
	protected wc = 0; // ditto for the center of the connector
    protected rigidPoint = false;
    d0: number = 0; // the uder-defined distances from the involutes to the corresponding control points of the connector
    d1: number = 0;
    phi0: number = 0; // the user-defined angles of the connector's contacts relative to the baseline angle
    phi1: number = 0;
    manualBaseAngle: number | undefined; // relevant if involutes[0]==involutes[1]: chi0 and chi1 have been selected manually 

    locationDefined: boolean = false; // indicates whether this.x and this.y give the actual location or need to be updated.
    t:number = 0.5; // the parameter that indicates the position of this Node on the connector between the two involutes.

    constructor(i: number) {
        super(i, 0, 0); // We invoke the super constructor with coordinates (0,0). The actual location of this Node is given by getLocation().
        this.radius = this.radius100 = DEFAULT_RADIUS;
        this.w0 = this.getDefaultW0();
	    this.w1 = this.getDefaultW1();
	    this.wc = this.getDefaultWC();
        this.gap1 = this.computeGap1();
        this.rigidPoint = this.hasByDefaultRigidPoint();
    }

    init(involutes: Node[]) {
        this.involutes = involutes;
        for (let node of involutes) {
            node.dependentSNodes=[...node.dependentSNodes, this];
        }
    }

    abstract getDefaultW0(): number;
    abstract getDefaultW1(): number;
    abstract getDefaultWC(): number;

    /**
     * Meant for invocation by CompoundArrow#parse() on the CompoundArrow's elements. 
     */
    computeGap() {
        return this.gap1;
    }
    
    computeGap1() {
        return this.gap;
    }
    
	hasByDefaultRigidPoint() {
	    return false;
    }

    override getLocation() {
        if (this.locationDefined || this.involutes.length!==2) {
            return [this.x, this.y];
        }
        else {
            const line = this.getLine();
            const loc =  cubicBezier(line, this.t);
            [this.x, this.y] = loc;
            this.locationDefined = true;
            return loc;
        }
    }

    override move(dx: number, dy: number): void {
        const [x, y] = this.getLocation(); 
        const gx = x + dx;
        const gy = y + dy;
        const line = this.getLine();
        this.t = closestTo(gx, gy, line, .05, .95);
        const [newX, newY] = cubicBezier(line, this.t);
        this.x = newX;
        this.y = newY;
        this.x100 += (newX - x);
        this.y100 += (newY - y);
        this.invalidateDepSNodeLocations();
    }


    override getInfo(list: (ENode | CNodeGroup)[]): Entry[] {
        return [
            {type: 'label', text: 'Node properties', style: 'flex-0'}, 
            ...this.getCommonInfo(list)
        ];
    }

    override handleEditing(
        e: React.ChangeEvent<HTMLInputElement> | null, 
        logIncrement: number, 
        selection: Item[],
        _unitscale: number,
        _displayFontFactor: number,
        key: string
    ): [(item: Item, list: (ENode | CNodeGroup)[]) => (ENode | CNodeGroup)[], applyTo: Range] {
        const handler = this.commonEditHandler;
        return handler[key]({ e, logIncrement, selection }) ?? [(_item, array) => array, 'onlyThis'];
    }

    getHiddenRadius() {
        const [n0, n1] = this.involutes; 
        const [x0, y0] = n0.getLocation();
        const [x1, y1] = n1.getLocation();
        const [r0, r1] = this.involutes.map(n => n.radius);
        const d = Math.sqrt((x1 - x0)**2 + (y1 - y0)**2);
        return Math.min(MAX_HIDDEN_RADIUS, 
            Math.max(MIN_HIDDEN_RADIUS,
			    Math.floor((this.w0 + this.w1 + this.wc) / 2), 
			    Math.floor((d - r0 - r1) / 3)
            )
        );
	}

    findBaseAngle() {
	    let [n0, n1] = this.involutes;
        const [x0, y0] = n0.getLocation();
        const [x1, y1] = n1.getLocation();
        return this.manualBaseAngle?? -angle(x0, y0, x1, y1, true);
    }

    /**
     * Returns a tuple of the connector's preferred angles of incidence on the two involutes.
     */
    findPreferredAngles(): [chi0: number, chi1: number] {
	    let [n0, n1] = this.involutes;
        let w0 = this.w0;
        let w1 = this.w1 + this.gap1;
        
        const r0 = n0.radius; 
        const r1 = n1.radius; 
        const [x0, y0] = n0.getLocation();
        const [x1, y1] = n1.getLocation();
        
        const w = w0 + w1 + this.wc;
		const d = Math.sqrt((x1 - x0)**2 + (y1 - y0)**2);
        const discr = Math.max(0, w + r0 + r1 - d) / 2; // 'discrepancy', divided evenly among the two involutes
        const baseAngle = this.findBaseAngle();
        let chi0 = baseAngle - Math.acos(Math.max(-0.5, (r0 - discr) / r0));
        let chi1 = baseAngle - Math.PI + Math.acos(Math.max(-0.5, (r1 - discr) / r1));
        if(this.flexDirection==='clockwise') {
        	chi0 = 2*baseAngle - chi0;
        	chi1 = 2*baseAngle - chi1;
        }        
        return [chi0, chi1];
	}

    // This needs more work; currently we're ignoring whether multiple connectors hit a node at the same spot.
    findIncidenceAngles(): [psi0: number, psi1: number] {
        return this.findPreferredAngles();
    }

    getLineFor(psi0: number, cpr0: number, psi1: number, cpr1: number): CubicCurve {
        const [n0, n1] = this.involutes;
        const [x0, y0] = n0.getLocation();
        const [x1, y1] = n1.getLocation();
        const [r0, r1] = this.involutes.map(n => n.radius);
    
        return {
            x0: x0 + r0 * Math.cos(psi0), 
            y0: y0 - r0 * Math.sin(psi0), 
            x1: x0 + cpr0 * Math.cos(psi0), 
            y1: y0 - cpr0 * Math.sin(psi0), 
            x2: x1 + cpr1 * Math.cos(psi1), 
            y2: y1 - cpr1 * Math.sin(psi1), 
            x3: x1 + r1 * Math.cos(psi1), 
            y3: y1 - r1 * Math.sin(psi1)
        }
    }

    getLine(): CubicCurve {
        const [r0, r1] = this.involutes.map(n => n.radius);
        const w0 = this.w0 + this.gap0;
        const w1 = this.w1 + this.gap1;

        const [psi0, psi1] = this.findIncidenceAngles();
        const baseAngle = this.findBaseAngle();

        let cpr0 = r0 + w0;
        let cpr1 = r1 + w1;
        const xi0 = Math.min(angleDiff(baseAngle, psi0), angleDiff(psi0, baseAngle));
        const xi1 = Math.min(angleDiff(baseAngle + Math.PI, psi1), angleDiff(psi1, baseAngle + Math.PI));
        if (Math.abs(xi0) + Math.abs(xi1) > 0.1) {
            const co0 = Math.min(1, 1 + Math.cos(xi0));
            const co1 = Math.min(1, 1 + Math.cos(xi1));
            cpr0 += 0.3 * r0 * xi0 * xi0 / co0;
            cpr1 += 0.3 * r1 * xi1 * xi0 / co1;
        }
        return this.getLineFor(psi0, cpr0, psi1, cpr1);    
    }

    /**
	 * @return the line connecting the two involutes with the end points adjusted to leave room for an arrowhead (etc.).
	 * The specified parameters give the distances of the new line's endpoints from the centers of the two involutes.
	 */  
	getAdjustedLineFor(r0: number, r1: number): CubicCurve {
        const [n0, n1] = this.involutes;
        const [x0, y0] = n0.getLocation();
        const [x1, y1] = n1.getLocation();
        const link = this.getLine();
        const [psi0, psi1] = this.findIncidenceAngles();
        const x0new = x0 + r0 * Math.cos(psi0);
        const y0new = y0 - r0 * Math.sin(psi0);
        const x1new = x1 + r1 * Math.cos(psi1);
        const y1new = y1 - r1 * Math.sin(psi1);
        return {
            x0: x0new, 
            y0: y0new, 
            x1: link.x1 + (x0new - link.x0), 
            y1: link.y1 + (y0new - link.y0), 
            x2: link.x2 + (x1new - link.x3), 
            y2: link.y2 + (y1new - link.y3), 
            x3: x1new, 
            y3: y1new 
        };
	}

    getAdjustedLine(): CubicCurve {
        const [r0, r1] = this.involutes.map(n => n.radius);
        return this.getAdjustedLineFor(r0 + this.gap0, r1 + this.gap1);
    }

    abstract getArrowheadPath(): Shape[];

    getConnector(id: string, yOffset: number, primaryColor: HSL): React.ReactNode {
        if (this.involutes.length !== 2) return null;

        const line = this.getAdjustedLine();
        const arrowheadPath = this.getArrowheadPath();
        const shapes = [line, ...arrowheadPath];

        const { minX, maxX, minY, maxY } = getBounds(shapes);
        const width = maxX - minX;
        const height = maxY - minY;
        if (isNaN(width) || isNaN(height)) {
            console.warn(`Illegal values in connector shapes: minX: ${minX}, maxX: ${maxX}, minY: ${minY}, maxY: ${maxY}.`);
            return null;
        }
        const lw = this.conLinewidth;
        const lwc = lw / 2; // linewidth correction
        const left = minX - lwc;
        const top = H + yOffset - maxY - lwc;
        
        const path = getPath(shapes, 
            (x: number) => x - minX + lwc, 
            (y: number) => height - y + minY + lwc
        ); 

        return (
            <div id={id}
                style={{
                    position: 'absolute',
                    left: `${left}px`,
                    top: `${top}px`,
                    pointerEvents: 'none'            
                }}>
                <svg width={width + 2 * lw} height={height + 2 * lw} xmlns="http://www.w3.org/2000/svg">
                <path d={path}  
                    fill='none'
                    stroke={`hsl(${primaryColor.hue},${primaryColor.sat}%,${primaryColor.lgt}%)`}
                    strokeWidth={lw}
                    strokeDasharray={this.conDash.join(' ')} 
                    strokeLinecap={LINECAP_STYLE}
                    strokeLinejoin={LINEJOIN_STYLE} />
                </svg>
            </div>
        );    
    }

    override getComponent({ id, yOffset, unitscale, displayFontFactor, bg, primaryColor, markColor0, markColor1, titleColor, focusItem, selection, preselection, 
        onMouseDown, onMouseEnter, onMouseLeave }: ENodeCompProps
    ) {
        return (
            <React.Fragment key={id}>
                {super.getComponent({
                    id, yOffset, unitscale, displayFontFactor, bg, primaryColor, markColor0, markColor1, titleColor, focusItem, selection, preselection, 
                    onMouseDown, onMouseEnter, onMouseLeave, 
                    hiddenByDefault: true, 
                    radiusWhenHidden: this.getHiddenRadius() 
                })}
                {this.getConnector(`${id}con`, yOffset, primaryColor)}
            </React.Fragment>
        );
    }
}

