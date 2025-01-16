import React from 'react';
//import assert from 'assert' // pretty hefty package, and not really needed
import Item, { HSL, Range } from './Item';
import Node, {
    MAX_DASH_VALUE,
    MAX_DASH_LENGTH,
    DEFAULT_LINEWIDTH,
    MAX_LINEWIDTH,
    LINECAP_STYLE,
    LINEJOIN_STYLE,
    MAX_RADIUS,
    validateCoordinates,
    validateLinewidth,
    validateDash,
    validateShading,
    validateRadius,
} from './Node';
import { Entry, getRankMover } from '../ItemEditor';
import { H, MAX_X, MAX_Y, MIN_Y, MARK_LINEWIDTH, MIN_TRANSLATION_LOG_INCREMENT } from '../../../Constants';
import { validFloat, parseInputValue, DashValidator } from '../EditorComponents';
import CNodeGroup from '../CNodeGroup';
import * as Texdraw from '../../../codec/Texdraw';
import { ParseError, makeParseError } from '../../../codec/Texdraw';
import { encode, decode } from '../../../codec/General';
import { addAlpha } from '@/app/util/Misc';

export const DEFAULT_RADIUS = 12;
export const D0 = (2 * Math.PI) / 100; // absolute minimal angle between two contact points on the periphery of an ENode
export const D1 = (2 * Math.PI) / 12; // 'comfortable' angle between two contact points on the periphery of an ENode
export const HALF_DISTANCE_PENALTY = 48;
export const SWITCH_PENALTY = 16;
export const SWITCH_TOLERANCE = 0.1;
export const DISTANCE_PENALTY = 4;
export const CLOSENESS_TO_BASE_ANGLE_PENALTY = 9;

export const MIN_RADIUS_FOR_INNER_TITLE = 6;
export const TITLE_FONTSIZE = 9;
export const TITLE_BOTTOM_MARGIN = 1.5; // The margin at the bottom of a Node's 'title' if the latter appears *above* the mark border.

const GHOST_CENTER_OPACITY = 0.45;
const GHOST_PERIPHERAL_OPACITY = 0.05;

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
 * ENodes are 'entity nodes': they represent entities in the form of circles on the canvas.
 */
export default class ENode extends Node {
    protected dashValidator: DashValidator = new DashValidator(MAX_DASH_VALUE, MAX_DASH_LENGTH);

    constructor(i: number, x: number, y: number) {
        super(`E${i}`, x, y);
        this.radius = this.radius100 = DEFAULT_RADIUS;
    }

    /**
     * Overridden by SNode.
     */
    override isIndependent() {
        return true;
    }

    /**
     * Overridden by SNode.
     */
    isHidden(_: boolean): boolean {
        return false;
    }

    getSelectedPositions = (selection: Item[]) => {
        let result: number[] = [];
        let index = 0;
        selection.forEach((element) => {
            if (element === this) {
                result = [...result, index];
            }
            if (element instanceof ENode) {
                // if the element isn't an ENode, we're not counting it.
                index++;
            }
        });
        return result;
    };

    /**
     * Overridden by SNode.
     */
    getDefaultRadius() {
        return DEFAULT_RADIUS;
    }

    /**
     * Overridden by SNode.
     */
    getHiddenRadius(): number {
        return this.getDefaultRadius();
    }

    /**
     * Overridden (and called) by SNode. The reason why this method doesn't already appear in Node is that it's not exactly appropriate
     * for CNodes. Also, since this method is used for the purposes of copying an ENode, which typically involves some kind of displacement
     * (with regard to the X-coordinate, the Y-coordinate, or both), and since this displacement is taken care of in the constructor, we are
     * NOT copying the ENode's location.
     */
    copyValuesTo(target: ENode) {
        target.radius = this.radius;
        target.radius100 = this.radius100;
        target.linewidth = this.linewidth;
        target.linewidth100 = this.linewidth100;
        target.shading = this.shading;
        target.dash = this.dash;
        target.dash100 = this.dash100;
    }

    override reset() {
        super.reset();
        this.radius = this.radius100 = this.getDefaultRadius();
    }

    getNodeInfo(list: (ENode | CNodeGroup)[]): Entry[] {
        return [
            {
                type: 'number input',
                key: 'radius',
                text: 'Radius',
                width: 'long',
                value: this.radius,
                step: 1,
            },
            {
                type: 'number input',
                key: 'lw',
                text: 'Line width',
                width: 'medium',
                value: this.linewidth,
                step: 0.1,
            },
            {
                type: 'string input',
                key: 'dash',
                text: 'Stroke pattern',
                width: 'long',
                value: this.dashValidator.write(this.dash),
            },
            {
                type: 'number input',
                key: 'shading',
                text: 'Shading',
                width: 'medium',
                value: this.shading,
                min: 0,
                max: 1,
                step: 0.1,
            },
            { type: 'gloss', text: '(Shading=0: transparent; >0: opaque)', style: 'mb-4 text-right text-xs' },
            {
                type: 'number input',
                key: 'rank',
                text: 'Rank in paint-order',
                value: list.indexOf(this),
                step: 1,
            },
            { type: 'label', text: '', style: 'flex-1' }, // a filler
            { type: 'button', key: 'defaults', text: 'Defaults' },
        ];
    }

    getCoordinateInfo(): Entry[] {
        return [
            { type: 'number input', key: 'x', text: 'X-coordinate', width: 'long', value: this.x, step: 0 },
            { type: 'number input', key: 'y', text: 'Y-coordinate', width: 'long', value: this.y, step: 0 },
            { type: 'logIncrement', extraBottomMargin: true },
        ];
    }

    /**
     * Overridden by SNode and GNode.
     */
    override getInfo(list: (ENode | CNodeGroup)[]): Entry[] {
        return [...this.getCoordinateInfo(), ...this.getNodeInfo(list)];
    }

    commonEditHandler: Handler = {
        radius: ({ e }: Info) => {
            if (e)
                return [
                    (item, array) => {
                        if (item instanceof ENode) {
                            item.radius = item.radius100 = validFloat(e.target.value, 0, MAX_RADIUS, 0);
                            item.invalidateDepNodeLocations();
                        }
                        return array;
                    },
                    'wholeSelection',
                ];
        },
        lw: ({ e }: Info) => {
            if (e)
                return [
                    (item, array) => {
                        if (item instanceof Node)
                            item.setLinewidth(validFloat(e.target.value, 0, MAX_LINEWIDTH, 0));
                        return array;
                    },
                    'ENodesAndCNodeGroups',
                ];
        },
        dash: ({ e }: Info) => {
            if (e) {
                const dash = this.dashValidator.read(e.target);
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
            if (e)
                return [
                    (item, array) => {
                        if (item instanceof Node) item.setShading(validFloat(e.target.value, 0, 1));
                        return array;
                    },
                    'ENodesAndCNodeGroups',
                ];
        },
        rank: ({ e, selection }: Info) => {
            if (e) return [getRankMover(e.target.value, selection), 'onlyThis'];
        },
        defaults: () => [
            (item, array) => {
                item.reset();
                return array;
            },
            'wholeSelection',
        ],
    };

    editHandler: Handler = {
        x: ({ e, logIncrement, selection }: Info) => {
            if (e) {
                const dmin = -(selection.filter((item) => item instanceof Node) as Node[]).reduce(
                    (min, item) => (min < item.x ? min : item.x),
                    this.x
                );
                const delta =
                    parseInputValue(
                        e.target.value,
                        0,
                        MAX_X,
                        this.x,
                        logIncrement,
                        Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)
                    ) - this.x;
                const dx = delta > dmin ? delta : 0; // this is to avoid items from being moved beyond the left border of the canvas
                return [
                    (item, array) => {
                        if (item instanceof Node && dx !== 0) {
                            item.move(dx, 0);
                        }
                        return array;
                    },
                    'wholeSelection',
                ];
            }
        },
        y: ({ e, logIncrement }: Info) => {
            if (e) {
                const dy =
                    parseInputValue(
                        e.target.value,
                        MIN_Y,
                        MAX_Y,
                        this.y,
                        logIncrement,
                        Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)
                    ) - this.y;
                return [
                    (item, array) => {
                        if (item instanceof Node && !isNaN(dy) && dy !== 0) {
                            item.move(0, dy);
                        }
                        return array;
                    },
                    'wholeSelection',
                ];
            }
        },
        ...this.commonEditHandler,
    };

    /**
     * Overridden by SNode.
     */
    override handleEditing(
        e: React.ChangeEvent<HTMLInputElement> | null,
        logIncrement: number,
        selection: Item[],
        _unitScale: number,
        _displayFontFactor: number,
        key: string
    ): [(item: Item, list: (ENode | CNodeGroup)[]) => (ENode | CNodeGroup)[], applyTo: Range] {
        return this.editHandler[key]({ e, logIncrement, selection }) ?? [(_item, array) => array, 'onlyThis'];
    }

    /**
     * Overridden by SNode.
     */
    override getInfoString(): string {
        const lineDrawn = this.linewidth > 0; // This deviates from getTexdrawCode() below. But in SNode this will be overridden anyhow, since there
        // we won't have to include the information about the coordinates.
        return lineDrawn || this.shading > 0 ? '' : [this.radius, this.x, this.y].map(encode).join(' ');
    }

    /**
     * Overridden by SNode.
     */
    override getTexdrawCode(): string {
        return [
            super.getTexdrawCode(),
            this.shading > 0 || this.linewidth > 0 ? Texdraw.move(this.x, this.y) : '',
            this.shading > 0 ? Texdraw.fcirc(this.radius, this.shading) : '',
            this.dash.length > 0 ? Texdraw.lpatt(this.dash) : '',
            this.linewidth > 0 ? Texdraw.circ(this.radius) : '',
            this.dash.length > 0 ? Texdraw.lpatt([]) : '',
        ].join('');
    }

    /**
     * Overridden by SNode.
     */
    parseNodeInfoString(tex: string, info: string | null, dimRatio: number, name: string): void {
        if (info === null) {
            throw new ParseError(
                (
                    <span>
                        Incomplete definition of entity node <code>{name}</code>: info string required.
                    </span>
                )
            );
        }
        this.linewidth = this.linewidth100 = 0;
        this.dash = this.dash100 = (Texdraw.extractDashArray(tex) || []).map((v) => dimRatio * v);

        [this.radius, this.x, this.y] = info.split(/\s+/).map((s) => {
            const val = decode(s);
            if (!isFinite(val)) {
                throw makeParseError('Unexpected token in entity node configuration string', s);
            }
            return dimRatio * val;
        });
    }

    /**
     * Overridden by SNode.
     */
    extractCircles(stShapes: Texdraw.StrokedShape[], tex: string) {
        const circles: Texdraw.Circle[] = [];
        for (let i = 0; i < stShapes.length; i++) {
            if (i > 2) {
                throw makeParseError(`Expected a circle, not ${stShapes[i].shape.genericDescription}`, tex);
            }
            if (!(stShapes[i].shape instanceof Texdraw.Circle)) {
                throw makeParseError(`Expected a circle, not ${stShapes[i].shape.genericDescription}`, tex);
            }
            circles.push(stShapes[i].shape as Texdraw.Circle);
        }
        return circles;
    }

    /**
     * Configures this node according to the supplied array of shapes (which may or may not contain circles).
     * @return an array of the remaining shapes.
     * NOT overridden by SNode. Instead, SNode calls this from its own implementation of parse().
     */
    parseNode(
        stShapes: Texdraw.StrokedShape[],
        tex: string,
        info: string | null,
        dimRatio: number,
        name: string
    ): Texdraw.StrokedShape[] {
        const circles = this.extractCircles(stShapes, tex);
        const n = circles.length;

        if (n > 0) {
            this.shading = validateShading(circles[0].fillLevel, name);
            this.linewidth = this.linewidth100 = validateLinewidth(
                dimRatio * stShapes[n - 1].stroke.linewidth,
                name
            );
            this.dash = this.dash100 = validateDash(
                (this.linewidth > 0 // In this case the dash pattern can be got from the same shape:
                    ? stShapes[n - 1].stroke.pattern // If linewidth is zero, then there will be only one stroked shape (n will be equal
                    : // to 1), and we have to extract the dash pattern ourselves:
                      Texdraw.extractDashArray(tex) || []
                ).map((v) => dimRatio * v),
                name
            );
            this.radius = validateRadius(dimRatio * circles[0].radius, name);
            const { x, y } = circles[0].location;
            [this.x, this.y] = validateCoordinates(dimRatio * x, dimRatio * y, name);
        } else {
            // In this case there are no circles, so we have to rely in part on the info string, assuming there is one.
            this.parseNodeInfoString(tex, info, dimRatio, name);
        }

        [this.radius100, this.x100, this.y100] = [this.radius, this.x, this.y];

        return stShapes.slice(n);
    }

    /**
     *  The 'name' is the string by which this ENode is referred to in the 'hints' that appear as comments in the texdraw code.
     *  The calling function should make sure that this name is of reasonable length so that we don't have to worry about truncating it in our
     *  error messages.
     *
     *  Overridden by SNode.
     */
    override parse(
        tex: string,
        info: string | null,
        dimRatio: number,
        _unitScale?: number,
        _displayFontFactor?: number,
        name?: string
    ): void {
        const stShapes = Texdraw.getStrokedShapes(tex, DEFAULT_LINEWIDTH);
        this.parseNode(stShapes, tex, info, dimRatio, name ?? 'unnamed');
    }

    /**
     * Overridden by SNode, but also called from there.
     */
    getComponent({
        id,
        yOffset,
        unitScale,
        displayFontFactor,
        bg,
        primaryColor,
        markColor0,
        markColor1,
        titleColor,
        gradient,
        focusItem,
        selection,
        preselection,
        onMouseDown,
        onMouseEnter,
        onMouseLeave,
    }: ENodeCompProps) {
        const [x, y] = this.getLocation();
        const linewidth = this.linewidth;
        const shading = this.shading;
        const selectedPositions = this.getSelectedPositions(selection);
        // The parameter hiddenByDefault will be true if this method is called from the SNode override.
        const hidden = this.isHidden(selectedPositions.length > 0);
        const radius = hidden ? this.getHiddenRadius() : this.radius;

        const width = radius * 2;
        const height = radius * 2;
        const extraHeight = radius < MIN_RADIUS_FOR_INNER_TITLE ? TITLE_FONTSIZE + TITLE_BOTTOM_MARGIN : 0;

        // coordinates (and dimensions) of the inner rectangle, relative to the div:
        const top = MARK_LINEWIDTH + extraHeight;
        const left = MARK_LINEWIDTH;
        const mW = width + linewidth; // width and...
        const mH = height + linewidth; // ...height relevant for drawing the 'mark border'
        const l = Math.min(Math.max(5, mW / 5), 25);
        const m = hidden ? 0.9 * l : 0;

        return (
            <React.Fragment key={id}>
                <div
                    className={
                        focusItem === this
                            ? 'focused'
                            : selectedPositions.length > 0
                              ? 'selected'
                              : preselection.includes(this)
                                ? 'preselected'
                                : 'unselected'
                    }
                    id={id}
                    //onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => onMouseDown(this, e)}
                    onMouseEnter={(e) => onMouseEnter(this, e)}
                    onMouseLeave={(e) => onMouseLeave(this, e)}
                    style={{
                        position: 'absolute',
                        left: `${x - radius - MARK_LINEWIDTH - linewidth / 2}px`,
                        top: `${H + yOffset - y - radius - MARK_LINEWIDTH - linewidth / 2 - extraHeight}px`,
                        cursor: 'pointer',
                    }}
                >
                    <svg
                        width={width + MARK_LINEWIDTH * 2 + linewidth}
                        height={height + MARK_LINEWIDTH * 2 + linewidth + extraHeight}
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <defs>
                            <radialGradient id='Radial'>
                                <stop offset='0%' stopColor={addAlpha(markColor0, GHOST_CENTER_OPACITY)} />
                                <stop
                                    offset='100%'
                                    stopColor={addAlpha(markColor0, GHOST_PERIPHERAL_OPACITY)}
                                />
                            </radialGradient>
                        </defs>
                        {!hidden && (
                            <circle
                                cx={radius + MARK_LINEWIDTH + linewidth / 2}
                                cy={radius + MARK_LINEWIDTH + linewidth / 2 + extraHeight}
                                r={radius}
                                fill={
                                    gradient
                                        ? 'url(#Radial)'
                                        : shading == 0
                                          ? 'hsla(0,0%,0%,0)'
                                          : // Otherwise we assmilate the background color to the primary color, to the extent that shading approaches 1.
                                            `hsla(${bg.hue - Math.floor((bg.hue - primaryColor.hue) * shading)},` +
                                            `${bg.sat - Math.floor((bg.sat - primaryColor.sat) * shading)}%,` +
                                            `${bg.lgt - Math.floor((bg.lgt - primaryColor.lgt) * shading)}%,1)`
                                }
                                stroke={`hsl(${primaryColor.hue},${primaryColor.sat}%,${primaryColor.lgt}%`}
                                strokeWidth={linewidth}
                                strokeDasharray={this.dash.join(' ')}
                                strokeLinecap={LINECAP_STYLE}
                                strokeLinejoin={LINEJOIN_STYLE}
                            />
                        )}
                        {Node.markBorder(left, top, l, m, mW, mH, markColor1)}
                    </svg>
                    {selectedPositions.length > 0 && ( // Add a 'title'
                        <div
                            style={{
                                position: 'absolute',
                                left: '0',
                                top: '0',
                                width: `${mW + MARK_LINEWIDTH * 2}px`,
                                color: titleColor,
                                textAlign: 'center',
                                fontSize: `${TITLE_FONTSIZE}px`,
                                textWrap: 'nowrap',
                                overflow: 'hidden',
                                userSelect: 'none',
                                pointerEvents: 'none',
                                cursor: 'default',
                            }}
                        >
                            {selectedPositions.map((i) => i + 1).join(', ')}
                        </div>
                    )}
                </div>
                {this.ornaments.map((o, i) =>
                    o.getComponent(i, {
                        yOffset,
                        unitScale,
                        displayFontFactor,
                        primaryColor,
                        markColor: markColor0,
                        focus: focusItem === o,
                        selected: selection.includes(o),
                        preselected: preselection.includes(o),
                        onMouseDown,
                        onMouseEnter,
                        onMouseLeave,
                    })
                )}
            </React.Fragment>
        );
    }
}

export interface ENodeCompProps {
    id: string;
    yOffset: number;
    unitScale: number;
    displayFontFactor: number;
    bg: HSL;
    primaryColor: HSL;
    markColor0: string;
    markColor1: string;
    titleColor: string;
    gradient?: boolean;
    focusItem: Item | null;
    selection: Item[];
    preselection: Item[];
    onMouseDown: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    onMouseEnter: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    onMouseLeave: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}
