import React from 'react'
import Item, { HSL, Range, Direction } from './Item'
import Node, { DEFAULT_DASH, MAX_DASH_VALUE, MAX_DASH_LENGTH, DEFAULT_LINEWIDTH, MAX_LINEWIDTH, LINECAP_STYLE, LINEJOIN_STYLE } from './Node'
import ENode, { Info, Handler, ENodeCompProps } from './ENode'
import { H } from '../MainPanel'
import CNodeGroup from '../CNodeGroup'
import { Entry } from '../ItemEditor'
import { DashValidator, validFloat, parseInputValue } from '../EditorComponents'
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
    ahLinewidth: number = DEFAULT_LINEWIDTH;
    ahLinewidth100: number = DEFAULT_LINEWIDTH
    ahDash: number[] = DEFAULT_DASH;
    ahDash100: number[] = DEFAULT_DASH;

    gap: number = DEFAULT_GAP;
    gap0: number = 0;
    gap1: number = 0;
    protected w0 = 0; // parameter controlling the length of the 'stiff part' at the beginning of the connector
	protected w1 = 0; // ditto for the end of the connector
	protected wc = 0; // ditto for the center of the connector
    protected rigidPoint = false;
    d0: number = 0; // the distances from the involutes to the corresponding control points of the connector
    d1: number = 0;
    phi0: number = 0; // the connector's incidence angles relative to the baseline angle
    phi1: number = 0;
    baseAngle: number = 0; // relevant if involutes[0]==involutes[1].
    manual = false; // indicates whether chi0 and chi1, or cpr0 and cpr1, have been selected manually.


    locationDefined: boolean = false; // indicates whether this.x and this.y give the actual location or need to be updated.
    t:number = 0.5; // the parameter that indicates the position of this Node on the connector between the two involutes.

    protected conDashValidator: DashValidator = new DashValidator(MAX_DASH_VALUE, MAX_DASH_LENGTH);
    protected ahDashValidator: DashValidator = new DashValidator(MAX_DASH_VALUE, MAX_DASH_LENGTH);

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
    abstract getArrowheadShapes(): Shape[];

    override getDefaultRadius() {
        return DEFAULT_RADIUS;
    }

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

    setConnectorLinewidth(lw: number) {
        this.conLinewidth = this.conLinewidth100 = lw;
    }

    setConnectorDash(dash: number[]) {
        this.conDash = this.conDash100 = dash;
    }

    setArrowheadLinewidth(lw: number) {
        this.ahLinewidth = this.ahLinewidth100 = lw;
    }

    setArrowheadDash(dash: number[]) {
        this.ahDash = this.ahDash100 = dash;
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

    getConnectorInfo(): Entry[] {
        return [
            {type: 'number input', key: 'conLw', text: 'Line width', width: 'medium', value: this.conLinewidth, step: 0.1},
            {type: 'string input', key: 'conDash', text: 'Stroke pattern', width: 'long', value: this.conDashValidator.write(this.conDash)},
            {type: 'button', key: 'lift', text: 'Lift Constraints', disabled: !this.manual, style: 'mt-2'}
        ];
    }

    getArrowheadInfo(): Entry[] {
        return [
            {type: 'number input', key: 'ahLw', text: 'Line width', width: 'medium', value: this.ahLinewidth, step: 0.1},
            {type: 'string input', key: 'ahDash', text: 'Stroke pattern', width: 'long', value: this.ahDashValidator.write(this.ahDash)},
        ];
    }

    override getInfo(list: (ENode | CNodeGroup)[]): Entry[] {
        const labelStyle = 'flex-0 mb-1';
        const border = 'mt-2 pt-2 border-t border-btnborder/50';
        const borderedLabelStyle = `${labelStyle} ${border}`;
        let ahInfo = this.getArrowheadInfo();
        if (ahInfo.length>0) {
            ahInfo = [
                {type: 'label', text: 'Arrowhead properties', style: borderedLabelStyle}, 
                ...ahInfo
            ];
        }
        return [
            {type: 'label', text: 'Line properties', style: labelStyle}, 
            ...this.getConnectorInfo(),
            ...ahInfo,
            {type: 'label', text: 'Node properties', style: borderedLabelStyle}, 
            ...this.getCommonInfo(list)
        ];
    }

    connectorEditHandler: Handler = {
        conLw: ({ e }: Info) => {
            if (e) return [(item, array) => {
                if (item instanceof SNode) item.setConnectorLinewidth(validFloat(e.target.value, 0, MAX_LINEWIDTH, 0)); 
                return array
            }, 'ENodesAndCNodeGroups']
        },
        conDash: ({ e }: Info) => {
            if (e) {
                const dash = this.conDashValidator.read(e.target);
                return [(item, array) => {
                    if (item instanceof SNode) item.setConnectorDash(dash);                    
                    return array
                }, 'ENodesAndCNodeGroups']
            }
        },
    }

    commonArrowheadEditHandler: Handler = {
        ahLw: ({ e }: Info) => {
            if (e) return [(item, array) => {
                if (item instanceof SNode) item.setArrowheadLinewidth(validFloat(e.target.value, 0, MAX_LINEWIDTH, 0)); 
                return array
            }, 'ENodesAndCNodeGroups']
        },
        ahDash: ({ e }: Info) => {
            if (e) {
                const dash = this.ahDashValidator.read(e.target);
                return [(item, array) => {
                    if (item instanceof SNode) item.setArrowheadDash(dash);                    
                    return array
                }, 'ENodesAndCNodeGroups']
            }
        },
    }

    /**
     * This is expected to be overridden by subclasses that require a more complex connector.
     */
    getConnectorEditHandler(): Handler {
        return this.connectorEditHandler;
    }

    /**
     * This is expected to be overridden by subclasses that use arrowheads.
     */
    getArrowheadEditHandler(): Handler {
        return {}; // We return the empty object because at least one subclass doesn't use arrow heads.
    }

    override handleEditing(
        e: React.ChangeEvent<HTMLInputElement> | null, 
        logIncrement: number, 
        selection: Item[],
        _unitscale: number,
        _displayFontFactor: number,
        key: string
    ): [(item: Item, list: (ENode | CNodeGroup)[]) => (ENode | CNodeGroup)[], applyTo: Range] {
        const conHandler = this.getConnectorEditHandler();
        const ahHandler = this.getArrowheadEditHandler();
        const handler = { 
            ...this.commonEditHandler, 
            ...conHandler, 
            ...ahHandler
        };
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

    findBaseAngle(): number {
        if (this.manual) {
            return this.baseAngle;
        }
        else {
            let [n0, n1] = this.involutes;
            const [x0, y0] = n0.getLocation();
            const [x1, y1] = n1.getLocation();
            const a = -angle(x0, y0, x1, y1, true);
            this.baseAngle = a;
            return a;
        } 
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

    getAdjustedLine() {
        const [r0, r1] = this.involutes.map(n => n.radius);
        return this.getAdjustedLineFor(r0 + this.gap0, r1 + this.gap1);
    }

    /**
     * This is expected to be overridden by subclasses that require a more complex connector.
     */
    getLineShapes(): Shape[] {
        return [this.getAdjustedLine()];
    }

    getConnector(id: string, yOffset: number, primaryColor: HSL): React.ReactNode {
        if (this.involutes.length !== 2) return null;

        const lineShapes = this.getLineShapes();
        const arrowheadShapes = this.getArrowheadShapes();

        const { minX, maxX, minY, maxY } = getBounds([...lineShapes, ...arrowheadShapes]);
        const width = maxX - minX;
        const height = maxY - minY;
        if (isNaN(width) || isNaN(height)) {
            console.warn(`Illegal values in connector shapes: minX: ${minX}, maxX: ${maxX}, minY: ${minY}, maxY: ${maxY}.`);
            return null;
        }
        const conLw = this.conLinewidth;
        const ahLw = this.ahLinewidth;
        const maxLw = Math.max(conLw, ahLw);
        const lwc =  maxLw / 2; // linewidth correction
        const left = minX - lwc;
        const top = H + yOffset - maxY - lwc;
        
        const xTransform = (x: number) => x - minX + lwc;
        const yTransform = (y: number) => height - y + minY + lwc;
        const linePath = getPath(lineShapes, xTransform, yTransform);
        const arrowheadPath = getPath(arrowheadShapes, xTransform, yTransform);

        return (
            <div id={id}
                style={{
                    position: 'absolute',
                    left: `${left}px`,
                    top: `${top}px`,
                    pointerEvents: 'none'            
                }}>
                <svg width={width + 2 * maxLw} height={height + 2 * maxLw} xmlns="http://www.w3.org/2000/svg">
                    <path d={linePath}  
                        fill='none'
                        stroke={`hsl(${primaryColor.hue},${primaryColor.sat}%,${primaryColor.lgt}%)`}
                        strokeWidth={conLw}
                        strokeDasharray={this.conDash.join(' ')} 
                        strokeLinecap={LINECAP_STYLE}
                        strokeLinejoin={LINEJOIN_STYLE} />
                    <path d={arrowheadPath}  
                        fill='none'
                        stroke={`hsl(${primaryColor.hue},${primaryColor.sat}%,${primaryColor.lgt}%)`}
                        strokeWidth={ahLw}
                        strokeDasharray={this.ahDash.join(' ')} 
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

