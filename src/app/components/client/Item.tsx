import type { Entry } from './ItemEditor.tsx'
import Group, { GroupMember } from './Group.tsx'
import ENode from './ENode.tsx'
import NodeGroup from './NodeGroup.tsx'
import { DashValidator } from './EditorComponents.tsx'

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
export const DEFAULT_DASH = [];
export const DEFAULT_SHADING = 0.0; // 0=white (transparent), 1=black

export const DEFAULT_HSL_LIGHT_MODE = {hue: 0, sat: 0, lgt: 19};
export const DEFAULT_HSL_DARK_MODE =  {hue: 30, sat: 100, lgt: 2};



export interface HSL {
    hue: number
    sat: number
    lgt: number
}

export type Range = 'onlyThis' | 'wholeSelection' | 'ENodesAndNodeGroups'; // This last value means that the editing function will be applied to only at most one CNode per NodeGroup.


/**
 * This class corresponds to the class IndependentItem from the 2007 applet.
 */
export default class Item implements GroupMember {
    readonly id: string
    x: number // These coordinates are 'TeX coordinates': (0,0) is the bottom-left corner of the canvas.
    y: number
    x100: number // These coordinates represent the item's location at 100% scaling.
    y100: number
    linewidth: number = DEFAULT_LINEWIDTH
    linewidth100: number = DEFAULT_LINEWIDTH
    shading: number = DEFAULT_SHADING
    dash: number[] = DEFAULT_DASH
    dash100: number[] = DEFAULT_DASH
    group: Group<Item | Group<any>> | null = null
    isActiveMember: boolean = false


    constructor(key: string, x: number, y: number) {
        this.id = key;
        this.x = x;
        this.y = y;
        this.x100 = x;
        this.y100 = y;
    }

    public getInfo(list: (ENode | NodeGroup)[]): Entry[] {
        return []
    }

    public handleEditing(
            e: React.ChangeEvent<HTMLInputElement> | null, 
            logIncrement: number, 
            selection: Item[],
            key: string): [(item: Item, list: (ENode | NodeGroup)[]) => (ENode | NodeGroup)[], applyTo: Range] {
        // The function returned by handleEditing should take an Item and an array, modify the Item if desired, and return a (possibly) modified version of the array.
        return [(item: Item, items) => items, 'onlyThis']
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

    public move(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
        this.x100 += dx;
        this.y100 += dy;
    }

    public getString() {
        return this.id
    }

    public setLinewidth(lw: number) {
        this.linewidth = this.linewidth100 = lw;
    }

    public setShading(sh: number) {
        this.shading = sh;
    }

    public setDash(dash: number[]) {
        this.dash = this.dash100 = dash;
    }

    public reset() {
        this.linewidth = this.linewidth100 = DEFAULT_LINEWIDTH;
        this.dash = this.dash100 = DEFAULT_DASH;
        this.shading = DEFAULT_SHADING;
    }

}

