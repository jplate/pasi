import React from 'react'
import { HSL } from './items/Item.tsx'
import { H } from './MainPanel.tsx'

export const POINT_RADIUS = 4;

export default class Point {

    x: number // These coordinates are 'TeX coordinates': (0,0) is the bottom-left corner of the canvas.
    y: number

    id: string

    constructor(x: number, y: number) {
        this.id = (`x${x}y${y}`);
        this.x = x;
        this.y = y;
    }
}

interface PointProps {
    x: number
    y: number
    primaryColor: HSL
    markColor: string
    visible?: boolean
}

export const PointComp = ({x, y, primaryColor, markColor, visible = true}: PointProps) => {    
    return (
        <div style={{position: 'absolute', left: `${x-POINT_RADIUS}px`, top: `${H-y-POINT_RADIUS}px`}}>
                <svg width={POINT_RADIUS*2} height={POINT_RADIUS*2}> 
                    <circle cx={POINT_RADIUS} cy={POINT_RADIUS} r={visible? 0.5: 0} fill={`hsl(${primaryColor.hue},${primaryColor.sat}%,${primaryColor.lgt}%`} />
                </svg>
                {visible && 
                    <svg width={POINT_RADIUS*2 + 2} height={POINT_RADIUS*2 + 2} // the 'border'
                            style={{position: 'absolute', left: '0', top: '0', marginTop: '-1px', marginLeft: '-1px'}}>
                        <rect x='1' y='1' width={POINT_RADIUS*2} height={POINT_RADIUS*2} fill='none' stroke={markColor} />
                    </svg>
                }
        </div>
    );
}
