import React, { CSSProperties, useCallback, useMemo } from 'react';
import Item, { HSL } from './Item';
import Node, {
    Info,
    DEFAULT_DISTANCE,
    MIN_DISTANCE,
    MAX_DISTANCE,
    DEFAULT_LINEWIDTH,
    DEFAULT_DASH,
    DEFAULT_SHADING,
    MAX_LINEWIDTH,
} from './Node';
import ENode from './ENode';
import CNodeGroup, { getLine } from '../CNodeGroup';
import { getCoordinateHandler } from '../Moving';
import { Entry } from '../ItemEditor';
import { H, MARK_LINEWIDTH, MIN_TRANSLATION_LOG_INCREMENT, MIN_ROTATION } from '@/app/Constants';
import { validFloat, parseInputValue, parseCyclicInputValue } from '../EditorComponents';
import {
    getCyclicValue,
    cubicBezier,
    bezierLength,
    tAtLength,
    bezierAngle,
    angle,
} from '../../../util/MathTools';
import { MAX_ROTATION_INPUT, getRankMover } from '../ItemEditor';

const CNODE_MARK_RADIUS = 7; // Not the 'real' radius (which is 1), but only used for drawing the 'mark border'.
const CNODE_ARROW_DIV_RADIUS = 10;
export const MIN_DISTANCE_TO_NEXT_NODE_FOR_ARROW = 30;
const CNODE_ARROW_DISTANCE_RATIO = 0.3;
const CNODE_ARROW_DISTANCE_MIN = 15;
const CNODE_ARROW_DISTANCE_MAX = 40;
const CNODE_ARROW_POINTS = '6,10 5,7 15,10 5,13, 6,10';
const CNODE_ARROW_MITER_LIMIT = 5;

const fixedAnglesTooltip = (
    <>
        When this node is moved, each of its two neighbors will be moved in parallel with it unless the
        neighbor has exactly the same X- or Y-coordinate as this node.
    </>
);

const a0Tooltip = (
    <>
        The angle (in degrees) by which a straight line from this contour node to the second control point of
        the curve that connects the previous node to this one would deviate from a straight line to the
        previous node.
    </>
);

const a1Tooltip = (
    <>
        The angle (in degrees) by which a straight line from this contour node to the first control point of
        the curve that connects this node to the next would deviate from a straight line to the latter.
    </>
);

/**
 * CNodes ('contour nodes') are members of CNodeGroups ('contour node groups'). They define the shape and beheavior of contours. Although each CNode inherits
 * its own shading, linewidth, and dash pattern from the superclass, these values don't matter in practice. The relevant setter functions instead affect the
 * values of the node's CNodeGroup.
 */
export default class CNode extends Node {
    fixedAngles: boolean = true;
    omitLine: boolean = false;
    angle0: number = 0; // angle to control point 0
    angle1: number = 0; // angle to controle point 1
    dist0: number = DEFAULT_DISTANCE; // distance to control point 0
    dist1: number = DEFAULT_DISTANCE; // distance to control point 1
    dist0_100: number = DEFAULT_DISTANCE; // the 'original' distance to control point 0
    dist1_100: number = DEFAULT_DISTANCE; // the 'original' distance to control point 1
    numberOfCopies: number = 0; // to help generate unique ids

    constructor(id: string, x: number, y: number, a0: number, a1: number, group: CNodeGroup) {
        super(id, x, y);
        this.angle0 = a0;
        this.angle1 = a1;
        this.group = group;
        this.isActiveMember = true;
        this.editHandler = {
            ...getCoordinateHandler(this),
            fixed: () => {
                const fa = !this.fixedAngles;
                return [
                    (item, array) => {
                        if (item instanceof CNode) {
                            item.fixedAngles = fa;
                        }
                        return array;
                    },
                    'wholeSelection',
                ];
            },
            line: () => {
                const omit = !this.omitLine;
                return [
                    (item, array) => {
                        if (item instanceof CNode) {
                            item.omitLine = omit;
                        }
                        return array;
                    },
                    'wholeSelection',
                ];
            },
            a0: ({ e, logIncrement }: Info) => {
                if (e) {
                    const delta = parseCyclicInputValue(e.target.value, this.angle0, logIncrement)[1];
                    return [
                        (item, array) => {
                            if (!isNaN(delta) && delta !== 0 && item instanceof CNode) {
                                item.angle0 = getCyclicValue(
                                    item.angle0 + delta,
                                    MIN_ROTATION,
                                    360,
                                    10 ** Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)
                                );
                            }
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            },
            d0: ({ e, logIncrement }: Info) => {
                if (e) {
                    const d =
                        parseInputValue(
                            e.target.value,
                            MIN_DISTANCE,
                            MAX_DISTANCE,
                            this.dist0,
                            logIncrement,
                            Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)
                        ) - this.dist0;
                    return [
                        (item, array) => {
                            if (!isNaN(d) && d !== 0 && item instanceof CNode) {
                                item.dist0 = item.dist0_100 = item.dist0 + d;
                            }
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            },
            a1: ({ e, logIncrement }: Info) => {
                if (e) {
                    const delta = parseCyclicInputValue(e.target.value, this.angle1, logIncrement)[1];
                    return [
                        (item, array) => {
                            if (!isNaN(delta) && delta !== 0 && item instanceof CNode) {
                                item.angle1 = getCyclicValue(
                                    item.angle1 + delta,
                                    MIN_ROTATION,
                                    360,
                                    10 ** Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)
                                );
                            }
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            },
            d1: ({ e, logIncrement }: Info) => {
                if (e) {
                    const d =
                        parseInputValue(
                            e.target.value,
                            MIN_DISTANCE,
                            MAX_DISTANCE,
                            this.dist1,
                            logIncrement,
                            Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)
                        ) - this.dist1;
                    return [
                        (item, array) => {
                            if (!isNaN(d) && d !== 0 && item instanceof CNode) {
                                item.dist1 = item.dist1_100 = item.dist1 + d;
                            }
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            },
            lw: ({ e }: Info) => {
                if (e) {
                    return [
                        (item, array) => {
                            if (item instanceof Node)
                                item.setLinewidth(validFloat(e.target.value, 0, MAX_LINEWIDTH, 0));
                            return array;
                        },
                        'ENodesAndCNodeGroups',
                    ];
                }
            },
            dash: ({ e }: Info) => {
                if (e) {
                    const dash = (this.group as CNodeGroup).dashValidator.read(e.target);
                    return [
                        (item, array) => {
                            if (item instanceof Node) item.setDash(dash);
                            return array;
                        },
                        'ENodesAndCNodeGroups',
                    ];
                }
            },
            shading: ({ e }: Info) => {
                if (e) {
                    return [
                        (item, array) => {
                            if (item instanceof Node) item.setShading(validFloat(e.target.value, 0, 1));
                            return array;
                        },
                        'ENodesAndCNodeGroups',
                    ];
                }
            },
            rank: ({ e, selection }: Info) => {
                if (e) {
                    return [getRankMover(e.target.value, selection), 'onlyThis'];
                }
            },
            defaults: () => [
                (item, array) => {
                    item.reset();
                    return array;
                },
                'wholeSelection',
            ],
            angles: () => [
                (item, array) => {
                    if (item.group instanceof CNodeGroup) {
                        item.group.equalizeCentralAngles(item as CNode);
                    }
                    return array;
                },
                'ENodesAndCNodeGroups',
            ],
            distances: () => [
                (item, array) => {
                    if (item.group instanceof CNodeGroup) {
                        item.group.equalizeDistancesFromCenter(item as CNode);
                    }
                    return array;
                },
                'ENodesAndCNodeGroups',
            ],
        };
    }

    override isIndependent() {
        return true;
    }

    /**
     * @return true if either the supplied array is empty or, among the neighbors to each side of this CNode, up to the first node that is a member of
     * the array, there is a node that either does not have the fixedAngles property or is not a member of the array.
     */
    isFree(nodes: CNode[]) {
        const group = this.group;
        if (group instanceof CNodeGroup) {
            const index = group.members.indexOf(this);
            const members = group.members;
            const n = members.length;
            for (const inc of [-1, 1]) {
                for (let i = 1; i < group.members.length; i++) {
                    const j = index + i * inc;
                    const neighbor =
                        members[
                            j >= n
                                ? j - n // continuing with 0
                                : j < 0
                                  ? n + j // continuing with n - 1
                                  : j
                        ];
                    if (!neighbor.fixedAngles) {
                        break;
                    }
                    if (nodes.includes(neighbor)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    override setLinewidth(lw: number) {
        const group = this.group as CNodeGroup;
        group.linewidth = group.linewidth100 = lw;
    }

    override setShading(sh: number) {
        const group = this.group as CNodeGroup;
        group.shading = sh;
    }

    override setDash(dash: number[]) {
        const group = this.group as CNodeGroup;
        group.dash = group.dash100 = dash;
    }

    override reset() {
        super.reset();

        this.fixedAngles = true;
        this.omitLine = false;
        this.angle0 = this.angle1 = 0;
        this.dist0 = this.dist0_100 = this.dist1 = this.dist1_100 = DEFAULT_DISTANCE;

        const group = this.group as CNodeGroup;
        group.linewidth = group.linewidth100 = DEFAULT_LINEWIDTH;
        group.dash = group.dash100 = DEFAULT_DASH;
        group.shading = DEFAULT_SHADING;
    }

    override getInfo(list: (ENode | CNodeGroup)[]): Entry[] {
        const group = this.group as CNodeGroup;
        return [
            {
                type: 'checkbox',
                key: 'fixed',
                text: 'Keep angles fixed',
                value: this.fixedAngles,
                tooltip: fixedAnglesTooltip,
                tooltipPlacement: 'left',
            },
            { type: 'checkbox', key: 'line', text: 'No line to next node', value: this.omitLine },
            {
                type: 'number input',
                key: 'a0',
                text: 'Angle 1',
                width: 'long',
                value: this.angle0,
                step: 0,
                min: -MAX_ROTATION_INPUT,
                max: MAX_ROTATION_INPUT,
                tooltip: a0Tooltip,
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'd0',
                text: 'Distance 1',
                width: 'long',
                value: this.dist0,
                step: 0,
                tooltip:
                    'The distance from this contour node to the second control point of the curve that connects the previous node to this one.',
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'a1',
                text: 'Angle 2',
                width: 'long',
                value: this.angle1,
                step: 0,
                tooltip: a1Tooltip,
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'd1',
                text: 'Distance 2',
                width: 'long',
                value: this.dist1,
                step: 0,
                tooltip:
                    'The distance from this contour node to the first control point of the curve that connects it to the next.',
                tooltipPlacement: 'left',
            },
            { type: 'number input', key: 'x', text: 'X-coordinate', width: 'long', value: this.x, step: 0 },
            { type: 'number input', key: 'y', text: 'Y-coordinate', width: 'long', value: this.y, step: 0 },
            { type: 'logIncrement', extraBottomMargin: true },
            {
                type: 'number input',
                key: 'lw',
                text: 'Line width',
                width: 'medium',
                value: group.linewidth,
                step: 0.1,
            },
            {
                type: 'string input',
                key: 'dash',
                text: 'Stroke pattern',
                width: 'long',
                value: group.dashValidator.write(group.dash),
            },
            {
                type: 'number input',
                key: 'shading',
                text: 'Shading',
                width: 'medium',
                value: group.shading,
                min: 0,
                max: 1,
                step: 0.1,
            },
            {
                type: 'number input',
                key: 'rank',
                text: 'Rank in paint-order',
                value: list.indexOf(group),
                step: 1,
                extraBottomMargin: true,
            },
            { type: 'button', key: 'defaults', text: 'Defaults' },
            { type: 'button', key: 'angles', text: 'Equalize central angles', style: 'text-sm' },
            {
                type: 'button',
                key: 'distances',
                text: (
                    <>
                        Equalize distances
                        <br /> from center
                    </>
                ),
                style: 'text-sm',
            },
            { type: 'label', text: '', style: 'flex-1' }, // a filler to ensure that there's some margin at the bottom
        ];
    }

    override parse() {} // Since there are no texdraw commands corresponding to individual CNodes, there is nothing to parse.
}

interface ArrowDivProps {
    cnode: CNode;
    nodes: CNode[];
    yOffset: number;
    focus: boolean;
    selected: boolean;
    x: number;
    y: number;
    markColor: string;
}

const ArrowDiv = ({ cnode, nodes, yOffset, focus, selected, x, y, markColor }: ArrowDivProps) => {
    const index = nodes.indexOf(cnode);
    const next = nodes[index == nodes.length - 1 ? 0 : index + 1];
    const line = getLine(cnode, next);
    const r = CNODE_ARROW_DIV_RADIUS;
    let nx: number, ny: number, a: number;
    // The arrow should be aimed along the line to the next CNode, unless that line is omitted, in which case we let it point to the next CNode:
    if (cnode.omitLine) {
        const d = Math.sqrt((x - next.x) ** 2 + (y - next.y) ** 2); // distance to center of next CNode
        const factor =
            Math.min(
                Math.max(CNODE_ARROW_DISTANCE_MIN, d * CNODE_ARROW_DISTANCE_RATIO),
                CNODE_ARROW_DISTANCE_MAX
            ) / d;
        nx = x + (next.x - x) * factor - r;
        ny = y + (next.y - y) * factor + r;
        a = -angle(x, y, next.x, next.y);
    } else {
        const totalLength = bezierLength(line);
        const targetLength = Math.min(
            Math.max(CNODE_ARROW_DISTANCE_MIN, totalLength * CNODE_ARROW_DISTANCE_RATIO),
            CNODE_ARROW_DISTANCE_MAX
        );
        // The function tAtLength calculates t iteratively. We use smaller steps in proportion to the ratio by which totalLength exceeds targetLength:
        const t = tAtLength(line, targetLength, (100 * totalLength) / targetLength);
        const [bx, by] = cubicBezier(line, t);
        nx = bx - r;
        ny = by + r;
        a = -bezierAngle(line, t);
    }

    const arrowDivStyle = useMemo(
        () =>
            ({
                position: 'absolute',
                left: `${nx}px`,
                top: `${H + yOffset - ny}px`,
                pointerEvents: 'none',
            }) as CSSProperties,
        [nx, ny, yOffset]
    );

    return (
        <div className={focus || selected ? 'selected' : 'preselected'} style={arrowDivStyle}>
            <svg width={2 * r} height={2 * r} xmlns='http://www.w3.org/2000/svg'>
                <g opacity='0.5' transform={`rotate(${a} ${r} ${r})`}>
                    <polyline
                        stroke={markColor}
                        points={CNODE_ARROW_POINTS}
                        fill={markColor}
                        strokeMiterlimit={CNODE_ARROW_MITER_LIMIT}
                    />
                </g>
            </svg>
        </div>
    );
};

export interface CNodeCompProps {
    id: string;
    cnode: CNode;
    yOffset: number;
    unitScale: number;
    displayFontFactor: number;
    primaryColor: HSL; // needed for ornaments of CNodes
    markColor: string;
    focusItem: Item | null;
    selected: boolean;
    preselected: boolean;
    selection: Item[]; // needed for ornaments of CNodes
    preselection: Item[]; // ditto
    arrow: boolean; // indicates whether an arrow to the next CNodeComp should be displayed
    onMouseDown: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    onMouseEnter: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    onMouseLeave: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    rerender: boolean[] | null; // A new (empty) array will be passed if the component needs to rerender. The passing of this array will cause React to
    // rerender the component.
}

export const CNodeComp = React.memo(
    ({
        id,
        cnode,
        yOffset,
        unitScale,
        displayFontFactor,
        primaryColor,
        markColor,
        focusItem,
        selected,
        preselected,
        selection,
        preselection,
        arrow,
        onMouseDown,
        onMouseEnter,
        onMouseLeave,
    }: CNodeCompProps) => {
        const x = cnode.x;
        const y = cnode.y;
        const radius = CNODE_MARK_RADIUS;
        const focus = focusItem === cnode;

        // coordinates (and dimensions) of the inner rectangle, relative to the div:
        const top = MARK_LINEWIDTH / 2;
        const left = MARK_LINEWIDTH / 2;
        const mW = 2 * radius; // width and...
        const mH = 2 * radius; // ...height relevant for drawing the 'mark border'
        const l = Math.min(Math.max(5, mW / 5), 25);
        const m = 0.9 * l;

        const style = useMemo(
            () =>
                ({
                    position: 'absolute',
                    left: `${x - radius - MARK_LINEWIDTH / 2}px`,
                    top: `${H + yOffset - y - radius - MARK_LINEWIDTH / 2}px`,
                    cursor: 'pointer',
                }) as CSSProperties,
            [x, y, radius, yOffset]
        );

        const handleMouseDown = useCallback(
            (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => onMouseDown(cnode, e),
            [cnode, onMouseDown]
        );
        const handleMouseEnter = useCallback(
            (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => onMouseEnter(cnode, e),
            [cnode, onMouseEnter]
        );
        const handleMouseLeave = useCallback(
            (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => onMouseLeave(cnode, e),
            [cnode, onMouseLeave]
        );

        const markBorder = useMemo(
            () => Node.markBorder(left, top, l, m, mW, mH, markColor),
            [left, top, l, m, mW, mH, markColor]
        );

        const arrowDiv =
            arrow && cnode.group ? (
                <ArrowDiv
                    cnode={cnode}
                    nodes={(cnode.group as CNodeGroup).members}
                    yOffset={yOffset}
                    focus={focus}
                    selected={selected}
                    x={x}
                    y={y}
                    markColor={markColor}
                />
            ) : null;

        //console.log(`Rendering ${id}... x=${x}  y=${y}`);

        return (
            <>
                <div
                    className={
                        focus ? 'focused' : selected ? 'selected' : preselected ? 'preselected' : 'unselected'
                    }
                    id={id}
                    onMouseDown={handleMouseDown}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    style={style}
                >
                    <svg
                        width={mW + MARK_LINEWIDTH}
                        height={mH + MARK_LINEWIDTH}
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        {markBorder}
                    </svg>
                </div>
                {cnode.ornaments.map((o, i) =>
                    o.getComponent(i, {
                        yOffset,
                        unitScale,
                        displayFontFactor,
                        primaryColor,
                        markColor,
                        focus: focusItem === o,
                        selected: selection.includes(o),
                        preselected: preselection.includes(o),
                        onMouseDown,
                        onMouseEnter,
                        onMouseLeave,
                    })
                )}
                {arrowDiv}
            </>
        );
    }
);
CNodeComp.displayName = 'CNodeComp';
