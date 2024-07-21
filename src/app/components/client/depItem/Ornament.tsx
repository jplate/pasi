import react from 'react'
import Item from '../Item'
import Node from '../Node'
import { HSL } from '../Item'

export const DEFAULT_PREFERRED_ANGLE = 10;
export const DEFAULT_GAP = 2;
export const MIN_GAP = -9999
export const MAX_GAP = 9999
export const ROUNDING_DIGITS = 3


/**
 * An Ornament is an object representing an 'ornament', such as a label, attached to a Node. Ornaments do not have their own Z-indices.
 */
export default class Ornament extends Item {

    node: Node // The node to which this Ornament is attached
    angle: number = DEFAULT_PREFERRED_ANGLE // the preferred angle at which this Ornament is attached to this.node
    gap: number = DEFAULT_GAP
    gap100: number = DEFAULT_GAP

    width = 0;
    height = 0;

    constructor(node: Node) {
        const id = node.getNewOrnamentID();
        super(id);
        this.node = node;
        node.ornaments.push(this);
    }

    clone(node: Node) {
        const clone = new Ornament(node);
        this.copyValuesTo(clone);
        return clone;
    }

    protected copyValuesTo(target: Ornament) {
        target.group = this.group;
        target.isActiveMember = this.isActiveMember;
        target.angle = this.angle;
        target.gap = this.gap;
        target.gap100 = this.gap100;
    }

    getComponent(key: number, yOffset: number, primaryColor: HSL, markColor: string, focus: boolean, selected: boolean, preselected: boolean, 
        onMouseDown: (item: Ornament, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void,
        onMouseEnter: (item: Ornament, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void,
        onMouseLeave: (item: Ornament, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    ): react.JSX.Element {
        return <></>;
    }    

}

export interface OrnamentCompProps {    
    yOffset: number
    primaryColor: HSL
    markColor: string
    focus: boolean
    selected: boolean
    preselected: boolean
    onMouseDown: (item: Ornament, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    onMouseEnter: (item: Ornament, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    onMouseLeave: (item: Ornament, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}
