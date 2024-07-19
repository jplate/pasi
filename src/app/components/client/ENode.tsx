import React from 'react';
//import assert from 'assert' // pretty hefty package, and not really needed
import Item, { Range } from './Item'
import Node, { MAX_DASH_VALUE, MAX_DASH_LENGTH, DEFAULT_LINEWIDTH, MAX_LINEWIDTH, LINECAP_STYLE, LINEJOIN_STYLE, HSL } from './Node.tsx'
import { Entry } from './ItemEditor.tsx'
import { H, MAX_X, MIN_X, MAX_Y, MIN_Y, MARK_LINEWIDTH, MIN_TRANSLATION_LOG_INCREMENT } from './MainPanel.tsx'
import { validFloat, parseInputValue, DashValidator } from './EditorComponents.tsx'
import CNodeGroup from './CNodeGroup.tsx'
import * as Texdraw from '../../codec/Texdraw.tsx'
import {  ParseError, makeParseError } from '../../codec/Texdraw.tsx'

export const DEFAULT_RADIUS = 12
export const D0 = 2*Math.PI/100 // absolute minimal angle between two contact points on the periphery of an ENode
export const D1 = 2*Math.PI/12 // 'comfortable' angle between two contact points on the periphery of an ENode
export const HALF_DISTANCE_PENALTY = 48
export const SWITCH_PENALTY = 16
export const SWITCH_TOLERANCE = 0.1
export const DISTANCE_PENALTY = 4
export const CLOSENESS_TO_BASE_ANGLE_PENALTY = 9

export const MAX_RADIUS = 9999
export const MIN_RADIUS_FOR_INNER_TITLE = 5
export const TITLE_FONTSIZE = 9


export default class ENode extends Node {

    radius: number = DEFAULT_RADIUS;
    radius100: number = DEFAULT_RADIUS;
    private dashValidator: DashValidator = new DashValidator(MAX_DASH_VALUE, MAX_DASH_LENGTH);


    constructor(i: number, x: number, y: number) {
        super(`E${i}`, x, y);
    }

    public override getWidth() {
        return this.radius * 2;
    }

    public override getHeight() {
        return this.radius * 2;
    }

    public override getLeft() {
        return this.x - this.radius;
    }

    public override getBottom() {
        return this.y - this.radius;
    }

    public override reset() {
        super.reset();
        this.radius = this.radius100 = DEFAULT_RADIUS;
    }

    public override getInfo(list: (ENode | CNodeGroup)[]): Entry[] {
        return [
            {type: 'number input', key: 'x', text: 'X-coordinate', width: 'long', value: this.x, step: 0},
            {type: 'number input', key: 'y', text: 'Y-coordinate', width: 'long', value: this.y, step: 0},
            {type: 'logIncrement', extraBottomMargin: true},
            {type: 'number input', key: 'radius', text: 'Radius', width: 'long', value: this.radius, step: 1},
            {type: 'number input', key: 'lw', text: 'Line width', width: 'medium', value: this.linewidth, step: 0.1},
            {type: 'string input', key: 'dash', text: 'Stroke pattern', width: 'long', value: this.dashValidator.write(this.dash)},
            {type: 'number input', key: 'shading', text: 'Shading', width: 'medium', value: this.shading, min: 0, max: 1, step: 0.1},
            {type: 'gloss', text: '(Shading=0: transparent; >0: opaque)', style: 'mb-4 text-right text-xs'},
            {type: 'number input', key: 'rank', text: 'Rank in paint-order', value: list.indexOf(this), step: 1},
            {type: 'label', text: '', style: 'flex-1'}, // a filler
            {type: 'button', key: 'defaults', text: 'Defaults'}
        ]
    }

    public override handleEditing(
            e: React.ChangeEvent<HTMLInputElement> | null, 
            logIncrement: number, 
            selection: Item[],
            key: string): [(item: Item, list: (ENode | CNodeGroup)[]) => (ENode | CNodeGroup)[], applyTo: Range] {
        switch(key) {
            case 'x': if (e) {
                    const dmin = -(selection.filter(item => item instanceof Node) as Node[]).reduce((min, item) => min<item.x? min: item.x, this.x);
                    const delta = parseInputValue(e.target.value, 0, MAX_X, this.x, logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.x;
                    const dx = delta>dmin? delta: 0; // this is to avoid items from being moved beyond the left border of the canvas                        
                    return [(item, array) => {
                        if (item instanceof Node && dx!==0) {
                            item.move(dx, 0);                         
                        }
                        return array
                    }, 'wholeSelection']
                }
            case 'y': if (e) {
                    const dy = parseInputValue(e.target.value, MIN_Y, MAX_Y, this.y, logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.y;
                    return [(item, array) => {
                        if (item instanceof Node && !isNaN(dy) && dy!==0) {
                            item.move(0, dy);
                        }
                        return array;
                    }, 'wholeSelection']
                }
        	case 'radius': if (e) return [(item, array) => {
                    if(item instanceof ENode) item.radius = item.radius100 = validFloat(e.target.value, 0, MAX_RADIUS, 0); 
                    return array
                }, 'wholeSelection']
            case 'lw': if (e) return [(item, array) => {
                    if (item instanceof Node) item.setLinewidth(validFloat(e.target.value, 0, MAX_LINEWIDTH, 0)); 
                    return array
                }, 'ENodesAndCNodeGroups']
            case 'dash': if (e) {
                    const dash = this.dashValidator.read(e.target);
                    return [(item, array) => {
                        if (item instanceof Node) item.setDash(dash);                    
                        return array
                    }, 'ENodesAndCNodeGroups']
                }
            case 'shading': if (e) return [(item, array) => {
                if (item instanceof Node) item.setShading(validFloat(e.target.value, 0, 1)); 
                    return array
                }, 'ENodesAndCNodeGroups']
            case 'rank': if (e) return [(item, array) => {
                    if (item instanceof ENode) {
                        const currentPos = array.indexOf(item);
                        const newPos = parseInt(e.target.value);
                        let result = array;
                        if(newPos>currentPos && currentPos+1<array.length) { // move the item up in the Z-order (i.e., towards the end of the array), but only by one
                            [result[currentPos], result[currentPos+1]] = [result[currentPos+1], result[currentPos]];
                        } 
                        else if(newPos<currentPos && currentPos>0) { // move the item down in the Z-order, but only by one
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
            default: 
                return [(item, array) => array, 'onlyThis']        
       }
    }

    public override getInfoString() {
        return (this.linewidth>0 || this.shading>0)? '': 
            `${Texdraw.encodeFloat(this.radius)} ${Texdraw.encodeFloat(this.x)} ${Texdraw.encodeFloat(this.y)}`;
    }

    public override getTexdrawCode() {
		return [
            super.getTexdrawCode(),
            (this.shading>0 || this.linewidth>0? Texdraw.move(this.x, this.y): ''),
            (this.shading>0? Texdraw.fcirc(this.radius, this.shading): ''),
            (this.dash.length>0? Texdraw.lpatt(this.dash): ''),
            (this.linewidth>0? Texdraw.circ(this.radius): ''),
            (this.dash.length>0? Texdraw.lpatt([]): '')
        ].join('');	        
    }

    /** 
     *  The 'name' is the string by which this ENode is referred to in the 'hints' that appear as comments in the texdraw code. 
     *  The calling function should make sure that this name is of reasonable length so that we don't have to worry about truncating it in our
     *  error messages.
     */
    public override parse(tex: string, info: string | null, name: string) {
        const stShapes =  Texdraw.getStrokedShapes(tex, DEFAULT_LINEWIDTH);
        
        //console.log(`stroked shapes: ${stShapes.map(sh => sh.toString()).join(', ')}`);

        const circles: Texdraw.Circle[] = [];
        if (stShapes.length>2) {
            throw new ParseError(<span>Too many shapes in the definition of entity node <code>{name}</code>.</span>);
        }
        let n = 0;
        for(; n<stShapes.length; n++) {
		    if(!(stShapes[n].shape instanceof Texdraw.Circle)) {
		        throw makeParseError(`Expected a circle, not ${stShapes[n].shape.genericDescription}`, tex);
		    }
            circles.push(stShapes[n].shape as Texdraw.Circle);
	    }
        
        //assert(n>=0 && n<3);
        
        if (n > 0) {
            this.shading = circles[0].fillLevel;
            this.linewidth = this.linewidth100 = stShapes[n-1].stroke.linewidth;
            if (this.linewidth > 0) { // In this case the dash pattern can be got from the same shape.
                this.dash = this.dash100 = stShapes[n-1].stroke.pattern;
            }
            else { // If linewidth is zero, then there will be only one stroked shape (n will be equal to 1), and we have to extract the dash pattern ourselves:
                this.dash = this.dash100 = Texdraw.extractDashArray(tex) || [];
            }
            this.radius = circles[0].radius;
            ({ x: this.x, y: this.y } = circles[0].location);
        }
        else { // In this case there are no shapes, so we have to rely in part on the info string, assuming there is one.
            if(info===null) {	        	
	            throw new ParseError(<span>Incomplete definition of entity node <code>{name}</code>: info string required.</span>);
	        }
            // console.log(`info: ${info}`);
            this.linewidth = this.linewidth100 = 0;
            this.dash = this.dash100 = Texdraw.extractDashArray(tex) || [];
            [this.radius, this.x, this.y] = info.split(/\s+/).map(s => Texdraw.decodeFloat(s));            
            if (isNaN(this.radius) || isNaN(this.x) || isNaN(this.y)) {
                throw new ParseError(<span>Corrupt data in info string for entity node <code>{name}</code>.</span>);
            }
        }
        if (this.linewidth < 0) {
            throw new ParseError(<span>Illegal data in definition of entity node <code>{name}</code>: line width should not be negative.</span>);
        }
        else if (this.linewidth > MAX_LINEWIDTH) {
            throw new ParseError(<span>Illegal data in definition of entity node <code>{name}</code>: line width {this.linewidth} exceeds maximum value.</span>);
        }

        if (this.shading < 0) {
            throw new ParseError(<span>Illegal data in definition of entity node <code>{name}</code>: shading value should not be negative.</span>);
        }
        else if (this.shading > 1) {
            throw new ParseError(<span>Illegal data in definition of entity node <code>{name}</code>: shading value {this.shading} exceeds 1.</span>);
        }

        if (this.dash.length > MAX_DASH_LENGTH) {
            throw new ParseError(<span>Illegal data in definition of entity node <code>{name}</code>: dash array length {this.dash.length} exceeds maximum value.</span>); 
        }
        let val;
        if (this.dash.some(v => (val = v) < 0)) {
            throw new ParseError(<span>Illegal data in definition of entity node <code>{name}</code>: dash value should not be negative.</span>); 
        }        
        if (this.dash.some(v => v > MAX_DASH_VALUE)) {
            throw new ParseError(<span>Illegal data in definition of entity node <code>{name}</code>: dash value {val} exceeds  maximum value.</span>); 
        }

        if (this.radius < 0) {
            throw new ParseError(<span>Illegal data in definition of entity node <code>{name}</code>: radius should not be negative.</span>); 
        }
        else if (this.radius > MAX_RADIUS) {
            throw new ParseError(<span>Illegal data in definition of entity node <code>{name}</code>: radius {this.radius} exceeds maximum value.</span>); 
        }
        
        if (this.x < MIN_X) {
            throw new ParseError(<span>Illegal data in definition of entity node <code>{name}</code>: X-coordinate {this.x} below minimum value.</span>); 
        }
        else if (this.x > MAX_X) {
            throw new ParseError(<span>Illegal data in definition of entity node <code>{name}</code>: X-coordinate {this.x} exceeds maximum value.</span>); 
        }
        
        if (this.y < MIN_Y) {
            throw new ParseError(<span>Illegal data in definition of entity node <code>{name}</code>: Y-coordinate {this.y} below minimum value.</span>); 
        }
        else if (this.y > MAX_Y) {
            throw new ParseError(<span>Illegal data in definition of entity node <code>{name}</code>: Y-coordinate {this.y} exceeds maximum value.</span>); 
        }
        
        [this.radius100, this.x100, this.y100] = [this.radius, this.x, this.y];
    }
}



export interface ENodeProps {
    id: string
    enode: ENode
    yOffset: number
    bg: HSL
    primaryColor: HSL
    markColor: string
    titleColor: string
    focus: boolean
    selected: number[]
    preselected: boolean
    onMouseDown: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    onMouseEnter: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    onMouseLeave: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    hidden?: boolean
}

export const ENodeComp = ({ id, enode, yOffset, bg, primaryColor, markColor, titleColor, focus = false, selected = [], preselected = false, 
        onMouseDown, onMouseEnter, onMouseLeave, hidden = false }: ENodeProps) => {

    const x = enode.x;
    const y = enode.y;
    const radius = enode.radius;
    const linewidth = enode.linewidth;
    const shading = enode.shading;

    const width = radius * 2;
    const height = radius * 2;
    const extraHeight = radius<MIN_RADIUS_FOR_INNER_TITLE? TITLE_FONTSIZE: 0;

    // coordinates (and dimensions) of the inner rectangle, relative to the div:
    const top = MARK_LINEWIDTH + extraHeight;
    const left = MARK_LINEWIDTH;
    const mW = width + linewidth; // width and...
    const mH = height + linewidth; // ...height relevant for drawing the 'mark border'
    const l = Math.min(Math.max(5, mW / 5), 25);
    const m = hidden ? 0.9 * l : 0;

    //console.log(`Rendering ${id}... (${x}, ${y})  yOffset=${yOffset}`);

    return (
        <div className={focus ? 'focused' : selected.length > 0 ? 'selected' : preselected? 'preselected': 'unselected'}
            id={id}
            //onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => onMouseDown(enode, e)}
            onMouseEnter={(e) => onMouseEnter(enode, e)}
            onMouseLeave={(e) => onMouseLeave(enode, e)}
            style={{
                position: 'absolute',
                left: `${x - radius - MARK_LINEWIDTH - linewidth / 2}px`,
                top: `${H + yOffset - y - radius - MARK_LINEWIDTH - linewidth / 2 - extraHeight}px`,
                cursor: 'pointer'
            }}>
            <svg width={width + MARK_LINEWIDTH * 2 + linewidth} height={height + MARK_LINEWIDTH * 2 + linewidth + extraHeight} xmlns="http://www.w3.org/2000/svg">
                <circle cx={radius + MARK_LINEWIDTH + linewidth / 2}
                    cy={radius + MARK_LINEWIDTH + linewidth / 2 + extraHeight} r={radius}
                    fill={shading == 0? 'hsla(0,0%,0%,0)': // Otherwise we assmilate the background color to the primary color, to the extent that shading approximates 1.
                        `hsla(${bg.hue - Math.floor((bg.hue - primaryColor.hue) * shading)},` +
                        `${bg.sat - Math.floor((bg.sat - primaryColor.sat) * shading)}%,`+
                        `${bg.lgt - Math.floor((bg.lgt - primaryColor.lgt) * shading)}%,1)`}
                    stroke={`hsl(${primaryColor.hue},${primaryColor.sat}%,${primaryColor.lgt}%`}
                    strokeWidth={linewidth}
                    strokeDasharray={enode.dash.join(' ')} 
                    strokeLinecap={LINECAP_STYLE}
                    strokeLinejoin={LINEJOIN_STYLE} />
                <polyline stroke={markColor} points={`${left},${top + l} ${left + m},${top + m} ${left + l},${top}`} fill='none' />
                <polyline stroke={markColor} points={`${left + mW - l},${top} ${left + mW - m},${top + m} ${left + mW},${top + l}`} fill='none' />
                <polyline stroke={markColor} points={`${left + mW},${top + mH - l} ${left + mW - m},${top + mH - m} ${left + mW - l},${top + mH}`} fill='none' />
                <polyline stroke={markColor} points={`${left + l},${top + mH} ${left + m},${top + mH - m} ${left},${top + mH - l}`} fill='none' />
            </svg>
            {selected.length > 0 && // Add a 'title'
                <div style={{
                    position: 'absolute', left: '0', top: '0', width: `${mW + MARK_LINEWIDTH * 2}px`, color: titleColor, textAlign: 'center',
                    fontSize: `${TITLE_FONTSIZE}px`, textWrap: 'nowrap', overflow: 'hidden', userSelect: 'none', pointerEvents: 'none', cursor: 'default'
                }}>
                    {selected.map(i => i + 1).join(', ')}
                </div>}
        </div>
    )
}

