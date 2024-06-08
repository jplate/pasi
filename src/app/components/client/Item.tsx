import type { Config, Entry } from './ItemEditor.tsx'
import Group, { GroupMember } from './Group.tsx'

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
export const MAX_LINEWIDTH = 999;
export const MAX_DASH_LENGTH = 9999 // maximal length of dash array
export const MAX_DASH_VALUE = 9999 // maximum for a single value in a dash array

export const DEFAULT_LINEWIDTH = 1.0;
export const DEFAULT_ALT_LINEWIDTH = .7;
export const DEFAULT_DASH = [];
export const DEFAULT_SHADING = 0.0; // 0=white (transparent), 1=black

export const DEFAULT_COLOR = '#323232';

export const DEFAULT_DIRECTION = COUNTERCLOCKWISE;


/**
 * This class corresponds to the class IndependentItem from the 2007 applet.
 */
export default class Item implements GroupMember {
    key: string
    x: number // These coordinates are 'TeX coordinates': (0,0) is the bottom-left corner of the canvas.
    y: number
    x100: number // These coordinates represent the item's location at 100% scaling.
    y100: number
    linewidth: number = DEFAULT_LINEWIDTH
    lineWidth100: number
    altLineWidth: number = DEFAULT_ALT_LINEWIDTH
    shading: number = DEFAULT_SHADING
    dash: number[] = DEFAULT_DASH
    dash100: number[] = DEFAULT_DASH
    group: Group<Item | Group<any>> | null = null
    isActiveMember: boolean = false

    constructor(key: string, x: number, y: number) {
        this.key = key
        this.x = x
        this.y = y
        this.x100 = x
        this.y100 = y
        this.lineWidth100 = this.linewidth
    }

    public getInfo(items: Item[], editorConfig: Object): Entry[] {
        return []
    }

    public handleEditing(
            e: React.ChangeEvent<HTMLInputElement> | null, 
            config: Config, 
            selection: Item[],
            index: number): [(item: Item, items: Item[]) => Item[], applyToAll: boolean] {
        // The function returned by handleEditing should take an Item and an array, modify the Item if desired, and return a (possibly) modified version of the array.
        // The boolean returned by handleEditing should be true iff the function should be applied to all elements of the current selection (a state variable of MainPanel).
        return [(item: Item, items) => items, false]
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

    public move(dx: number, dy: number) {
        this.x += dx;
        this.y += dy;
        this.x100 += dx;
        this.y100 += dy;
    }

    public getString() {
        return this.key
    }
}

