import Item, { DEFAULT_LINEWIDTH, DEFAULT_DASH, DEFAULT_SHADING, MAX_LINEWIDTH } from './Item.tsx'
import { Entry } from './ItemEditor.tsx'

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


export default class ENodeRep extends Item {

    public radius: number = DEFAULT_RADIUS;
    
    constructor(key: string, x: number, y: number) {
        super(key, x, y);
    }

    public override getInfo(): Entry[] {
        return [
            {type: 'number', label: 'X', value: this.x, min: 0, max: MAX_X, step: 0.1},
            {type: 'number', label: 'Y', value: this.y, min: -MAX_Y, max: MAX_Y, step: 0.1},
            {type: 'number', label: 'Radius', value: this.radius, min: 0, max: MAX_RADIUS, step: 1},
            {type: 'number', label: 'Line width', value: this.lineWidth, min: 0, max: MAX_LINEWIDTH, step: 0.1},
            {type: 'string', label: 'Line pattern', value: this.dash},
            {type: 'number', label: 'Shading', value: this.shading, min: 0, max: 1, step: 0.1},
            {type: 'label', label: '', style: 'flex-1'}, // a filler
            {type: 'button', label: 'Defaults'}
        ]
    }

    public override handleEditing(e: React.ChangeEvent<HTMLInputElement> | null, index: number): void {
        switch(index) {
            case 0: if(e) {this.x = parseFloat(e.target.value); 
                    break;}
            case 1: if(e) {this.y = parseFloat(e.target.value);
                    break;}
            case 2: if(e) {this.radius = parseFloat(e.target.value); 
                    break;}
            case 3: if(e) {this.lineWidth = parseFloat(e.target.value);
                    break;}
            case 4: if(e) {this.dash = e.target.value;
                    break;}
            case 5: if(e) {this.shading = parseFloat(e.target.value);
                    break;}
            case 7: if(index==7) {
                    this.radius = DEFAULT_RADIUS;
                    this.lineWidth = DEFAULT_LINEWIDTH;
                    this.dash = DEFAULT_DASH;
                    this.shading = DEFAULT_SHADING;
                    break;}
            default: 
                console.log('Input element is null!  Index: '+index);
        
       }
    }
}

