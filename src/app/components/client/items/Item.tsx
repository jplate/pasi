import Group, { GroupMember } from '../Group'
import ENode from './ENode'
import CNodeGroup from '../CNodeGroup'
import { Entry } from '../ItemEditor'

export interface HSL {
    hue: number
    sat: number
    lgt: number
}

export type Range = 'onlyThis' | 'wholeSelection' | 'ENodesAndCNodeGroups'; // This last value means that the editing function will be applied to only 
    // at most one CNode per CNodeGroup.
    
/**
 * An Item represents a selectable and editable component on the canvas. This includes Nodes, Points, and Ornaments, but not connectors, which are not selected
 * or edited directly but only by selecting and editing their associated ENodes.
 */
export default class Item implements GroupMember {

    readonly id: string

    group: Group<Item | Group<any>> | null = null
    isActiveMember: boolean = false

    constructor(id: string) {
        this.id = id;
    }    

    getString() {
        return this.id;
    }

    getWidth() {
        return 0;
    }

    getHeight() {
        return 0;
    }

    getBottomLeftCorner() {
        return { bottom: 0, left: 0 };
    }
    
    reset() {
    }

    /** 
     * Returns the texdraw code for this Item. The supplied optional argument indicates the factor by which dimensions passed to LaTeX code (e.g., in \parbox
     * commands) should be multiplied.
     */
    getTexdrawCode(unitscale: number = 1): string {
        return '';
    }

    getInfoString(): string {
        return '';
    }

    /**
	 * Invoked by Codec1#load(); should be overridden by subclasses. Parses the supplied code and info string and updates this Item's fields 
     * accordingly.
	 * @param code the texdraw code.
	 * @param info the info string contained in the 'hint' in the comment to the texdraw code.
     * @param dimRatio a ratio to be applied to all dimensions read from the code and info string.
     * @param unitscale the ratio given to the \setunitscale command.
     * @param displayFontFactor
	 * @param name the name of this item (as given in the 'hint'), if available. Used for error messages.
	 */
	parse(code: string, info: string | null, dimRatio: number, unitscale?: number, displayFontFactor?: number, name?: string): void {}


    /**
     * @returns an array of Entries, to be supplied to ItemEditor.
     */
    getInfo(list: (ENode | CNodeGroup)[]): Entry[] {
        return []
    }

    /**
     * @param e Either a React.ChangeEvent whose target can be queried for a value, or a number that indicates a menu item, or null (which can be used if 
     * the input element is a simple toggle or check box).
     * @param logIncrement
     * @param selection
     * @param unitscale
     * @param displayFontFactor
     * @param key A string that helps determine just what function and string should be put into the return value.
     * @returns A tuple consisting of (i) a function that takes an Item and an array, modifies the Item if desired, and returns a (possibly) modified version 
     * of the array, and (ii) a string of type Range that indicates to what items this function should be applied.
     */
    handleEditing(
            e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | number | null, 
            logIncrement: number, 
            selection: Item[],
            unitscale: number,
            displayFontFactor: number,
            key: string
    ): [(item: Item, list: (ENode | CNodeGroup)[]) => (ENode | CNodeGroup)[], applyTo: Range] {
        return [(item, items) => items, 'onlyThis']
    }
}