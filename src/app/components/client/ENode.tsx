import React from 'react';
import {DEFAULT_COLOR, DEFAULT_LINEWIDTH} from './Item.ts';
import { MARK_LINEWIDTH, MARK_COLOR1 } from './MainPanel.tsx';

export const DEFAULT_RADIUS = 10;
export const D0 = 2*Math.PI/100; // absolute minimal angle between two contact points on the periphery of an ENode
export const D1 = 2*Math.PI/12; // 'comfortable' angle between two contact points on the periphery of an ENode
export const HALF_DISTANCE_PENALTY = 48;
export const SWITCH_PENALTY = 16;
export const SWITCH_TOLERANCE = 0.1;
export const DISTANCE_PENALTY = 4;
export const CLOSENESS_TO_BASE_ANGLE_PENALTY = 9;

type ENodeProps = {
    id: string,
    x: number,
    y: number,
    selected: number[],
    onMouseDown: (id: string, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void,
    focus: boolean,
    radius?: number,
    lineWidth?: number,
    hidden?: boolean
}

const ENode = ({id, x, y, selected = [], onMouseDown, focus = false,
        radius = DEFAULT_RADIUS, lineWidth =  DEFAULT_LINEWIDTH, hidden = false}: ENodeProps) => {

    // coordinates (and dimensions) of the inner rectangle, relative to the div:
    const top = MARK_LINEWIDTH;
    const left = MARK_LINEWIDTH;

    const width = radius*2.0;
    const height = radius*2.0;
    const l = Math.min(Math.max(5, width/5), 25);
    const m = hidden? 0.9*l: 0.0;

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        onMouseDown(id, e);
    }

    const title = selected.map(i => i+1).join(', ');

    console.log(`Rendering ${id}... title=[${title}]`);

    return (
        <div className={focus? 'focused': selected.length>0? 'selected': 'unselected'} 
                onClick={(e) => e.stopPropagation()}
                onMouseDown = {handleMouseDown}
                style={{position: 'absolute', left: `${x-radius-MARK_LINEWIDTH}px`, top: `${y-radius-MARK_LINEWIDTH}px`}}>
            <svg width={width + MARK_LINEWIDTH*2} height={height + MARK_LINEWIDTH*2}> 
                <circle cx={radius + MARK_LINEWIDTH} cy={radius + MARK_LINEWIDTH} r={radius} fill='none' 
                    stroke={DEFAULT_COLOR} strokeWidth={lineWidth}/>
                <polyline points={`${left},${top+l} ${left+m},${top+m} ${left+l},${top}`} fill='none' />
                <polyline points={`${left+width-l},${top} ${left+width-m},${top+m} ${left+width},${top+l}`} fill='none' />
                <polyline points={`${left+width},${top+height-l} ${left+width-m},${top+height-m} ${left+width-l},${top+height}`} fill='none' />
                <polyline points={`${left+l},${top+height} ${left+m},${top+height-m} ${left},${top+height-l}`} fill='none' />
            </svg>
            {selected.length>0 && 
                <div style={{position: 'absolute', left: '0', top: '0', width: `${width + MARK_LINEWIDTH*2}px`, color: MARK_COLOR1, textAlign: 'center', 
                        fontSize: '9px', textWrap: 'nowrap', overflow: 'hidden', userSelect: 'none', pointerEvents: 'none', cursor: 'default'}} >
                    {title}
                </div>}
        </div>
    );
}



export default ENode;