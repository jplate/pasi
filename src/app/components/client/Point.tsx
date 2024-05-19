import React from 'react';
import {DEFAULT_COLOR} from './Item.ts';

export const POINT_RADIUS = 4;

interface PointProps {
    x: number,
    y: number,
    markColor: string,
    visible?: boolean,
}

const Point = ({x, y, markColor, visible = true}: PointProps) => {    
    return (
        <div style={{position: 'absolute', left: `${x-POINT_RADIUS}px`, top: `${y-POINT_RADIUS}px`}}>
                <svg width={POINT_RADIUS*2} height={POINT_RADIUS*2}> 
                    <circle cx={POINT_RADIUS} cy={POINT_RADIUS} r={visible? 0.5: 0} fill={DEFAULT_COLOR} />
                </svg>
                {visible && (
                    <svg width={POINT_RADIUS*2 + 2} height={POINT_RADIUS*2 + 2} // the 'border'
                            style={{position: 'absolute', left: '0', top: '0', marginTop: '-1px', marginLeft: '-1px'}}>
                        <rect x='1' y='1' width={POINT_RADIUS*2} height={POINT_RADIUS*2} fill='none' stroke={markColor}/>
                    </svg>
                )}
        </div>
    );
}
 

export default Point;