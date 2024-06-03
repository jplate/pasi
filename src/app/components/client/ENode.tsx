import React from 'react';
import Item, { DEFAULT_LINEWIDTH, DEFAULT_DASH, DEFAULT_SHADING, MAX_LINEWIDTH, MAX_DASH_LENGTH, MAX_DASH_VALUE, DEFAULT_COLOR } from './Item.tsx'
import { Entry } from './ItemEditor.tsx'
import { H, MAX_X, MIN_Y, MARK_LINEWIDTH } from './MainPanel.tsx'
import { validFloat } from './EditorComponents.tsx'

export const DEFAULT_RADIUS = 10
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

    private trailingSpace = false; // keeps track of whether a space should be added to the stroke pattern in editing
    private trailingDot = false; // keeps track of whether a dot should be added to the stroke pattern in editing
    
    constructor(key: string, x: number, y: number) {
        super(key, x, y);
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

    public override getInfo(array: Item[]): Entry[] {
        return [
            /* 0 */{type: 'number input', text: 'X-coordinate', width: 'long', value: this.x, step: 0.1},
            /* 1 */{type: 'number input', text: 'Y-coordinate', width: 'long', value: this.y, step: 0.1},
            /* 2 */{type: 'number input', text: 'Radius', width: 'long', value: this.radius, step: 1},
            /* 3 */{type: 'number input', text: 'Line width', width: 'long', value: this.lineWidth, step: 0.1},
            /* 4 */{type: 'string input', text: 'Stroke pattern', width: 'long', value: this.dash.join(' ')+(this.trailingSpace? ' ': this.trailingDot? '.': '')},
            /* 5 */{type: 'number input', text: 'Shading', width: 'long', value: this.shading, min: 0, max: 1, step: 0.1},
            /* 6 */{type: 'gloss', text: '(Shading = 0: transparent; > 0: opaque)'},
            /* 7 */{type: 'number input', text: 'Rank (akin to Z-index)', value: array.indexOf(this), step: 1},
            /* 8 */{type: 'label', text: '', style: 'flex-1'}, // a filler
            /* 9 */{type: 'button', text: 'Defaults'}
        ]
    }

    public override handleEditing(e: React.ChangeEvent<HTMLInputElement> | null, index: number): [(item: Item, array: Item[]) => Item[], applyToAll: boolean] {
        switch(index) {
            case 0: if(e) return [(item, array) => {item.x = item.x100 = validFloat(e.target.value, 0, MAX_X, 0); return array}, true]
            case 1: if(e) return [(item, array) => {item.y = item.y100 = validFloat(e.target.value, MIN_Y, H, 0); return array}, true]
            case 2: if(e) return [(item, array) => {if(item instanceof ENode) item.radius = item.radius100 = validFloat(e.target.value, 0, MAX_RADIUS, 0); return array}, true]
            case 3: if(e) return [(item, array) => {item.lineWidth = item.lineWidth100 = validFloat(e.target.value, 0, MAX_LINEWIDTH, 0); return array}, true]
            case 4: if(e) return [(item, array) => {
                    const split = e.target.value.split(/[^0-9.]+/);
                    this.trailingDot = split[split.length-1].endsWith('.');
                    this.trailingSpace = split[split.length-1]===''; // the last element of split will be '' iff the user entered a comma or space (or some combination thereof) at the end
                    const slice = split.filter(s => s!=='').slice(0, MAX_DASH_LENGTH); // shorten the array if too long
                    // Now we just have to translate the string array into numbers:
                    item.dash = item.dash100 = slice.map(s => {
                        const match = s.match(/^[^.]*\.[^.]*/); // If there is a second dot in s, then match[0] will only include the material up to that second dot (exclusive).
                        const trimmed = match? match[0]: s; // This may still be just a dot, in which case it should be interpreted as a zero.
                        return Math.min(trimmed==='.'? 0: Number(trimmed), MAX_DASH_VALUE);
                    }).filter(n => !isNaN(n)); 
                    return array
                }, true]
            case 5: if(e) return [(item, array) => {item.shading = validFloat(e.target.value, 0, 1); return array}, true]
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
                        item.radius = item.radius100 = DEFAULT_RADIUS;
                        item.lineWidth = item.lineWidth100 = DEFAULT_LINEWIDTH;
                        item.dash = item.dash100 = DEFAULT_DASH;
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
    hue: number
    sat: number
    lgt: number
}

export interface ENodeProps {
    id: string
    enode: ENode
    bg: HSL
    markColor: string
    focus: boolean
    selected: number[]
    preselected: boolean
    onMouseDown: (enode: ENode, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    onMouseEnter: (enode: ENode, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    onMouseLeave: (enode: ENode, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    hidden?: boolean
}

export const ENodeComp = ({ id, enode, bg, markColor, focus = false, selected = [], preselected = false, 
        onMouseDown, onMouseEnter, onMouseLeave, hidden = false }: ENodeProps) => {

    const x = enode.x
    const y = enode.y
    const radius = enode.radius
    const lineWidth = enode.lineWidth
    const shading = enode.shading

    const width = radius * 2
    const height = radius * 2
    const extraHeight = radius<MIN_RADIUS_FOR_INNER_TITLE? TITLE_FONTSIZE: 0

    // coordinates (and dimensions) of the inner rectangle, relative to the div:
    const top = MARK_LINEWIDTH + extraHeight
    const left = MARK_LINEWIDTH
    const mW = width + lineWidth // width and...
    const mH = height + lineWidth // ...height relevant for drawing the 'mark border'
    const l = Math.min(Math.max(5, mW / 5), 25)
    const m = hidden ? 0.9 * l : 0

    console.log(`Rendering ${id}... x= ${x}  y=${y}`)

    return (
        <div className={focus ? 'focused' : selected.length > 0 ? 'selected' : preselected? 'preselected': 'unselected'}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => onMouseDown(enode, e)}
            onMouseEnter={(e) => onMouseEnter(enode, e)}
            onMouseLeave={(e) => onMouseLeave(enode, e)}
            style={{
                position: 'absolute',
                left: `${x - radius - MARK_LINEWIDTH - lineWidth / 2}px`,
                top: `${H - y - radius - MARK_LINEWIDTH - lineWidth / 2 - extraHeight}px`
            }}>
            <svg width={width + MARK_LINEWIDTH * 2 + lineWidth} height={height + MARK_LINEWIDTH * 2 + lineWidth + extraHeight}>
                <circle cx={radius + MARK_LINEWIDTH + lineWidth / 2}
                    cy={radius + MARK_LINEWIDTH + lineWidth / 2 + extraHeight} r={radius}
                    fill={shading == 0 ? 'hsla(0,0%,0%,0)' : `hsla(${bg.hue},${bg.sat - Math.floor(bg.sat * shading)}%,${bg.lgt - Math.floor(bg.lgt * shading)}%,1)`}
                    stroke={DEFAULT_COLOR}
                    strokeWidth={lineWidth}
                    strokeDasharray={enode.dash.join(' ')} />
                <polyline points={`${left},${top + l} ${left + m},${top + m} ${left + l},${top}`} fill='none' />
                <polyline points={`${left + mW - l},${top} ${left + mW - m},${top + m} ${left + mW},${top + l}`} fill='none' />
                <polyline points={`${left + mW},${top + mH - l} ${left + mW - m},${top + mH - m} ${left + mW - l},${top + mH}`} fill='none' />
                <polyline points={`${left + l},${top + mH} ${left + m},${top + mH - m} ${left},${top + mH - l}`} fill='none' />
            </svg>
            {selected.length > 0 && // Add a 'title'
                <div style={{
                    position: 'absolute', left: '0', top: '0', width: `${mW + MARK_LINEWIDTH * 2}px`, color: markColor, textAlign: 'center',
                    fontSize: `${TITLE_FONTSIZE}px`, textWrap: 'nowrap', overflow: 'hidden', userSelect: 'none', pointerEvents: 'none', cursor: 'default'
                }}>
                    {selected.map(i => i + 1).join(', ')}
                </div>}
        </div>
    )
}

