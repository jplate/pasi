import type { Entry } from './ItemEditor.tsx'

export const CLOCKWISE = 0;
export const COUNTERCLOCKWISE = 1;

/**
 * The highest value that item parameters should be allowed to take (to prevent crashes).
 */
export const MAX_VALUE = 16384;     			
/**
 * The lowest value that item parameters should be allowed to take (to prevent crashes).
 */
export const MIN_VALUE = -MAX_VALUE; 
export const DASH_STRING_LIMIT = 128;
export const MAX_LINEWIDTH = 99;

export const DEFAULT_LINEWIDTH = 1.0;
export const DEFAULT_ALT_LINEWIDTH = .7;
export const DEFAULT_DASH = '';
export const DEFAULT_SHADING = 0.0; // 0=white (transparent), 1=black

export const DEFAULT_COLOR = '#323232';

export const DEFAULT_DIRECTION = COUNTERCLOCKWISE;



export default class Item {
    constructor(public key: string, 
        public x: number, // These coordinates are 'TeX coordinates': (0,0) is the bottom-left corner of the canvas.
        public y: number,   
        public lineWidth: number = DEFAULT_LINEWIDTH, 
        public altLineWidth: number = DEFAULT_ALT_LINEWIDTH,
        public shading: number = DEFAULT_SHADING,
        public dash: string = DEFAULT_DASH) {
    }

    public getInfo(array: Item[]): Entry[] {
        return []
    }

    public handleEditing(e: React.ChangeEvent<HTMLInputElement> | null, index: number): [(item: Item, array: Item[]) => Item[], applyToAll: boolean] {
        // The function returned by handleEditing should take an Item and an array, modify the Item if desired, and return a (possibly) modified version of the array.
        // The boolean returned by handleEditing should be true iff the function should be applied to all elements of the current selection (a state variable of MainPanel).
        return [(item: Item, array) => array, false]
    }

    public getWidth() {
        return 0;
    }

    public getHeight() {
        return 0;
    }

    public getLeft() {
        return this.x;
    }
    
    public getBottom() {
        return this.y;
    }
}

