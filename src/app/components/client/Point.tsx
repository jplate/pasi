import React from 'react'
import Item, { HSL } from './Item.tsx'
import { H } from './MainPanel.tsx'

export const POINT_RADIUS = 4;

export default class Point extends Item {
    constructor(public x: number, public y: number) {
        super(`x${x}y${y}`, x, y)
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
