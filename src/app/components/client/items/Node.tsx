import Item from './Item'
import Ornament from './Ornament'
import SNode from './SNode'
import * as Texdraw from '../../../codec/Texdraw'

export const MAX_LINEWIDTH = 500;
export const MAX_DASH_LENGTH = 9999 // maximal length of dash array
export const MAX_DASH_VALUE = 9999 // maximum for a single value in a dash array
export const MAX_NUMBER_OF_ORNAMENTS = 500;

export const DEFAULT_LINEWIDTH = 1;
export const DEFAULT_DASH = [];
export const DEFAULT_SHADING = 0; // 0=white (transparent), 1=black
export const LINECAP_STYLE = 'round';
export const LINEJOIN_STYLE = 'round';

export const DEFAULT_HSL_LIGHT_MODE = {hue: 0, sat: 0, lgt: 19};
export const DEFAULT_HSL_DARK_MODE =  {hue: 30, sat: 100, lgt: 2};


/**
 * Nodes are Items with a specified center, linewidth, dash pattern, and shading.
 * (This class corresponds to the class IndependentItem from the 2007 applet.)
 * @abstract
 */
export default abstract class Node extends Item {

    static markBorder = (left: number, top: number, l: number, m: number, mW: number, mH: number, markColor: string): JSX.Element => (
        <>
            <polyline stroke={markColor} points={`${left},${top + l} ${left + m},${top + m} ${left + l},${top}`} fill='none' />    
            <polyline stroke={markColor} points={`${left + mW - l},${top} ${left + mW - m},${top + m} ${left + mW},${top + l}`} fill='none' />
            <polyline stroke={markColor} points={`${left + mW},${top + mH - l} ${left + mW - m},${top + mH - m} ${left + mW - l},${top + mH}`} fill='none' />
            <polyline stroke={markColor} points={`${left + l},${top + mH} ${left + m},${top + mH - m} ${left},${top + mH - l}`} fill='none' />
        </>
    );

    x: number // These coordinates are 'TeX coordinates': (0,0) is the bottom-left corner of the canvas.
    y: number
    x100: number // These coordinates represent the item's location at 100% scaling.
    y100: number
    radius: number = 1;
    radius100: number = 1;
    linewidth: number = DEFAULT_LINEWIDTH
    linewidth100: number = DEFAULT_LINEWIDTH
    shading: number = DEFAULT_SHADING
    dash: number[] = DEFAULT_DASH
    dash100: number[] = DEFAULT_DASH

    ornaments: Ornament[] = [];
    dependentSNodes: SNode[] = []; // We keep a tally of the SNodes that have this Node as involute, for purposes of efficiency.

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

    /**
     * This normally just returns [this.x, this.y], but subclasses (such as SNode) may implement more sophisticated behavior. In particular, if the
     * location of this Node becomes invalidated for some reason, then getLocation() should update the location and store it in this.x and this.y.
     */
    getLocation() {
        return [this.x, this.y];
    }

    override getWidth() {
        return this.radius * 2; 
    }

    override getHeight() {
        return this.radius * 2;
    }

    override getBottomLeftCorner() {
        const [x, y] = this.getLocation();
        return { bottom: y - this.radius, left: x - this.radius };
    }

    override reset() {
        this.linewidth = this.linewidth100 = DEFAULT_LINEWIDTH;
        this.dash = this.dash100 = DEFAULT_DASH;
        this.shading = DEFAULT_SHADING;
        // We don't reset the radius to zero because the subclasses have their own default values.
    }

    override getTexdrawCode():string {
        return Texdraw.linewd(this.linewidth);
    }

    override getInfoString(): string {
        return '';
    }

    move(dx: number, dy: number): void {
        const [x, y] = this.getLocation(); // The idea is that getLocation() updates this.x and this.y if these should have become invalidated.
        this.x = x + dx;
        this.y = y + dy;
        this.x100 += dx;
        this.y100 += dy;
        this.invalidateDepSNodeLocations();
    }

    /**
     * Recursively invalidates the locations of all dependent SNodes.
     */
    invalidateDepSNodeLocations() {
        for (let node of this.dependentSNodes) {
            if (node.locationDefined) { // If the node's location is already invalidated, we assume that we don't have to do anything with it or its own dependent SNodes.
                node.locationDefined = false;
                node.invalidateDepSNodeLocations();
            }
        }
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