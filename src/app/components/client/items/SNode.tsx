import React from 'react'
import Item, { HSL, Range } from './Item'
import Node, { DEFAULT_DASH, DEFAULT_LINEWIDTH, LINECAP_STYLE, LINEJOIN_STYLE  } from './Node'
import ENode, { ENodeCompProps } from './ENode'
import { H } from '../MainPanel'
import CNodeGroup from '../CNodeGroup'
import { Entry } from '../ItemEditor'
import { angle, angleDiff, CubicCurve } from '../../../util/MathTools'

export const DEFAULT_RADIUS = 5


/**
 * SNodes are 'state nodes': they represent states, typically relationships between other entities, by lines and arrows on the canvas.
 * This class roughly corresponds to the Connector class of the 2007 applet.
 */
export default class SNode extends ENode {

    involutes: Node[] = [];
    conLinewidth: number = DEFAULT_LINEWIDTH
    conLinewidth100: number = DEFAULT_LINEWIDTH
    conDash: number[] = DEFAULT_DASH;
    conDash100: number[] = DEFAULT_DASH;

    gap0: number = 0;
    gap1: number = 0;
    protected w0 = 0; // parameter controlling the length of the 'stiff part' at the beginning of the connector
	protected w1 = 0; // ditto for the end of the connector
	protected wc = 0; // ditto for the center of the connector
    cpr0: number = 0; // the control point radii
    cpr1: number = 0;
    baseAngle: number = 0;
    phi0: number = 0; // the user-defined angles of the connector's contacts relative to the baseline angle
    phi1: number = 0;
    chi0: number = 0; // the preferred absolute angles
    chi1: number = 0; 
    psi0: number = 0; // the actual (as opposed to preferred) absolute angles
    psi1: number = 0;
    manualBaseAngle: boolean = false; // relevant if involutes[0]==involutes[1]: chi0 and chi1 have been selected manually 
	manualCPR: boolean = false; // the CPRs have been selected manually (and so should not be changed automatically)
    adjustedLine: CubicCurve | null = null;
    adjustedLineD: CubicCurve | null = null; // for display on screen
    line: CubicCurve | null = null;

    constructor(i: number) {
        super(i, 0, 0);
        this.radius = this.radius100 = DEFAULT_RADIUS;
    }


    init(involutes: Node[]) {
        this.involutes = involutes;
    }

    override getPosition() {
        if (this.involutes.length<2) {
            return [0, 0];
        }
        else {
            const [x0, y0] = this.involutes[0].getPosition();
            const [x1, y1] = this.involutes[1].getPosition();
            return [(x0 + x1) / 2, (y0 + y1) / 2];
        }
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

    override getComp({ id, yOffset, unitscale, displayFontFactor, bg, primaryColor, markColor0, markColor1, titleColor, focusItem, selection, preselection, 
            onMouseDown, onMouseEnter, onMouseLeave, hidden }: ENodeCompProps
    ) {
        const sup = super.getComp( {id, yOffset, unitscale, displayFontFactor, bg, primaryColor, markColor0, markColor1, titleColor, focusItem, selection, preselection, 
            onMouseDown, onMouseEnter, onMouseLeave, hidden });
        return (
            <React.Fragment key={id}>
                {sup}
                {this.getConnector({ id: `${id}arrow`, yOffset: yOffset, primaryColor: primaryColor})}
            </React.Fragment>
        );
    }

    getConnector({ id, yOffset, primaryColor }: ConnectorProps) {
        if (this.involutes.length !== 2) return null;
        const [n0, n1] = this.involutes;
        const [x0, y0] = n0.getPosition();
        const [x1, y1] = n1.getPosition();
        
        const lw = this.conLinewidth;
        const left = Math.min(x0, x1) - lw;
        const top = H + yOffset - Math.max(y0, y1) - lw;
        const width = Math.abs(x1 - x0);
        const height = Math.abs(y1 - y0);
    
        return (
            <div id={id}
                style={{
                    position: 'absolute',
                    left: left,
                    top: top,
                    pointerEvents: 'none'            
                }}>
                <svg width={width + 2 * lw} height={height + 2 * lw} xmlns="http://www.w3.org/2000/svg">
                    <line 
                    x1={(x0 <= x1? 0: width) + lw} 
                    y1={(y0 <= y1? height: 0) + lw} 
                    x2={(x0 <= x1? width: 0) + lw} 
                    y2={(y0 <= y1? 0: height) + lw} 
                    stroke={`hsl(${primaryColor.hue},${primaryColor.sat}%,${primaryColor.lgt}%`}
                    strokeWidth={lw}
                    strokeDasharray={this.conDash.join(' ')} 
                    strokeLinecap={LINECAP_STYLE}
                    strokeLinejoin={LINEJOIN_STYLE} />
                </svg>
            </div>
        );    
    }

    getLine() {
        if (!this.line) {
            const [n0, n1] = this.involutes;
            const [x0, y0] = n0.getPosition();
            const [x1, y1] = n1.getPosition();
            const [r0, r1] = this.involutes.map(n => n.radius);
            
            const w1 = this.w1 + this.gap1;
            const w = this.w0 + w1 + this.wc;
            const d = Math.sqrt((x1 - x0)**2 + (y1 - y0)**2);
            const discr = Math.max(0, w + r0 + r1 - d) / 2;
            const xi0a = Math.min(angleDiff(this.baseAngle, this.psi0), angleDiff(this.psi0, this.baseAngle));
            const xi1a = Math.min(angleDiff(this.baseAngle + Math.PI, this.psi1), angleDiff(this.psi1, this.baseAngle + Math.PI));

            if (Math.abs(xi0a) + Math.abs(xi1a) > 1e-4) {
                const xi0a2 = Math.max(0, xi0a * xi0a * (xi0a - Math.PI/4));
                const xi1a2 = Math.max(0, xi1a * xi1a * (xi1a - Math.PI/4));
                this.cpr0 = r0 + w1 + (
                    xi0a<Math.PI/2? 
                    xi0a2*this.w0/4: 
                    Math.PI/2*Math.PI/2 * this.w0/4 + (xi0a - Math.PI/2)*discr
                );
			    if (xi0a < Math.PI/2) {
                    this.cpr0 = Math.min(r0 + (1 + xi0a2)*(d - r1)/4 + xi0a2*this.w0, this.cpr0);
                }
		        this.cpr1 = r1 + this.w0 + (
                    xi1a < Math.PI/2? 
                    xi1a2*w1/4: 
                    Math.PI/2*Math.PI/2 * this.w0/4 + (xi1a - Math.PI/2)*discr
                ); 
			    if(xi1a<Math.PI/2) {
                    this.cpr1 = Math.min(r1 + (1 + xi1a2)*(d - r0)/4 + xi1a2*w1, this.cpr1);
                }

                // Give a boost to whichever side has a (significantly) greater distance to the base angle:
                const d1 = d - r0 - r1;
                if(xi0a > 1.05*xi1a) {
                    this.cpr0 = Math.max(this.cpr0, d1/3);
                } 
                else if (xi1a > 1.05*xi0a){
                    this.cpr1 = Math.max(this.cpr1, d1/3);
                } else {
                    this.cpr0 = Math.max(this.cpr0, d1/4);
                    this.cpr1 = Math.max(this.cpr1, d1/4);
                }

                // Make sure that reflexive relationships look half-way elegant:
                if (n0===n1) {
                    const dr0 = 4*r0 - this.cpr0 - this.gap0;
                    const dr1 = 4*r1 - this.cpr1 - this.gap1;
                    const dr = Math.max(dr0, dr1);
                    if(dr > 0) {
                        this.cpr0 += dr;
                        this.cpr1 += dr;
                    }
                }
            }
            this.line = this.getLine1();    
        }
    }

    getLine1(): CubicCurve {
        const [n0, n1] = this.involutes;
        const [x0, y0] = n0.getPosition();
        const [x1, y1] = n1.getPosition();
        const [r0, r1] = this.involutes.map(n => n.radius);
        const psi0 = this.psi0;
        const psi1 = this.psi1;
        const cpr0 = this.cpr0;
        const cpr1 = this.cpr1;
    
        return {
            x0: x0 + r0* Math.cos(psi0), 
            y0: y0 - r0*Math.sin(psi0), 
            x1: x0 + cpr0 * Math.cos(psi0), 
            y1: y0 - cpr0*Math.sin(psi0), 
            x2: x1 + cpr1*Math.cos(psi1), 
            y2: y1 - cpr1*Math.sin(psi1), 
            x3: x1 + r1*Math.cos(psi1), 
            y3: y1 - r1*Math.sin(psi1)
        }
    }

}

export interface ConnectorProps {
    id: string
    yOffset: number
    primaryColor: HSL
}
