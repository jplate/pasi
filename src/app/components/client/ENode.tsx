import React from 'react'
import { DEFAULT_COLOR, DEFAULT_LINEWIDTH } from './Item.tsx'
import { H, MARK_LINEWIDTH } from './MainPanel.tsx'
import ENodeRep, { DEFAULT_RADIUS } from './ENodeRep.tsx'



interface ENodeProps {
    id: string,
    enode: ENodeRep,
    markColor: string,
    selected: number[],
    onMouseDown: (enode: ENodeRep, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void,
    focus: boolean,
    hidden?: boolean
}

const ENode = ({id, enode, markColor, selected = [], onMouseDown, focus = false,
        hidden = false}: ENodeProps) => {

    const x = enode.x;
    const y = enode.y;
    const radius = enode.radius;
    const lineWidth = enode.lineWidth;
    const shading = enode.shading;

    const width = radius*2.0;
    const height = radius*2.0;

    // coordinates (and dimensions) of the inner rectangle, relative to the div:
    const top = MARK_LINEWIDTH;
    const left = MARK_LINEWIDTH;
    const mW = width + lineWidth; // width and...
    const mH = height + lineWidth; // ...height relevant for drawing the 'mark border'
    const l = Math.min(Math.max(5, mW/5), 25);
    const m = hidden? 0.9*l: 0.0;

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        onMouseDown(enode, e);
    }

    console.log(`Rendering ${id}...`);

    return (
        <div className={focus? 'focused': selected.length>0? 'selected': 'unselected'} 
                onClick={(e) => e.stopPropagation()}
                onMouseDown = {handleMouseDown}
                style={{position: 'absolute', 
                        left: `${x-radius-MARK_LINEWIDTH-lineWidth/2}px`, 
                        top: `${H-y-radius-MARK_LINEWIDTH-lineWidth/2}px`}}>
            <svg width={width + MARK_LINEWIDTH*2 + lineWidth} height={height + MARK_LINEWIDTH*2 + lineWidth}> 
                <circle cx={radius + MARK_LINEWIDTH + lineWidth/2} 
                    cy={radius + MARK_LINEWIDTH + lineWidth/2} r={radius} 
                    fill={`rgba(0,0,0,${enode.shading})`}
                    stroke={DEFAULT_COLOR} 
                    strokeWidth={lineWidth} 
                    strokeDasharray={enode.dash} />
                <polyline points={`${left},${top+l} ${left+m},${top+m} ${left+l},${top}`} fill='none' />
                <polyline points={`${left+mW-l},${top} ${left+mW-m},${top+m} ${left+mW},${top+l}`} fill='none' />
                <polyline points={`${left+mW},${top+mH-l} ${left+mW-m},${top+mH-m} ${left+mW-l},${top+mH}`} fill='none' />
                <polyline points={`${left+l},${top+mH} ${left+m},${top+mH-m} ${left},${top+mH-l}`} fill='none' />
            </svg>
            {selected.length>0 && // Add a 'title'
                <div style={{position: 'absolute', left: '0', top: '0', width: `${mW + MARK_LINEWIDTH*2}px`, color: markColor, textAlign: 'center', 
                        fontSize: '9px', textWrap: 'nowrap', overflow: 'hidden', userSelect: 'none', pointerEvents: 'none', cursor: 'default'}} >
                    {selected.map(i => i+1).join(', ')}
                </div>}
        </div>
    );
}



export default ENode;