import react from 'react';
import Item from './Item';
import Node from './Node';
import { HSL } from './Item';
import { getCyclicValue } from '../../../util/MathTools';
import { MIN_ROTATION } from '@/app/Constants';

export const DEFAULT_ANGLE = 10;
export const INCREMENT = 30; // the angle (in degrees) by which the angle of a new Ornament is increased when added to the same node.
export const DEFAULT_GAP = 2;
export const MIN_GAP = -999;
export const MAX_GAP = 999;
export const ROUNDING_DIGITS = 3;

/**
 * An Ornament is an object representing an 'ornament', such as a label, attached to a Node. Ornaments do not have their own Z-indices.
 * @abstract
 */
export default abstract class Ornament extends Item {
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
            <polyline
                stroke={markColor}
                points={`${left},${top + m} ${left},${top} ${left + l},${top}`}
                fill='none'
            />
            <polyline
                stroke={markColor}
                points={`${left + mW - l},${top} ${left + mW},${top} ${left + mW},${top + m}`}
                fill='none'
            />
            <polyline
                stroke={markColor}
                points={`${left + mW},${top + mH - m} ${left + mW},${top + mH} ${left + mW - l},${top + mH}`}
                fill='none'
            />
            <polyline
                stroke={markColor}
                points={`${left + l},${top + mH} ${left},${top + mH} ${left},${top + mH - m}`}
                fill='none'
            />
        </>
    );

    readonly node: Node; // The node to which this Ornament is attached
    angle: number = DEFAULT_ANGLE; // the preferred angle at which this Ornament is attached to this.node
    gap: number = DEFAULT_GAP;
    gap100: number = DEFAULT_GAP;

    width = 0;
    height = 0;

    /**
     * Creates a new Ornament that is then added to the supplied Node's array of Ornaments. The Ornament receives a unique ID, which is generated by
     * node.getNewOrnamentID().
     */
    constructor(node: Node) {
        const id = node.getNewOrnamentID();
        super(id);
        this.node = node;
        node.ornaments.push(this);
        const angle = DEFAULT_ANGLE + (node.ornaments.length - 1) * INCREMENT;
        this.angle = getCyclicValue(angle, MIN_ROTATION, 360, ROUNDING_DIGITS);
    }

    override isIndependent() {
        return false;
    }

    /**
     * Clones this Ornament. The clone is added to the supplied Node's array of Ornaments and receives a unique ID.
     * @abstract
     */
    abstract clone(node: Node): Ornament;

    protected copyValuesTo(target: Ornament) {
        target.group = this.group;
        target.isActiveMember = this.isActiveMember;
        target.angle = this.angle;
        target.gap = this.gap;
        target.gap100 = this.gap100;
    }

    /**
     * Returns a component that represents this Ornament on the canvas.
     * @abstract
     */
    abstract getComponent(
        key: number,
        {
            yOffset,
            unitScale,
            displayFontFactor,
            primaryColor,
            markColor,
            focus,
            selected,
            preselected,
            onMouseDown,
            onMouseEnter,
            onMouseLeave,
        }: OrnamentCompProps
    ): react.JSX.Element;
}

export interface OrnamentCompProps {
    yOffset: number;
    unitScale: number;
    displayFontFactor: number;
    primaryColor: HSL;
    markColor: string;
    focus: boolean;
    selected: boolean;
    preselected: boolean;
    onMouseDown: (item: Ornament, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    onMouseEnter: (item: Ornament, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    onMouseLeave: (item: Ornament, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}
