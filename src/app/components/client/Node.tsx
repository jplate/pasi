import Item from './Item'
import Ornament from './depItem/Ornament.tsx'
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



/**
 * This class corresponds to the class IndependentItem from the 2007 applet.
 * Nodes are Items with a specified center, linewidth, dash pattern, and shading.
 */
export default class Node extends Item {
    x: number // These coordinates are 'TeX coordinates': (0,0) is the bottom-left corner of the canvas.
    y: number
    x100: number // These coordinates represent the item's location at 100% scaling.
    y100: number
    radius: number = 0;
    radius100: number = 0;
    linewidth: number = DEFAULT_LINEWIDTH
    linewidth100: number = DEFAULT_LINEWIDTH
    shading: number = DEFAULT_SHADING
    dash: number[] = DEFAULT_DASH
    dash100: number[] = DEFAULT_DASH

    ornaments: Ornament[] = [];

    private ornamentCounter = 0; // for generating IDs for Ornaments


    constructor(id: string, x: number, y: number) {
        super(id);
        this.x = x;
        this.y = y;
        this.x100 = x;
        this.y100 = y;
    }

    override getString() {
        return this.id;
    }

    override getBottomLeftCorner() {
        return { bottom: this.y, left: this.x };
    }

    override reset() {
        this.linewidth = this.linewidth100 = DEFAULT_LINEWIDTH;
        this.dash = this.dash100 = DEFAULT_DASH;
        this.shading = DEFAULT_SHADING;
    }

    override getTexdrawCode():string {
        return Texdraw.linewd(this.linewidth);
    }

    override getInfoString(): string {
        return '';
    }

    move(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
        this.x100 += dx;
        this.y100 += dy;
    }

    setLinewidth(lw: number) {
        this.linewidth = this.linewidth100 = lw;
    }

    setShading(sh: number) {
        this.shading = sh;
    }

    setDash(dash: number[]) {
        this.dash = this.dash100 = dash;
    }

    getNewOrnamentID() {
        return `${this.id}-${this.ornamentCounter++}`;
    }


}