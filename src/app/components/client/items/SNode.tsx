import React from 'react'
import Item, { HSL, Range } from './Item'
import Node, { DEFAULT_DISTANCE, MIN_DISTANCE, MAX_DISTANCE, DEFAULT_DASH, MAX_DASH_VALUE, MAX_DASH_LENGTH, DEFAULT_LINEWIDTH,
     MAX_LINEWIDTH, LINECAP_STYLE, LINEJOIN_STYLE, validateLinewidth, validateDash, validateShading, validateRadius } from './Node'
import ENode, { Info, Handler, ENodeCompProps } from './ENode'
import { H, MIN_TRANSLATION_LOG_INCREMENT, ROUNDING_DIGITS } from '../../../Constants'
import CNodeGroup from '../CNodeGroup'
import CNode from './CNode'
import { Entry, MAX_ROTATION_INPUT, MIN_ROTATION } from '../ItemEditor'
import { DashValidator, validFloat, parseInputValue, parseCyclicInputValue } from '../EditorComponents'
import { Shape, round, getBounds, getPath, angle, angleDiff, CubicCurve, cubicBezier, closestTo, getCyclicValue } from '../../../util/MathTools'
import * as Texdraw from '../../../codec/Texdraw'
import { ParseError, makeParseError } from '../../../codec/Texdraw'
import { encode, decode } from '../../../codec/General'

export const DEFAULT_RADIUS = 5
export const DEFAULT_GAP0 = 0;
export const DEFAULT_GAP1 = .4;
export const MIN_GAP = -999
export const MAX_GAP = 999
export const MIN_HIDDEN_RADIUS = 12;
export const MAX_HIDDEN_RADIUS = 36;
export const MIN_EFFECTIVE_RADIUS = 8; // used for calculating the distances of the control points of connectors to the centers of the corresponding nodes


export const validateGap = (gap: number, name: string): number => {
    if (gap < MIN_GAP) {
        throw new ParseError(<span>Illegal data in definition of state node <code>{name}</code>: gap {gap} below minimum value.</span>); 
    }
    else if (gap > MAX_GAP) {
        throw new ParseError(<span>Illegal data in definition of state node <code>{name}</code>: gap {gap} exceeds maximum value.</span>); 
    }
    return gap;
}

export const validateT = (t: number, name: string): number => {
    if (t < 0) {
        throw new ParseError(<span>Illegal data in definition of state node <code>{name}</code>: {t} below minimum {' '}
            <span className='whitespace-nowrap'>t-value</span>.</span>
        ); 
    }
    else if (t > 1) {
        throw new ParseError(<span>Illegal data in definition of state node <code>{name}</code>: {t} exceeds maximum {' '}
            <span className='whitespace-nowrap'>t-value</span>.</span>
        );  
    }
    return t;
}

export const validateDistance = (d: number, name: string): number => {
    if (d < MIN_DISTANCE) {
        throw new ParseError(<span>Illegal data in definition of state node <code>{name}</code>: distance {d} below minimum value.</span>); 
    }
    else if (d > MAX_DISTANCE) {
        throw new ParseError(<span>Illegal data in definition of state node <code>{name}</code>: distance {d} exceeds maximum value.</span>); 
    }
    return d;
}

/**
 * A convenience function for use by subclasses.
 */
export const complain = (nodeName: string): React.ReactNode => {
    return (
        <>Incompatible <i>texdraw</i> code for node <code>{nodeName}</code></>
    );
}

/**
 * SNodes are 'state nodes': they represent states, in particular instantiations of dyadic relations, by lines and arrows on the canvas.
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

    gap0: number = DEFAULT_GAP0;
    gap1: number = DEFAULT_GAP1;
    protected w0 = 0; // parameter controlling the length of the 'stiff part' at the beginning of the connector
	protected w1 = 0; // ditto for the end of the connector
	protected wc = 0; // ditto for the center of the connector
    protected rigidPoint = false;
    d0: number = DEFAULT_DISTANCE; // the distances from the involutes to the corresponding control points of the connector
    d1: number = DEFAULT_DISTANCE;
    phi0: number = 0; // the connector's incidence angles (in degrees) relative to the baseline angle
    phi1: number = 0;
    manual = false; // indicates whether chi0 and chi1, or cpr0 and cpr1, have been selected manually.
    closest = false; // indicates whether the connector should link to the closest CNode of the relevant CNodeGroup (relevant if either involute is a CNode)

    t:number = 0.5; // the parameter that indicates the position of this Node on the connector between the two involutes.

    protected conDashValidator: DashValidator = new DashValidator(MAX_DASH_VALUE, MAX_DASH_LENGTH);
    protected ahDashValidator: DashValidator = new DashValidator(MAX_DASH_VALUE, MAX_DASH_LENGTH);

    constructor(i: number) {
        super(i, 0, 0); // We invoke the super constructor with coordinates (0,0). The actual location of this Node is given by getLocation().
        this.radius = this.radius100 = DEFAULT_RADIUS;
        this.w0 = this.getDefaultW0();
	    this.w1 = this.getDefaultW1();
	    this.wc = this.getDefaultWC();
        this.rigidPoint = this.hasByDefaultRigidPoint();
    }

    override isIndependent() {
        return false;
    }
    
    override getString() {
        return `${this.id}(S)`;
    }

    init(involutes: Node[]) {
        this.involutes = involutes;
        for (const node of involutes) {
            node.dependentNodes = [...node.dependentNodes, this];
        }
    }

    abstract getDefaultW0(): number;
    abstract getDefaultW1(): number;
    abstract getDefaultWC(): number;


    override isHidden(selected: boolean) {
        return !selected && 
            this.shading===0 && 
            this.dash.length===0 && 
            this.ornaments.length===0 && 
            this.dependentNodes.length===0;
    }

    override getDefaultRadius() {
        return DEFAULT_RADIUS;
    }

    override getHiddenRadius(): number {
        const [n0, n1] = this.involutes; 
        const [x0, y0] = n0.getLocation();
        const [x1, y1] = n1.getLocation();
        const [r0, r1] = this.involutes.map(n => n.radius);
        const d = Math.sqrt((x1 - x0)**2 + (y1 - y0)**2);
        const d1 = Math.floor((this.w0 + this.w1 + this.wc) / 2);
        const d2 = Math.floor(Math.sqrt(Math.max(0, 3 * (d - r0 - r1))));
        const hr = Math.min(MAX_HIDDEN_RADIUS, 
            Math.max(MIN_HIDDEN_RADIUS, d1, d2)
        );
        //console.log(` d: ${d} d1: ${d1)}, d2: ${d2} hr: ${hr}`);
        return hr;
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
            if (this.closest) { // Determine the relevant closest node(s) and make it/them the new involute(s).
                const [n0, n1] = this.involutes;
                if (n0 instanceof CNode) {
                    const cng0 = n0.group as CNodeGroup;
                    if (n1 instanceof CNode) {
                        let [cn0, cn1] = [n0, n1];
                        let dmin = Infinity;
                        const cng1 = n1.group as CNodeGroup;
                        for (const node of cng0.members) {
                            const [x0, y0] = [node.x, node.y];
                            const cn = cng1.getClosestNode(node);
                            if (cn) {
                                const [x1, y1] = [cn.x, cn.y];
                                const d = Math.sqrt((x1 - x0)**2 + (y1 - y0)**2);
                                if (d < dmin) {
                                    dmin = d;
                                    cn0 = node;
                                    cn1 = cn;
                                }
                            }
                        }
                        this.involutes = [cn0, cn1];
                    }
                    else {
                        const cn0 = cng0.getClosestNode(n1);
                        if (cn0) {
                            this.involutes = [cn0, n1];
                        }
                    }
                }
                else if (n1 instanceof CNode) {
                    const cng1 = n1.group as CNodeGroup;
                    const cn1 = cng1.getClosestNode(n0);
                    if (cn1) {
                        this.involutes = [n0, cn1];
                    }
                }
                // Update the 'dependentNodes' arrays of the previous involutes, if there has been a change:
                for (const [old, cn] of [[n0, this.involutes[0]], [n1, this.involutes[1]]]) {
                    if (old !== cn) {
                        const prevNodes = old.dependentNodes;
                        const newNodes = cn.dependentNodes;
                        old.dependentNodes = prevNodes.filter(node => node===this);
                        if (!newNodes.includes(this)) {
                            cn.dependentNodes = [...newNodes, this];
                        }
                    }                    
                }
            }
            const line = this.getLine();
            const loc =  cubicBezier(line, this.t);
            [this.x, this.y] = loc;
            // No need to do anything about this.x100 and this.y100, since location is entirely determined by the locations of the involutes.
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
        // No need to do anything about this.x100 and this.y100, since location is entirely determined by the locations of the involutes.
        this.invalidateDepNodeLocations();
    }
    
    /**
     * This function is supposed to be called as a result of user input.
     */
    adjustIncidenceAngle(k: number, delta: number): void {
        const a = getCyclicValue((k===0? this.phi0: this.phi1) + delta, MIN_ROTATION, 360, 10 ** ROUNDING_DIGITS);
        if (k===0) {
            this.phi0 = a;
        }
        else {
            this.phi1 = a;
        }
        this.manual = true;
        this.locationDefined = false;
        this.invalidateDepNodeLocations();
    }

    /**
     * This function is supposed to be called as a result of user input.
     */
    adjustControlPointDistance(k: number, delta: number): void {
        const d = round((k===0? this.d0: this.d1) + delta, ROUNDING_DIGITS);
        if (k===0) {
            this.d0 = d;
        }
        else {
            this.d1 = d;
        }
        this.manual = true;
        this.locationDefined = false;
        this.invalidateDepNodeLocations();
    }

    /**
     * This function is supposed to be called as a result of user input.
     */
    adjustGap(k: number, delta: number): void {
        const d = round((k===0? this.gap0: this.gap1) + delta, ROUNDING_DIGITS);
        if (k===0) {
            this.gap0 = d;
        }
        else {
            this.gap1 = d;
        }
        this.locationDefined = false;
        this.invalidateDepNodeLocations();
    }

    /**
     * Expected to be overridden by subclasses.
     */
    getConnectorInfo(): Entry[] {
        const [n0, n1] = this.involutes;
        let checkBoxInfo: Entry[] = [];
        let tooltipExtension: React.ReactNode = '';
        if (n0 instanceof CNode || n1 instanceof CNode) {
            if (n0 instanceof CNode) {
                if (n1 instanceof CNode) {
                    tooltipExtension = <>the connector&rsquo;s end points switch to whichever nodes of the corresponding contour node groups {' '}
                        are closest together.</>;
                }
                else {
                    tooltipExtension = <>the connector&rsquo;s starting point switches to whichever node of the source node&rsquo;s contour node {' '}
                        group is closest to the target node.</>;
                }
            }
            else {
                tooltipExtension = <>the connector&rsquo;s end point switches to whichever node of the target node&rsquo;s contour node group {' '}
                    is closest to the source node.</>;
            }
            checkBoxInfo =  [
                {type: 'checkbox', key: 'closest', text: 'Switch to closest contour node', value: this.closest, extraBottomMargin: true,
                    tooltip: <>When either of the two connected nodes is moved, {tooltipExtension}</>,
                    tooltipPlacement: 'left'
                }
            ];
        }
        return [
            {type: 'number input', key: 'conLw', text: 'Line width', width: 'medium', value: this.conLinewidth, step: 0.1},
            {type: 'string input', key: 'conDash', text: 'Stroke pattern', width: 'long', value: this.conDashValidator.write(this.conDash), 
                extraBottomMargin: true
            },
            ...checkBoxInfo,
            {type: 'number input', key: 'phi0', text: 'Angle 1', width: 'long', value: this.phi0, step: 0, 
                min: -MAX_ROTATION_INPUT, max: MAX_ROTATION_INPUT,
                tooltip: <>The angle (in degrees) by which a straight line from the center of the connector&rsquo;s source node to its first {' '}
                control point would deviate from a straight line between the centers of the two nodes.</>,
                tooltipPlacement: 'left'
            },
            {type: 'number input', key: 'd0', text: 'Distance 1', width: 'long', value: this.d0, step: 0,
                tooltip: <>The distance from the connector&rsquo;s starting point to its first control point.</>,
                tooltipPlacement: 'left'
            },
            {type: 'number input', key: 'gap0', text: 'Gap 1', width: 'medium', value: this.gap0, step: 0,
                tooltip: <>The gap between the connector&rsquo;s source node and its starting point.</>,
                tooltipPlacement: 'left'
            },
            {type: 'number input', key: 'phi1', text: 'Angle 2', width: 'long', value: this.phi1, step: 0, 
                min: -MAX_ROTATION_INPUT, max: MAX_ROTATION_INPUT,
                tooltip: <>The angle (in degrees) by which a straight line from the center of the connector&rsquo;s target node to its second {' '}
                control point would deviate from a straight line between the centers of the two nodes.</>,
                tooltipPlacement: 'left'
            },
            {type: 'number input', key: 'd1', text: 'Distance 2', width: 'long', value: this.d1, step: 0,
                tooltip: <>The distance from the connector&rsquo;s second control point to its end point.</>,
                tooltipPlacement: 'left'
            },
            {type: 'number input', key: 'gap1', text: 'Gap 2', width: 'medium', value: this.gap1, step: 0,
                tooltip: <>The gap between the connector&rsquo;s end point and its target node.</>,
                tooltipPlacement: 'left'
            },
            {type: 'logIncrement', extraBottomMargin: false},
            {type: 'button', key: 'lift', text: 'Lift Constraints', disabled: !this.manual, style: 'mt-2'}
        ];
    }

    /**
     * Expected to be overridden by subclasses.
     */
    getArrowheadInfo(): Entry[] {
        return [
            {type: 'number input', key: 'ahLw', text: 'Line width', width: 'medium', value: this.ahLinewidth, step: 0.1},
            {type: 'string input', key: 'ahDash', text: 'Stroke pattern', width: 'long', value: this.ahDashValidator.write(this.ahDash)},
        ];
    }

    override getInfo(list: (ENode | CNodeGroup)[]): Entry[] {
        const labelStyle = 'flex-0 mb-1 pb-4';
        const border = 'mt-4 pt-3 border-t border-btnborder/50';
        const borderedLabelStyle = `${labelStyle} ${border}`;
        let ahInfo = this.getArrowheadInfo();
        if (ahInfo.length > 0) {
            ahInfo = [
                {type: 'label', text: 'Arrowhead properties', style: borderedLabelStyle}, 
                ...ahInfo
            ];
        }
        return [
            {type: 'label', text: 'Connector properties', style: labelStyle}, 
            ...this.getConnectorInfo(),
            ...ahInfo,
            {type: 'label', text: 'Node properties', style: borderedLabelStyle}, 
            ...this.getNodeInfo(list),
            {type: 'label', text: '', style: 'flex-0'} // a filler, to ensure an appropriate bottom margin
        ];
    }

    connectorEditHandler: Handler = {
        conLw: ({ e }: Info) => {
            if (e) return [(item, array) => {
                if (item instanceof SNode) item.setConnectorLinewidth(validFloat(e.target.value, 0, MAX_LINEWIDTH, 0)); 
                return array
            }, 'ENodesAndCNodeGroups'];
        },
        conDash: ({ e }: Info) => {
            if (e) {
                const dash = this.conDashValidator.read(e.target);
                return [(item, array) => {
                    if (item instanceof SNode) item.setConnectorDash(dash);                    
                    return array
                }, 'ENodesAndCNodeGroups'];
            }
        },
        closest: ({}: Info) => {
            const closest = !this.closest;
            return [(item, array) => {
                if (item instanceof SNode) {
                    item.closest = closest;
                    item.locationDefined = false;
                    item.invalidateDepNodeLocations();
                }
                return array;
            }, 'ENodesAndCNodeGroups'];
        },
        gap0: ({ e, logIncrement }: Info) => {
            if (e) {
                const d = parseInputValue(e.target.value, MIN_DISTANCE, MAX_DISTANCE, this.gap0, 
                    logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.gap0;
                return [(item, array) => {
                    if (!isNaN(d) && d!==0 && item instanceof SNode) {
                        item.adjustGap(0, d);   
                    }
                    return array
                }, 'ENodesAndCNodeGroups'];
            }
        },
        phi0: ({ e, logIncrement }: Info) => {
            if (e) {
                const delta = parseCyclicInputValue(e.target.value, this.phi0, logIncrement)[1]; 
                return [(item, array) => {
                    if(!isNaN(delta) && delta!==0 && item instanceof SNode) {
                        item.adjustIncidenceAngle(0, delta);
                    }
                    return array
                }, 'ENodesAndCNodeGroups'];
        }},
        d0: ({ e, logIncrement }: Info) => {
            if (e) {
                const d = parseInputValue(e.target.value, MIN_DISTANCE, MAX_DISTANCE, this.d0, 
                    logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.d0;
                return [(item, array) => {
                    if (!isNaN(d) && d!==0 && item instanceof SNode) {
                        item.adjustControlPointDistance(0, d);   
                    }
                    return array
                }, 'ENodesAndCNodeGroups'];
            }
        },
        gap1: ({ e, logIncrement }: Info) => {
            if (e) {
                const d = parseInputValue(e.target.value, MIN_DISTANCE, MAX_DISTANCE, this.gap1, 
                    logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.gap1;
                return [(item, array) => {
                    if (!isNaN(d) && d!==0 && item instanceof SNode) {
                        item.adjustGap(1, d);   
                    }
                    return array
                }, 'ENodesAndCNodeGroups'];
            }
        },
        phi1: ({ e, logIncrement }: Info) => {
            if (e) {
                const delta = parseCyclicInputValue(e.target.value, this.phi1, logIncrement)[1]; 
                return [(item, array) => {
                    if(!isNaN(delta) && delta!==0 && item instanceof SNode) {
                        item.adjustIncidenceAngle(1, delta);
                    }
                    return array
                }, 'ENodesAndCNodeGroups'];
        }},
        d1: ({ e, logIncrement }: Info) => {
            if (e) {
                const d = parseInputValue(e.target.value, MIN_DISTANCE, MAX_DISTANCE, this.d1, 
                    logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.d1;
                return [(item, array) => {
                    if (!isNaN(d) && d!==0 && item instanceof SNode) {
                        item.adjustControlPointDistance(1, d);   
                    }
                    return array
                }, 'ENodesAndCNodeGroups'];
            }
        },
        lift: ({}: Info) => [(item, array) => {
            if (item instanceof SNode) {
                item.manual = false;
                this.locationDefined = false;
                this.invalidateDepNodeLocations();        
            }
            return array;
        }, 'wholeSelection']
    }

    commonArrowheadEditHandler: Handler = {
        ahLw: ({ e }: Info) => {
            if (e) return [(item, array) => {
                if (item instanceof SNode) item.setArrowheadLinewidth(validFloat(e.target.value, 0, MAX_LINEWIDTH, 0)); 
                return array
            }, 'ENodesAndCNodeGroups'];
        },
        ahDash: ({ e }: Info) => {
            if (e) {
                const dash = this.ahDashValidator.read(e.target);
                return [(item, array) => {
                    if (item instanceof SNode) item.setArrowheadDash(dash);                    
                    return array
                }, 'ENodesAndCNodeGroups'];
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
        _unitScale: number,
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

    nodeIsDisplayed() {        
        return !this.isHidden(false) && (this.linewidth > 0 || this.shading > 0); // For the purposes of generating the texdraw code, we're assuming that this
        // SNode is not selected, even if this means that it will not be represented in the code.
    }

    /**
     * Overridden by (but also called frmo) subclasses.
     */
    override getInfoString(): string {
        const nodeDisplayed = this.nodeIsDisplayed();
        const undrawnNodeInfo = nodeDisplayed? []: [this.radius, this.linewidth];
        const otherInfo = [
            this.t,
            this.gap0,
            this.gap1,
            this.closest? 1: 0
        ];
        const connectorInfo = this.manual? [this.phi0, this.d0, this.phi1, this.d1]: [];
        return [...undrawnNodeInfo, ...otherInfo, ...connectorInfo].map(encode).join(' ');
    }

    override getTexdrawCode(): string {
        const conShapes = this.getConnectorShapes();
        const ahShapes = this.getArrowheadShapes();
        const nodeDisplayed = this.nodeIsDisplayed(); 
        const connectorCode = Texdraw.getCommandSequenceForDrawnShapes(
            Texdraw.translateShapes(conShapes), 
            this.conLinewidth, 
            this.conDash,
            undefined, 
            undefined,
            this.ahDash
        );
        const ahCode = Texdraw.getCommandSequenceForDrawnShapes(
            Texdraw.translateShapes(ahShapes), 
            this.ahLinewidth, 
            this.ahDash,
            this.conLinewidth,
            this.conDash,
            this.dash
        );    
        const nodeCode = nodeDisplayed? super.getTexdrawCode(): '';
        return [
            connectorCode,
            ahCode,
            nodeCode
        ].join('');
    }


    override extractCircles(stShapes: Texdraw.StrokedShape[], tex: string) {
        const circles: Texdraw.Circle[] = [];
        for (let i = 0; i < Math.min(2, stShapes.length) && stShapes[i].shape instanceof Texdraw.Circle; i++) { 
            // We tolerate there being more than two shapes, since there may also be shapes for a connector and arrowhead.
            circles.push(stShapes[i].shape as Texdraw.Circle);
	    }
        return circles;
    }

    /**
     * An empty method, which gets called from ENode.parseNode() conditionally on there being no circles in the stroked shapes. It's empty
     * because, unlike ENode.parse(), SNode.parse() has to parse the info string in *every* case -- which is done in parseInfoString() below.
     */
    override parseNodeInfoString(_tex: string, _info: string | null, _dimRatio: number, _name: string): void {
    }

    parseInfoString(info: string, dimRatio: number, nodeDrawn: boolean, name: string): void {
        let vals = info.split(/\s+/).map(s => {
            const val = decode(s);
            if(!isFinite(val)) {
                throw makeParseError('Unexpected token in entity node configuration string', s);
            }
            return val;
        });
        if (!nodeDrawn) {
            const [radRaw, lwRaw] = vals.slice(0,2);
            this.radius = validateRadius(radRaw * dimRatio, name);
            this.linewidth = this.linewidth100 = validateLinewidth(lwRaw * dimRatio, name);
            vals = vals.slice(2);
        }
        let i = 0;
        this.t = validateT(vals[i++], name);
        this.gap0 = validateGap(vals[i++], name);
        this.gap1 = validateGap(vals[i++], name);
        this.closest = vals[i++]===1;
        this.manual = vals.length > i;
        if (this.manual) {
            this.phi0 = vals[i++];
            this.d0 = validateDistance(vals[i++], name);
            this.phi1 = vals[i++];
            this.d1 = validateDistance(vals[i++], name);
        }
    }

    /**
     * Extracts connector-related information from the supplied array of StrokedShapes.
     * Returns a shortened array that may still contain arrowhead shapes.
     * 
     * Expected to be overridden by subclasses that use a connector that is more complex than a single CubicCurve.
    */
    parseConnector(stShapes: Texdraw.StrokedShape[], dimRatio: number, nodeName: string): [Texdraw.StrokedShape[], number, number] {
        if (stShapes.length===0 || !(stShapes[0].shape instanceof Texdraw.CubicCurve)) {
            throw new ParseError(<span>Failed parsing information for entity node <code>{nodeName}</code>: connector missing.</span>);
        }
        const stroke = stShapes[0].stroke;
        const cp = (stShapes[0].shape as Texdraw.CubicCurve).p1a;
        this.conLinewidth = validateLinewidth(dimRatio * stroke.linewidth, nodeName);
        this.conDash = validateDash(stroke.pattern.map(v => dimRatio * v), nodeName);
        return [stShapes.slice(1), cp.x, cp.y];
    } 

    /**
     * Overridden (and used) by subclasses. Provides the rudimentary functionality of setting the SNode's ahLinewidth and ahDash, based on the 
     * supplied arguments.
     * @return the supplied array of Texdraw.StrokedShapes minus the first shape.
     */
    parseArrowhead(stShapes: Texdraw.StrokedShape[], cpx: number, cpy: number, dimRatio: number, nodeName: string): Texdraw.StrokedShape[]  {
        if (stShapes.length===0) {
            throw new ParseError(<span>Failed parsing information for entity node <code>{nodeName}</code>: arrowhead missing.</span>);
        }
        const stroke = stShapes[0].stroke;
        this.ahLinewidth = validateLinewidth(dimRatio * stroke.linewidth, nodeName);
        this.ahDash = validateDash(stroke.pattern.map(v => dimRatio * v), nodeName);
        return stShapes.slice(1);
    }

    override parse(tex: string, info: string | null, dimRatio: number, _unitScale?: number, _displayFontFactor?: number, name?: string): void {
        const stShapes = Texdraw.getStrokedShapes(tex, DEFAULT_LINEWIDTH);
        //console.log(`stroked shapes: ${stShapes.map(sh => sh.toString()).join()}`);

        const nodeName = name ?? 'unnamed';
        const [remainder0, x, y] = this.parseConnector(stShapes, dimRatio, nodeName);
        const remainder1 = this.parseArrowhead(remainder0, x, y, dimRatio, nodeName);
        this.parseNode(remainder1, tex, info, dimRatio, nodeName);

        if (!info) {
            throw new ParseError(<span>Missing information: empty info string.</span>);
        }
        this.parseInfoString(
            info, 
            dimRatio, 
            stShapes.length > 0 && stShapes[stShapes.length - 1].shape instanceof Texdraw.Circle, 
            nodeName
        );
    }    


    findBaseAngle(): number {
        let [n0, n1] = this.involutes;
        const [x0, y0] = n0.getLocation();
        const [x1, y1] = n1.getLocation();
        const a = angle(x0, y0, x1, y1, true);
        return a;
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
        let chi0 = baseAngle + Math.acos(Math.max(-0.5, (r0 - discr) / r0));
        let chi1 = baseAngle + Math.PI - Math.acos(Math.max(-0.5, (r1 - discr) / r1));
        if(this.flexDirection==='clockwise') {
        	chi0 = 2*baseAngle - chi0;
        	chi1 = 2*baseAngle - chi1;
        }        
        return [chi0, chi1];
	}

    // This needs more work; currently we're ignoring whether multiple connectors hit a node at the same spot.
    findIncidenceAngles(): [psi0: number, psi1: number] {
        const base = this.findBaseAngle();
        if (this.manual) {
            const phi0 = this.phi0 / 180 * Math.PI;
            const phi1 = this.phi1 / 180 * Math.PI;
            return [base + phi0, base + Math.PI - phi1];
        }
        else {
            const [chi0, chi1] = this.findPreferredAngles();
            const factor = 10 ** ROUNDING_DIGITS;
            this.phi0 = round(Math.round(angleDiff(base, chi0) / Math.PI * 180 * factor) / factor, ROUNDING_DIGITS);
            this.phi1 = round(Math.round(angleDiff(chi1, base + Math.PI) / Math.PI * 180 * factor) / factor, ROUNDING_DIGITS);
            return [chi0, chi1];
        }
    }

    getLineFor(psi0: number, cpr0: number, psi1: number, cpr1: number): CubicCurve {
        const [n0, n1] = this.involutes;
        const [x0, y0] = n0.getLocation();
        const [x1, y1] = n1.getLocation();
        let [r0, r1] = this.involutes.map(n => n.radius);
        
        r0 += this.gap0;
        r1 += this.gap1;

        return {
            x0: x0 + r0 * Math.cos(psi0), 
            y0: y0 + r0 * Math.sin(psi0), 
            x1: x0 + cpr0 * Math.cos(psi0), 
            y1: y0 + cpr0 * Math.sin(psi0), 
            x2: x1 + cpr1 * Math.cos(psi1), 
            y2: y1 + cpr1 * Math.sin(psi1), 
            x3: x1 + r1 * Math.cos(psi1), 
            y3: y1 + r1 * Math.sin(psi1)
        }
    }

    getLine(): CubicCurve {
        const [r0, r1] = this.involutes.map(n => Math.max(MIN_EFFECTIVE_RADIUS, n.radius));
        const [psi0, psi1] = this.findIncidenceAngles();
        const baseAngle = this.findBaseAngle();

        let cpr0, cpr1;
        if (this.manual) {
            cpr0 = r0 + this.gap0 + this.d0;
            cpr1 = r1 + this.gap1 + this.d1;
        }
        else {
            cpr0 = r0 + this.w0 + this.gap0;
            cpr1 = r1 + this.w1 + this.gap1;
            const xi0 = Math.min(angleDiff(baseAngle, psi0), angleDiff(psi0, baseAngle));
            const xi1 = Math.min(angleDiff(baseAngle + Math.PI, psi1), angleDiff(psi1, baseAngle + Math.PI));
            if (Math.abs(xi0) + Math.abs(xi1) > 0.1) {
                const co0 = Math.min(1, 1 + Math.cos(xi0)); // These factors are needed to reduce the cprs when the exit vectors are pointing towards each other.
                const co1 = Math.min(1, 1 + Math.cos(xi1));
                cpr0 += 0.3 * r0 * xi0 * xi0 / co0;
                cpr1 += 0.3 * r1 * xi1 * xi1 / co1;
            }
            const factor = 10 ** ROUNDING_DIGITS;
            this.d0 = round(Math.round((cpr0 - this.gap0 - r0) * factor) / factor, ROUNDING_DIGITS);
            this.d1 = round(Math.round((cpr1 - this.gap1 - r1) * factor) / factor, ROUNDING_DIGITS);
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
        const y0new = y0 + r0 * Math.sin(psi0);
        const x1new = x1 + r1 * Math.cos(psi1);
        const y1new = y1 + r1 * Math.sin(psi1);
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

    /**
     * This is expected to be overridden by subclasses (like Transition) that have a connector that does not run through the arrowhead.
     */
    getAdjustedLine() {
        return this.getLine();
    }

    /**
     * This is expected to be overridden by subclasses that require a more complex connector.
     */
    getConnectorShapes(): Shape[] {
        return [this.getAdjustedLine()];
    }

    /**
     * This is expected to be overridden by subclasses that use an arrowhead.
     */
    getArrowheadShapes(): Shape[] {
        return [];
    }

    getConnectorComponent(id: string, yOffset: number, primaryColor: HSL): React.ReactNode {
        if (this.involutes.length !== 2) return null;

        const conShapes = this.getConnectorShapes();
        const ahShapes = this.getArrowheadShapes();

        const { minX, maxX, minY, maxY } = getBounds([...conShapes, ...ahShapes]);
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
        const conPath = getPath(conShapes, xTransform, yTransform);
        const ahPath = getPath(ahShapes, xTransform, yTransform);

        return (
            <div id={id}
                style={{
                    position: 'absolute',
                    left: `${left}px`,
                    top: `${top}px`,
                    pointerEvents: 'none'            
                }}>
                <svg width={width + 2 * maxLw} height={height + 2 * maxLw} xmlns="http://www.w3.org/2000/svg">
                    <path d={conPath}  
                        fill='none'
                        stroke={`hsl(${primaryColor.hue},${primaryColor.sat}%,${primaryColor.lgt}%)`}
                        strokeWidth={conLw}
                        strokeDasharray={this.conDash.join(' ')} 
                        strokeLinecap={LINECAP_STYLE}
                        strokeLinejoin={LINEJOIN_STYLE} />
                    <path d={ahPath}  
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

    override getComponent({ id, yOffset, unitScale, displayFontFactor, bg, primaryColor, markColor0, markColor1, 
        titleColor, focusItem, selection, preselection, 
        onMouseDown, onMouseEnter, onMouseLeave }: ENodeCompProps
    ) {
        return (
            <React.Fragment key={id}>
                {this.getConnectorComponent(`${id}con`, yOffset, primaryColor)}
                {super.getComponent({
                    id, yOffset, unitScale, displayFontFactor, bg, primaryColor, markColor0, markColor1, titleColor, focusItem, 
                    selection, preselection, onMouseDown, onMouseEnter, onMouseLeave
                })}
            </React.Fragment>
        );
    }
}

