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
        public x: number, public y: number,   // These coordinates are 'TeX coordinates': (0,0) is the bottom-left corner of the canvas.
        public lineWidth: number = DEFAULT_LINEWIDTH, 
        public altLineWidth: number = DEFAULT_ALT_LINEWIDTH,
        public shading: number = DEFAULT_SHADING,
        public dash: string = DEFAULT_DASH) {
    }

    public getInfo(array: Item[]): Entry[] {
        return []
    }

    public handleEditing(e: React.ChangeEvent<HTMLInputElement> | null, index: number): [(item: Item, array: Item[]) => Item[], applyToAll: boolean] {
        // The array is supposed to be an array of Items relevant for this specific Item's class. The function returned by handleEditing
        // should take an Item and such an array, modify that Item if desired, and return a (possibly) modified version of the array.
        return [(item: Item, array) => array, false]
    }
}

