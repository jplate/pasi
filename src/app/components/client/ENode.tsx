import React from 'react';
import Item, { MAX_DASH_VALUE, MAX_DASH_LENGTH, MAX_LINEWIDTH, LINECAP_STYLE, LINEJOIN_STYLE, HSL, Range } from './Item.tsx'
import { Entry } from './ItemEditor.tsx'
import { H, MAX_X, MAX_Y, MIN_Y, MARK_LINEWIDTH, MIN_TRANSLATION_LOG_INCREMENT } from './MainPanel.tsx'
import { validFloat, parseInputValue, DashValidator } from './EditorComponents.tsx'
import NodeGroup from './NodeGroup.tsx'
import * as Texdraw from '../../codec/Texdraw.tsx'

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


export default class ENode extends Item {

    public radius: number = DEFAULT_RADIUS;
    public radius100: number = DEFAULT_RADIUS;
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

    public override getInfo(list: (ENode | NodeGroup)[]): Entry[] {
        return [
            {type: 'number input', key: 'x', text: 'X-coordinate', width: 'long', value: this.x, step: 0},
            {type: 'number input', key: 'y', text: 'Y-coordinate', width: 'long', value: this.y, step: 0},
            {type: 'logIncrement', extraBottomMargin: true},
            {type: 'number input', key: 'radius', text: 'Radius', width: 'long', value: this.radius, step: 1},
            {type: 'number input', key: 'lw', text: 'Line width', width: 'medium', value: this.linewidth, step: 0.1},
            {type: 'string input', key: 'dash', text: 'Stroke pattern', width: 'long', value: this.dashValidator.write(this.dash)},
            {type: 'number input', key: 'shading', text: 'Shading', width: 'medium', value: this.shading, min: 0, max: 1, step: 0.1},
            {type: 'gloss', text: '(Shading=0: transparent; >0: opaque)', style: 'mb-4 text-right text-xs'},
            {type: 'number input', key: 'rank', text: 'Rank (akin to Z-index)', value: list.indexOf(this), step: 1},
            {type: 'label', text: '', style: 'flex-1'}, // a filler
            {type: 'button', key: 'defaults', text: 'Defaults'}
        ]
    }

    public override handleEditing(
            e: React.ChangeEvent<HTMLInputElement> | null, 
            logIncrement: number, 
            selection: Item[],
            key: string): [(item: Item, list: (ENode | NodeGroup)[]) => (ENode | NodeGroup)[], applyTo: Range] {
        switch(key) {
            case 'x': if (e) {
                    const dmin = -selection.reduce((min, item) => min<item.x? min: item.x, this.x);
                    const delta = parseInputValue(e.target.value, 0, MAX_X, this.x, logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.x;
                    const dx = delta>dmin? delta: 0; // this is to avoid items from being moved beyond the left border of the canvas                        
                    return [(item, array) => {
                        if (dx!==0) item.move(dx, 0);                         
                        return array
                    }, 'wholeSelection']
                }
            case 'y': if (e) {
                    const dy = parseInputValue(e.target.value, MIN_Y, MAX_Y, this.y, logIncrement, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.y;
                    return [(item, array) => {
                        if (!isNaN(dy) && dy!==0) {
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

    public override getTexdrawCode() {
		return super.getTexdrawCode() + (
            this.shading>0 || this.linewidth>0?
            (Texdraw.move(this.x, this.y) + 
                (this.shading>0? Texdraw.fcirc(this.radius, this.shading): '') +
                (this.dash.length>0? Texdraw.linePattern(this.dash): '') + 
                (this.linewidth>0? Texdraw.circ(this.radius): '') +
                (this.dash.length>0? Texdraw.linePattern([]): '')
            ): ''
        );			        
    }

    public override getInfoString() {
        return (this.linewidth>0 || this.shading>0)? '': 
            `${Texdraw.encodeFloat(this.radius)} ${Texdraw.encodeFloat(this.x)} ${Texdraw.encodeFloat(this.y)}`;
    }

    public override parse(code: string, info: string) {

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

