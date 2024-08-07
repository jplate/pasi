import Group, { GroupMember } from './Group'
import ENode from './ENode'
import CNodeGroup from './CNodeGroup'
import { Entry } from './ItemEditor'

export interface HSL {
    hue: number
    sat: number
    lgt: number
}

export type Range = 'onlyThis' | 'wholeSelection' | 'ENodesAndCNodeGroups'; // This last value means that the editing function will be applied to only at most one CNode per CNodeGroup.

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
     * @param unitscale the ratio given to the \setunitscale command.
     * @param displayFontFactor
	 * @param name the name of this item (as given in the 'hint'), if available. Used for error messages.
	 */
	parse(code: string, info: string | null, unitscale?: number, ndisplayFontFactor?: number, ame?: string): void {}


    getInfo(list: (ENode | CNodeGroup)[]): Entry[] {
        return []
    }

    handleEditing(
            e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | number | null, 
            logIncrement: number, 
            selection: Item[],
            unitscale: number,
            displayFontFactor: number,
            key: string): [(item: Item, list: (ENode | CNodeGroup)[]) => (ENode | CNodeGroup)[], applyTo: Range] {
        // The function returned by handleEditing should take an Item and an array, modify the Item if desired, and return a (possibly) modified version of the array.
        return [(item, items) => items, 'onlyThis']
    }
}