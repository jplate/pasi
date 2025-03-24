import Item, { Range } from './Item';
import ENode from './ENode';
import CNodeGroup from '../CNodeGroup';
import Ornament from './Ornament';
import { ROUNDING_DIGITS } from '../../../Constants';
import { round } from '../../../util/MathTools';
import * as Texdraw from '../../../codec/Texdraw';

export const MAX_LINEWIDTH = 32;
export const MAX_DASH_LENGTH = 9999; // maximal length of dash array
export const MAX_DASH_VALUE = 9999; // maximum for a single value in a dash array
export const MAX_NUMBER_OF_ORNAMENTS = 500;
export const MIN_DISTANCE = -9999; // minimal specifiable distance
export const MAX_DISTANCE = 9999; // maximal specifiable distance
export const MAX_RADIUS = 9999;
export const DEFAULT_DISTANCE = 10; // default distance (to a control point of a cubic curve)

export const DEFAULT_LINEWIDTH = 1;
export const DEFAULT_DASH: number[] = [];
export const DEFAULT_SHADING = 0; // 0=white (transparent), 1=black
export const LINECAP_STYLE = 'round';
export const LINEJOIN_STYLE = 'round';

export const DEFAULT_HSL_LIGHT_MODE = { hue: 0, sat: 0, lgt: 19 };
export const DEFAULT_HSL_DARK_MODE = { hue: 30, sat: 100, lgt: 2 };
export const MARK_BORDER_LINEWIDTH = 1;

export interface Info {
    e: React.ChangeEvent<HTMLInputElement> | null;
    logIncrement: number;
    selection: Item[];
}

export type Handler = {
    [key: string]: (
        i: Info
    ) => void | [(item: Item, list: (ENode | CNodeGroup)[]) => (ENode | CNodeGroup)[], applyTo: Range];
};

/**
 * @return a Set that contains the supplied Items together with their directly or indirectly 'dependent' Items, namely Ornaments and SNodes.
 */
export const addDependents = (
    items: Item[],
    includeOrnaments: boolean = true,
    acc = new Set<Item>(),
    visited = new Set<Node>()
): Set<Item> => {
    for (const it of items) {
        if (includeOrnaments || !(it instanceof Ornament)) {
            acc.add(it);
        }
        if (it instanceof Node && !visited.has(it)) {
            visited.add(it);
            if (includeOrnaments) {
                it.ornaments.forEach((o) => acc.add(o));
            }
            addDependents(it.dependentNodes, includeOrnaments, acc, visited);
        }
    }
    return acc;
};

/**
 * @return a Set that contains the supplied Item's directly or indirectly 'dependent' Items, namely Ornaments and SNodes.
 */
export const getDependents = (
    it: Item,
    includeOrnaments: boolean = true,
    acc = new Set<Item>(),
    visited = new Set<Node>()
): Set<Item> => {
    if (it instanceof Node && !visited.has(it)) {
        visited.add(it);
        if (includeOrnaments) {
            it.ornaments.forEach((o) => acc.add(o));
        }
        it.dependentNodes.forEach((dep) => {
            acc.add(dep);
            getDependents(dep, includeOrnaments, acc, visited);
        });
    }
    return acc;
};

/**
 * Nodes are Items with a specified center, linewidth, dash pattern, and shading.
 * (This class corresponds to the class IndependentItem from the 2007 applet.)
 * @abstract
 */
export default abstract class Node extends Item {
    static markBorder = (
        left: number,
        top: number,
        l: number,
        m: number,
        mW: number,
        mH: number,
        markColor: string
    ): JSX.Element => (
        <>
            {/* The stroke width is taken care of by a style applied to polyline elements that is specified in MainPanel's return statement. */}
            <polyline
                stroke={markColor}
                points={`${left},${top + l} ${left + m},${top + m} ${left + l},${top}`}
                fill='none'
            />
            <polyline
                stroke={markColor}
                points={`${left + mW - l},${top} ${left + mW - m},${top + m} ${left + mW},${top + l}`}
                fill='none'
            />
            <polyline
                stroke={markColor}
                points={`${left + mW},${top + mH - l} ${left + mW - m},${top + mH - m} ${left + mW - l},${top + mH}`}
                fill='none'
            />
            <polyline
                stroke={markColor}
                points={`${left + l},${top + mH} ${left + m},${top + mH - m} ${left},${top + mH - l}`}
                fill='none'
            />
        </>
    );

    x: number; // These coordinates are 'TeX coordinates': (0,0) is the bottom-left corner of the canvas.
    y: number;
    x100: number; // These coordinates represent the item's location at 100% scaling.
    y100: number;
    radius: number = 1;
    radius100: number = 1;
    linewidth: number = DEFAULT_LINEWIDTH;
    linewidth100: number = DEFAULT_LINEWIDTH;
    shading: number = DEFAULT_SHADING;
    dash = DEFAULT_DASH;
    dash100 = DEFAULT_DASH;

    ornaments: Ornament[] = [];
    dependentNodes: Node[] = []; // We keep a tally of the Nodes (typically, SNodes) that have this Node as involute, for purposes of efficiency.

    private ornamentCounter = 0; // for generating IDs for Ornaments

    /**
     * A flag indicating whether this.x and this.y give the actual location or need to be updated. Relevant for SNodes. The SNode constructor sets this to false.
     */
    locationDefined: boolean = true;

    /**
     * A map containing functions for editing this Item via the ItemEditor.
     */
    protected editHandler: Handler = {};

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
     * @param visited to prevent infinite loops.
     */
    getLocation(_visited: Set<Node> | null = null) {
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

    override getTexdrawCode(): string {
        return Texdraw.linewd(this.linewidth);
    }

    override getInfoString(): string {
        return '';
    }

    move(dx: number, dy: number): void {
        const [x, y] = this.getLocation(); // The idea is that getLocation() updates this.x and this.y if these should have become invalidated.
        if (dx !== 0) {
            // We round the new locations to avoid unnecessary decimals showing up in the editor pane:
            this.x = round(x + dx, ROUNDING_DIGITS);
            this.x100 = round(this.x100 + dx, ROUNDING_DIGITS);
        }
        if (dy !== 0) {
            this.y = round(y + dy, ROUNDING_DIGITS);
            this.y100 = round(this.y100 + dy, ROUNDING_DIGITS);
        }
        this.invalidateDepNodeLocations();
    }

    /**
     * Recursively invalidates the locations of all dependent SNodes.
     */
    invalidateDepNodeLocations() {
        for (const node of this.dependentNodes) {
            if (node.locationDefined) {
                // If the node's location is already invalidated, we assume that we don't have to do anything with it or its own dependent SNodes.
                node.locationDefined = false;
                node.invalidateDepNodeLocations();
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

    override handleEditing(
        e: React.ChangeEvent<HTMLInputElement> | null,
        logIncrement: number,
        selection: Item[],
        _unitScale: number,
        _displayFontFactor: number,
        key: string
    ): [(item: Item, list: (ENode | CNodeGroup)[]) => (ENode | CNodeGroup)[], applyTo: Range] {
        const dflt: [(item: Item, list: (ENode | CNodeGroup)[]) => (ENode | CNodeGroup)[], applyTo: Range] = [
            (_item, array) => array,
            'onlyThis',
        ];
        if (!(key in this.editHandler)) {
            console.warn(`key ${key} missing from edit handler of ${this.getString()}`);
            return dflt;
        } else {
            return this.editHandler[key]({ e, logIncrement, selection }) ?? dflt;
        }
    }
}
