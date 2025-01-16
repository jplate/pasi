import Group, { GroupMember } from '../Group';
import ENode from './ENode';
import CNodeGroup from '../CNodeGroup';
import { Entry } from '../ItemEditor';

export interface HSL {
    hue: number;
    sat: number;
    lgt: number;
}

export type Direction = 'clockwise' | 'counter-clockwise';
export type Range = 'onlyThis' | 'wholeSelection' | 'ENodesAndCNodeGroups'; // This last value means that the editing function will be applied to only
// at most one CNode per CNodeGroup.

export const DEFAULT_DIRECTION: Direction = 'counter-clockwise';

/**
 * An Item represents a component located on the canvas that is either selectable or contributes texdraw code. This includes Nodes, Ornaments, and Connectors,
 * but neither CNodeGroups (which represent multiple components) nor Points (which are neither selectable nor contribute texdraw code).
 * @abstract
 */
export default abstract class Item implements GroupMember {
    readonly id: string;

    group: Group<Item | Group<any>> | null = null;
    isActiveMember: boolean = false;

    /**
     * The direction in which lines are bent and angles adjusted.
     */
    flexDirection = DEFAULT_DIRECTION;

    constructor(id: string) {
        this.id = id;
    }

    getString() {
        return this.id;
    }

    /**
     * Returns whether this Item's location depends on the locations of one or more other Items.
     */
    abstract isIndependent(): boolean;

    abstract getWidth(): number;
    abstract getHeight(): number;
    abstract getBottomLeftCorner(): { bottom: number; left: number };

    /**
     * Resets the fields of this Item to their default values.
     * @abstract
     */
    abstract reset(): void;

    /**
     * @returns the texdraw code for this Item. The supplied optional argument indicates the factor by which dimensions passed to LaTeX code (e.g., in \parbox
     * commands) should be multiplied.
     * @abstract
     */
    abstract getTexdrawCode(unitscale?: number): string;

    /**
     * @returns the 'configuration string' for this Item, which should be included in the comment attached to the Item's texdraw code.
     * @abstract
     */
    abstract getInfoString(): string;

    /**
     * Invoked by Codec1#load(). Parses the supplied code and info string and updates this Item's fields accordingly.
     * @abstract
     * @param code the texdraw code.
     * @param info the info string contained in the 'hint' in the comment to the texdraw code.
     * @param dimRatio a ratio to be applied to all dimensions read from the code and info string.
     * @param unitscale the ratio given to the \setunitscale command.
     * @param displayFontFactor
     * @param name the name of this item (as given in the 'hint'), if available. Used for error messages.
     */
    abstract parse(code: string, info: string | null, dimRatio: number, unitscale?: number, displayFontFactor?: number, name?: string): void;

    /**
     * @returns an array of Entries, to be supplied to ItemEditor.
     * @abstract
     */
    abstract getInfo(list: (ENode | CNodeGroup)[]): Entry[];

    /**
     * @returns A tuple consisting of (i) a function that takes an Item and an array, modifies the Item if desired, and returns a (possibly) modified version
     * of the array, and (ii) a string of type Range that indicates to what items this function should be applied.
     * @abstract
     * @param e Either a React.ChangeEvent whose target can be queried for a value, or a number that indicates a menu item, or null (which can be used if
     * the input element is a simple toggle or check box).
     * @param logIncrement
     * @param selection
     * @param unitscale
     * @param displayFontFactor
     * @param key A string that helps determine just what function and string should be put into the return value.
     */
    abstract handleEditing(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | number | null,
        logIncrement: number,
        selection: Item[],
        unitscale: number,
        displayFontFactor: number,
        key: string
    ): [(item: Item, list: (ENode | CNodeGroup)[]) => (ENode | CNodeGroup)[], applyTo: Range];
}
