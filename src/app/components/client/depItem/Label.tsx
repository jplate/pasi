import react, { useEffect, useRef, useState } from 'react'
import { Merriweather } from 'next/font/google'  
import Item, { HSL, Range } from '../Item'
import Ornament, { OrnamentCompProps, ROUNDING_DIGITS, MIN_GAP, MAX_GAP } from './Ornament'
import Node from '../Node'
import ENode from '../ENode'
import CNodeGroup from '../CNodeGroup'
import { H, MARK_LINEWIDTH } from '../MainPanel'
import { Entry } from '../ItemEditor.tsx'
import { parseInputValue, parseCyclicInputValue } from '../EditorComponents.tsx'
import { MIN_ROTATION } from '../ItemEditor'
import { getCyclicValue, round } from '../../../util/MathTools'
import * as Texdraw from '../../../codec/Texdraw.tsx'
import { ParseError } from '../../../codec/Texdraw.tsx'
import { encode, decode } from '../../../codec/Codec1.tsx'

export const MIN_WIDTH = 5;
export const MAX_WIDTH = 300;
export const MAX_TEXT_LENGTH = 30;
export const DISPLAY_FONT_SIZE = 12;


const merriweather = Merriweather({
    weight: ['400'], 
    subsets: ['latin'], 
});


export default class Label extends Ornament {

    text: string = ''
    centered: boolean = false;

    /**
     * Creates a new Label, which is added (via the superclass constructor) to the supplied Node's array of Ornaments. 
     * It also receives a unique ID.
     */
    constructor(node: Node) {
        super(node);
        this.width = MIN_WIDTH;
        this.height = DISPLAY_FONT_SIZE;
    }

    override clone(node: Node) {
        const clone = new Label(node);
        this.copyValuesTo(clone);
        return clone;
    }

    protected override copyValuesTo(target: Label) {
        super.copyValuesTo(target);
        target.centered = this.centered;
        target.text = this.text;
    }

    override getWidth() {
        return this.width;
    }

    override getHeight() {
        return this.height;
    }
    
    override getBottomLeftCorner() {
        const { top, left } = this.#getTopLeftCorner(this.width, this.height);
        return { bottom: top - this.height, left: left };
    }

    #getTopLeftCorner(w: number, h: number) {
        const angle = this.angle;
        const angleRad = angle / 180 * Math.PI;
        const [hPos, vPos] = this.#getPositioning(); 
        const r = this.node.radius + this.gap;
        return { 
            left: this.node.x + (this.centered || hPos===0? 
                -w / 2: 
                r * Math.cos(angleRad) - (hPos < 0? w: 0)
            ),
            top: this.node.y + (this.centered || vPos===0? 
                h / 2: 
                r * Math.sin(angleRad) + (vPos > 0? h: 0)
            )
        };
    }

    #getPositioning() {
        const angle = this.angle;
        return [angle < -90 || angle > 90? -1: angle===-90 || angle==90? 0: 1,
            angle > 0 && angle < 180? 1: angle===0 || angle===180? 0: -1];            
    }

    override getInfo(list: (ENode | CNodeGroup)[]): Entry[] {
        return [
            {type: 'checkbox', key: 'centered', text: 'Centered', value: this.centered},
            {type: 'number input', key: 'angle', text: 'Angle', width: 'long', value: this.angle, step: 0},
            {type: 'number input', key: 'gap', text: 'Gap', width: 'long', value: this.gap, step: 0},
            {type: 'textarea', key: 'text', fullHeight: true, value: this.text}
        ];
    }

    override handleEditing(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | null, 
        logIncrement: number, 
        selection: Item[],
        key: string
    ): [(item: Item, list: (ENode | CNodeGroup)[]) => (ENode | CNodeGroup)[], applyTo: Range] {
        switch(key) {
            case 'angle': if (e) {
                const delta = parseCyclicInputValue(e.target.value, this.angle, 1)[1]; 
                return [(item, array) => {
                    if(!isNaN(delta) && delta!==0 && item instanceof Label) {
                        item.angle = getCyclicValue(item.angle + delta, MIN_ROTATION, 360, 10 ** ROUNDING_DIGITS);
                    }
                    return array
                }, 'wholeSelection']
            }
            case 'gap':  if (e) {
                const d = parseInputValue(e.target.value, MIN_GAP, MAX_GAP, this.gap, 0, ROUNDING_DIGITS) - this.gap;
                return [(item, array) => {
                    if (!isNaN(d) && d!==0 && item instanceof Ornament) {
                        item.gap = item.gap100 = round(item.gap + d, ROUNDING_DIGITS);
                    }
                    return array
                }, 'wholeSelection']
            }
            case 'centered':
                const centered = !this.centered;
                return [(item, array) => {
                    if (item instanceof Label) {
                        item.centered = centered;
                    }
                    return array
                }, 'wholeSelection']
            case 'text': if (e) {
                const text = e.target.value;
                return [(item, array) => {
                    if (item instanceof Label) {
                        item.text = text;
                    }
                    return array
                }, 'wholeSelection']
            }
            default: 
                return [(item, array) => array, 'onlyThis']
        }

    }

    override getInfoString() {
        return [this.gap, this.angle].map(encode).join(' ');
    }

    override getTexdrawCode() {
        const centered = this.centered;
        const [hPos, vPos] = this.#getPositioning();
        const { bottom, left } = this.getBottomLeftCorner();
        const w = this.getWidth();
        const h = this.getHeight();
        const x = centered || hPos===0? this.node.x: hPos===-1? left + w: left;
        const y = centered || vPos===0? this.node.y: vPos===-1? bottom + h: bottom;
        return [
            Texdraw.textref(
                centered || hPos===0? Texdraw.CENTER: hPos>0? Texdraw.LEFT: Texdraw.RIGHT,
                centered || vPos===0? Texdraw.CENTER: vPos>0? Texdraw.BOTTOM: Texdraw.TOP),
            Texdraw.htext(x, y, this.text)            
        ].join('');	        
    }

    override parse(tex: string, info: string | null, name?: string) {
        // The 'name' in this case is a string that identifies the node to which this Label is supposed to be attached.
        const texts = Texdraw.getTexts(tex);
	    if(texts.length < 1) {
	        throw new ParseError(<>Missing text element in definition of label for {name}.</>);
	    }
	    if(texts[0].href===Texdraw.CENTER && texts[0].vref===Texdraw.CENTER) {
	        this.centered = true;
	    }
	    this.text = texts[0].text;
        if (info) {
            const split = info.split(/\s+/).filter(s => s.length > 0);
            if (split.length!==2) {
                throw new ParseError(<span>Info string should contain exactly two elements, not {split.length}.</span>);
            }
            const [gap, angle] = split.map(decode);

            if (gap < MIN_GAP) {
                throw new ParseError(<span>Illegal data in definition of label for {name}: gap {gap} below minimum value.</span>); 
            }
            else if (gap > MAX_GAP) {
                throw new ParseError(<span>Illegal data in definition of label for {name}: gap {gap} exceeds maximum value.</span>); 
            }

            this.gap = gap;
            this.angle = getCyclicValue(angle, MIN_ROTATION, 360, Texdraw.ROUNDING_DIGITS);
        }
    }

    override getComponent(key: number, yOffset: number, primaryColor: HSL, markColor: string, 
        focus: boolean, selected: boolean, preselected: boolean, 
        onMouseDown: (item: Ornament, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void,
        onMouseEnter: (item: Ornament, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void,
        onMouseLeave: (item: Ornament, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    ) {
        return (
            <this.Component key={key} yOffset={yOffset} primaryColor={primaryColor} markColor={markColor} 
                focus={focus} selected={selected} preselected={preselected}
                onMouseDown={onMouseDown} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
        );
    }
    
    protected Component = ({ yOffset, primaryColor, markColor, focus, selected, preselected, 
            onMouseDown, onMouseEnter, onMouseLeave }: OrnamentCompProps
    ) => {
        const textElementRef =  useRef<SVGTextElement>(null);
        const [width, setWidth] = useState(0);
        const [height, setHeight] = useState(0);

        const text = this.text;

        useEffect(() => {
            if (textElementRef.current) {
                const { width: w, height: h } = textElementRef.current.getBBox(); // Get the bounding box of the text
                const width = Math.max(MIN_WIDTH, w);
                const height = Math.max(DISPLAY_FONT_SIZE, h);
                setWidth(prev => width);
                setHeight(prev => height);
                this.width = width;
                this.height = height;
            }
        }, [text]);

        const fontSize = DISPLAY_FONT_SIZE;

        // Compute the positioning of the div:
        const { left: labelLeft, top: labelTop } = this.#getTopLeftCorner(width, height);
        const divLeft = labelLeft - MARK_LINEWIDTH;
        const divTop = H + yOffset - labelTop - MARK_LINEWIDTH;

        // Compute the coordinates (and dimensions) of the inner rectangle, relative to the div:
        const top = MARK_LINEWIDTH;
        const left = MARK_LINEWIDTH;
        const mW = width + MARK_LINEWIDTH; // width and...
        const mH = height + MARK_LINEWIDTH; // ...height relevant for drawing the 'mark border'
        const l = Math.min(Math.max(5, mW / 5), 25);
        const m = Math.min(Math.max(5, mH / 5), 25);
        
        return (
            <div className={focus? 'focused': selected? 'selected': preselected? 'preselected': 'unselected'}
                    id={this.id}
                    onMouseDown={(e) => onMouseDown(this, e)}
                    onMouseEnter={(e) => onMouseEnter(this, e)}
                    onMouseLeave={(e) => onMouseLeave(this, e)}
                    style={{
                        position: 'absolute',
                        left: `${divLeft}px`,
                        top: `${divTop}px`,
                        cursor: 'pointer'
                    }}>
                <svg width={width + MARK_LINEWIDTH * 4} height={height + MARK_LINEWIDTH * 4} xmlns="http://www.w3.org/2000/svg">
                    <text ref={textElementRef} x={`${left}`} y={`${top + fontSize}`} 
                            className={`${merriweather.className}`} fontSize={`${fontSize}`} 
                            fill={`hsl(${primaryColor.hue},${primaryColor.sat}%,${primaryColor.lgt}%`}>
                        {text.length > MAX_TEXT_LENGTH? `${text.slice(0, MAX_TEXT_LENGTH-3)}...`: text}
                    </text>
                    <polyline stroke={markColor} points={`${left},${top + m} ${left},${top} ${left + l},${top}`} fill='none' />
                    <polyline stroke={markColor} points={`${left + mW - l},${top} ${left + mW},${top} ${left + mW},${top + m}`} fill='none' />
                    <polyline stroke={markColor} points={`${left + mW},${top + mH - m} ${left + mW},${top + mH} ${left + mW - l},${top + mH}`} fill='none' />
                    <polyline stroke={markColor} points={`${left + l},${top + mH} ${left},${top + mH} ${left},${top + mH - m}`} fill='none' />
                </svg>
            </div>
        );
    }
}
