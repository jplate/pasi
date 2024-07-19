import Item from './Item'
import { Entry } from './ItemEditor.tsx'
import Group, { GroupMember } from './Group.tsx'
import ENode from './ENode.tsx'
import CNodeGroup from './CNodeGroup.tsx'
import * as Texdraw from '../../codec/Texdraw.tsx'

/**
 * The highest value that item parameters should be allowed to take (to prevent crashes).
 */
export const MAX_VALUE = 16384;     			
/**
 * The lowest value that item parameters should be allowed to take (to prevent crashes).
 */
export const MIN_VALUE = -MAX_VALUE; 
export const MAX_LINEWIDTH = 500;
export const MAX_DASH_LENGTH = 9999 // maximal length of dash array
export const MAX_DASH_VALUE = 9999 // maximum for a single value in a dash array

export const DEFAULT_LINEWIDTH = 1;
export const DEFAULT_DASH = [];
export const DEFAULT_SHADING = 0; // 0=white (transparent), 1=black
export const LINECAP_STYLE = 'round';
export const LINEJOIN_STYLE = 'round';

export const DEFAULT_HSL_LIGHT_MODE = {hue: 0, sat: 0, lgt: 19};
export const DEFAULT_HSL_DARK_MODE =  {hue: 30, sat: 100, lgt: 2};



export interface HSL {
    hue: number
    sat: number
    lgt: number
}


/**
 * This class corresponds to the class IndependentItem from the 2007 applet.
 * Nodes are Items with a specified center, linewidth, and shading.
 */
export default class Node extends Item {
    x: number // These coordinates are 'TeX coordinates': (0,0) is the bottom-left corner of the canvas.
    y: number
    x100: number // These coordinates represent the item's location at 100% scaling.
    y100: number
    linewidth: number = DEFAULT_LINEWIDTH
    linewidth100: number = DEFAULT_LINEWIDTH
    shading: number = DEFAULT_SHADING
    dash: number[] = DEFAULT_DASH
    dash100: number[] = DEFAULT_DASH


    constructor(id: string, x: number, y: number) {
        super(id);
        this.x = x;
        this.y = y;
        this.x100 = x;
        this.y100 = y;
    }

    public override getString() {
        return this.id;
    }

    public override getLeft() {
        return this.x;
    }
    
    public override getBottom() {
        return this.y;
    }

    public override reset() {
        this.linewidth = this.linewidth100 = DEFAULT_LINEWIDTH;
        this.dash = this.dash100 = DEFAULT_DASH;
        this.shading = DEFAULT_SHADING;
    }

    public override getTexdrawCode():string {
        return Texdraw.linewd(this.linewidth);
    }

    public override getInfoString(): string {
        return '';
    }

    public move(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
        this.x100 += dx;
        this.y100 += dy;
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


    /**
	 * Invoked by Codec1#load(); should be overridden by subclasses. Parses the supplied code and info string and updates this Item's fields 
     * accordingly.
	 * @param code the texdraw code.
	 * @param info the info string contained in the 'hint' in the comment to the texdraw code.
	 * @param name the name of this item (as given in the 'hint'), if available. Used for error messages.
	 */
	public parse(code: string, info: string, name?: string): void {}


}