import Group, { GroupMember } from './Group'
import ENode from './ENode'
import CNodeGroup from './CNodeGroup'
import { Entry } from './ItemEditor'

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

    public getWidth() {
        return 0;
    }

    public getHeight() {
        return 0;
    }

    public getLeft() {
        return 0;
    }
    
    public getBottom() {
        return 0;
    }

    public reset() {
    }

    public getTexdrawCode():string {
        return '';
    }

    public getInfoString(): string {
        return '';
    }

    public getInfo(list: (ENode | CNodeGroup)[]): Entry[] {
        return []
    }

    public handleEditing(
            e: React.ChangeEvent<HTMLInputElement> | null, 
            logIncrement: number, 
            selection: Item[],
            key: string): [(item: Item, list: (ENode | CNodeGroup)[]) => (ENode | CNodeGroup)[], applyTo: Range] {
        // The function returned by handleEditing should take an Item and an array, modify the Item if desired, and return a (possibly) modified version of the array.
        return [(item, items) => items, 'onlyThis']
    }
}