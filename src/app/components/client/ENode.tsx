import React from "react";
import Item, { DEFAULT_LINEWIDTH, DEFAULT_DASH, DEFAULT_SHADING, MAX_LINEWIDTH, MAX_VALUE, DEFAULT_COLOR } from './Item.tsx'
import { Entry } from './ItemEditor.tsx'
import { H, MARK_LINEWIDTH } from "./MainPanel.tsx";

export const DEFAULT_RADIUS = 10;
export const D0 = 2*Math.PI/100; // absolute minimal angle between two contact points on the periphery of an ENode
export const D1 = 2*Math.PI/12; // 'comfortable' angle between two contact points on the periphery of an ENode
export const HALF_DISTANCE_PENALTY = 48;
export const SWITCH_PENALTY = 16;
export const SWITCH_TOLERANCE = 0.1;
export const DISTANCE_PENALTY = 4;
export const CLOSENESS_TO_BASE_ANGLE_PENALTY = 9;

export const MAX_X = 9999;
export const MAX_Y = 9999;
export const MAX_RADIUS = 9999;


export default class ENode extends Item {

    public radius: number = DEFAULT_RADIUS;
    
    constructor(key: string, x: number, y: number) {
        super(key, x, y);
    }

    public override getInfo(array: Item[]): Entry[] {
        return [
            /* 0 */{type: 'number input', text: 'X-coordinate', value: this.x, min: 0, max: MAX_X, step: 0.1},
            /* 1 */{type: 'number input', text: 'Y-coordinate', value: this.y, min: -MAX_Y, max: MAX_Y, step: 0.1},
            /* 2 */{type: 'number input', text: 'Radius', value: this.radius, min: 0, max: MAX_RADIUS, step: 1},
            /* 3 */{type: 'number input', text: 'Line width', value: this.lineWidth, min: 0, max: MAX_LINEWIDTH, step: 0.1},
            /* 4 */{type: 'string input', text: 'Stroke pattern', value: this.dash},
            /* 5 */{type: 'number input', text: 'Shading', value: this.shading, min: 0, max: 1, step: 0.1},
            /* 6 */{type: 'gloss', text: '(Shading = 0: transparent; > 0: opaque)'},
            /* 7 */{type: 'number input', text: 'Rank (akin to Z-index)', value: array.indexOf(this), min: 0, max: MAX_VALUE, step: 1},
            /* 8 */{type: 'label', text: '', style: 'flex-1'}, // a filler
            /* 9 */{type: 'button', text: 'Defaults'}
        ]
    }

    public override handleEditing(e: React.ChangeEvent<HTMLInputElement> | null, index: number): [(item: Item, array: Item[]) => Item[], applyToAll: boolean] {
        switch(index) {
            case 0: if(e) return [(item, array) => {item.x = parseFloat(e.target.value); return array}, true]
            case 1: if(e) return [(item, array) => {item.y = parseFloat(e.target.value); return array}, true]
            case 2: if(e) return [(item, array) => {if(item instanceof ENode) item.radius = parseFloat(e.target.value); return array}, true]
            case 3: if(e) return [(item, array) => {item.lineWidth = parseFloat(e.target.value); return array}, true]
            case 4: if(e) return [(item, array) => {item.dash = e.target.value; return array}, true]
            case 5: if(e) return [(item, array) => {item.shading = parseFloat(e.target.value); return array}, true]
            case 7: if(e) return [(item, array) => {
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
                }, false]
            case 9: if(index==9) return [(item, array) => {
                    if(item instanceof ENode) {
                        item.radius = DEFAULT_RADIUS;
                        item.lineWidth = DEFAULT_LINEWIDTH;
                        item.dash = DEFAULT_DASH;
                        item.shading = DEFAULT_SHADING;
                    }
                    return array}, true]
            default: 
                console.log('Input element is null!  Index: '+index);
                return [(item, array) => array, false]        
       }
    }
}


export interface HSL {
    hue: number;
    sat: number;
    lgt: number;
}

export interface ENodeProps {
    id: string
    enode: ENode
    bg: HSL
    markColor: string
    selected: number[]
    onMouseDown: (enode: ENode, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    focus: boolean
    hidden?: boolean
}

export const ENodeComp = ({ id, enode, bg, markColor, selected = [], onMouseDown, focus = false, hidden = false }: ENodeProps) => {

    const x = enode.x
    const y = enode.y
    const radius = enode.radius
    const lineWidth = enode.lineWidth
    const shading = enode.shading

    const width = radius * 2
    const height = radius * 2

    // coordinates (and dimensions) of the inner rectangle, relative to the div:
    const top = MARK_LINEWIDTH
    const left = MARK_LINEWIDTH
    const mW = width + lineWidth // width and...
    const mH = height + lineWidth // ...height relevant for drawing the 'mark border'
    const l = Math.min(Math.max(5, mW / 5), 25)
    const m = hidden ? 0.9 * l : 0

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        onMouseDown(enode, e)
    }

    console.log(`Rendering ${id}...`)

    return (
        <div className={focus ? 'focused' : selected.length > 0 ? 'selected' : 'unselected'}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handleMouseDown}
            style={{
                position: 'absolute',
                left: `${x - radius - MARK_LINEWIDTH - lineWidth / 2}px`,
                top: `${H - y - radius - MARK_LINEWIDTH - lineWidth / 2}px`
            }}>
            <svg width={width + MARK_LINEWIDTH * 2 + lineWidth} height={height + MARK_LINEWIDTH * 2 + lineWidth}>
                <circle cx={radius + MARK_LINEWIDTH + lineWidth / 2}
                    cy={radius + MARK_LINEWIDTH + lineWidth / 2} r={radius}
                    fill={shading == 0 ? 'hsla(0,0%,0%,0)' : `hsla(${bg.hue},${bg.sat - Math.floor(bg.sat * shading)}%,${bg.lgt - Math.floor(bg.lgt * shading)}%,1)`}
                    stroke={DEFAULT_COLOR}
                    strokeWidth={lineWidth}
                    strokeDasharray={enode.dash} />
                <polyline points={`${left},${top + l} ${left + m},${top + m} ${left + l},${top}`} fill='none' />
                <polyline points={`${left + mW - l},${top} ${left + mW - m},${top + m} ${left + mW},${top + l}`} fill='none' />
                <polyline points={`${left + mW},${top + mH - l} ${left + mW - m},${top + mH - m} ${left + mW - l},${top + mH}`} fill='none' />
                <polyline points={`${left + l},${top + mH} ${left + m},${top + mH - m} ${left},${top + mH - l}`} fill='none' />
            </svg>
            {selected.length > 0 && // Add a 'title'
                <div style={{
                    position: 'absolute', left: '0', top: '0', width: `${mW + MARK_LINEWIDTH * 2}px`, color: markColor, textAlign: 'center',
                    fontSize: '9px', textWrap: 'nowrap', overflow: 'hidden', userSelect: 'none', pointerEvents: 'none', cursor: 'default'
                }}>
                    {selected.map(i => i + 1).join(', ')}
                </div>}
        </div>
    )
}

