import { useCallback, CSSProperties } from 'react';
import Item, { Range } from '@/app/components/client/items/Item';
import Ornament, {
    OrnamentCompProps,
    ROUNDING_DIGITS,
    MIN_GAP,
    MAX_GAP,
} from '@/app/components/client/items/Ornament';
import Node, {
    MAX_LINEWIDTH,
    MAX_DASH_LENGTH,
    MAX_DASH_VALUE,
    DEFAULT_LINEWIDTH,
    LINECAP_STYLE,
    LINEJOIN_STYLE,
} from '@/app/components/client/items/Node';
import ENode from '@/app/components/client/items/ENode';
import CNodeGroup from '@/app/components/client/CNodeGroup';
import { H, MARK_LINEWIDTH, MIN_ROTATION } from '@/app/Constants';
import { Entry } from '@/app/components/client/ItemEditor';
import {
    parseCyclicInputValue,
    parseInputValue,
    validFloat,
    DashValidator,
} from '@/app/components/client/EditorComponents';
import { getCyclicValue, round } from '@/app/util/MathTools';
import { Bounds, fSvg, svgShadingBlend } from '@/app/util/SvgTools';
import * as Texdraw from '@/app/codec/Texdraw';
import { ParseError } from '@/app/codec/Texdraw';
import { encode, decode } from '@/app/codec/General';

export const DEFAULT_ANGLE = -90;
export const MIN_WIDTH1 = 0;
export const MAX_WIDTH1 = 300;
export const MIN_WIDTH2 = 0;
export const MAX_WIDTH2 = 300;
export const MIN_HEIGHT = 0;
export const MAX_HEIGHT = 300;
export const MIN_DEPTH = 0;
export const MAX_DEPTH = 300;
export const DEFAULT_WIDTH1 = 8;
export const DEFAULT_WIDTH2 = 6;
export const DEFAULT_HEIGHT = 8;
export const DEFAULT_DEPTH = 2;
export const DEFAULT_SHADING = 1;

/**
 * This file was (for the most part) created by Claude Sonnet 5 (High) with the following prompt:
 * "OK, now let's add another ornament, described by Pointer.tsx (to be created). It again has a gap and an
 * angle parameter, and the angle parameter is by default, again, -90 degrees. In this position, a Pointer
 * looks like a capital Lambda pointing towards the center of the Node N that it is attached to. The outside
 * of this Lambda is given by two equally long straight lines meeting in a point P. At every angle, the
 * Pointer should point towards the center of N. The 'inside' of a Pointer is defined by a cubic Bézier
 * curve, whose two control points coincide on some point Q on the (undrawn) line from N's center through P.
 * The distance in pixels along this line from P to Q is one of the customizable parameters ('depth'). Two
 * other parameters, 'width 1' and 'width 2', give the distance in pixels between the outer points at the
 * base of the Lambda and the distance in pixels between the two end points of the cubic Bézier that defines
 * the Pointer's inner outline. These two points are joined to the outer two points by two straight line
 * segments that run perpendicular to the line from N's center through P. These two line segments are
 * segments of a single (undrawn) line crossing the line from N's center through P at a further point R. The
 * distance in pixels between P and R is a further customizable parameter, called 'height'. The remaining
 * three parameters are shading, line width, and stroke pattern. By default, the shading is 1. From the above
 * description, it can be inferred that a Pointer is a closed figure consisting of four straight lines and a
 * cubic Bézier curve. I've made a start by adding the entry "['P', Pointer]," to the ornamentPrefixMap in
 * Codec1.tsx (line 34). Good luck!"
 */

type Point = { x: number; y: number };

const gapTooltip = <>The distance between the node&rsquo;s circumference and the pointer&rsquo;s tip.</>;

const angleTooltip = (
    <>
        The angle at which this pointer is positioned (relative to the center of the node to which it is
        attached).
    </>
);

const width1Tooltip = <>The distance between the two outer points of the pointer&rsquo;s base.</>;

const width2Tooltip = <>The distance between the two inner points on the pointer&rsquo;s base.</>;

const heightTooltip = <>The distance between the tip of the pointer and the center of its base.</>;

const depthTooltip = (
    <>The distance between the tip of the pointer and the control point for the apex of its inner outline.</>
);

/**
 * A Pointer is an Ornament that manifests as a chevron-shaped ('capital Lambda') figure attached to a Node, whose tip always points
 * towards that Node's center. The outer boundary of the chevron is formed by two straight lines meeting at the tip; the inner boundary
 * is a cubic Bézier curve (both of whose control points coincide at a single point on the tip-to-center line), joined to the outer
 * boundary by two straight connecting segments.
 */
export default class Pointer extends Ornament {
    width1: number = DEFAULT_WIDTH1;
    width2: number = DEFAULT_WIDTH2;
    baseOffset: number = DEFAULT_HEIGHT; // the distance from the tip (P) to the base line (through R)
    depth: number = DEFAULT_DEPTH; // the distance from the tip (P) to the point (Q) that controls the curvature of the inner outline
    linewidth: number = DEFAULT_LINEWIDTH;
    shading: number = DEFAULT_SHADING;
    dash: number[] = [];

    private dashValidator: DashValidator = new DashValidator(MAX_DASH_VALUE, MAX_DASH_LENGTH);

    /**
     * Creates a new Pointer, which is added (via the superclass constructor) to the supplied Node's array of Ornaments.
     * It also receives a unique ID.
     */
    constructor(node: Node) {
        super(node);
        this.angle = DEFAULT_ANGLE;
        this.width1 = DEFAULT_WIDTH1;
        this.width2 = DEFAULT_WIDTH2;
        this.baseOffset = DEFAULT_HEIGHT;
        this.depth = DEFAULT_DEPTH;
    }

    override clone(node: Node) {
        const clone = new Pointer(node);
        this.copyValuesTo(clone);
        return clone;
    }

    protected override copyValuesTo(target: Pointer) {
        super.copyValuesTo(target);
        target.width1 = this.width1;
        target.width2 = this.width2;
        target.baseOffset = this.baseOffset;
        target.depth = this.depth;
        target.linewidth = this.linewidth;
        target.shading = this.shading;
        target.dash = this.dash;
    }

    /**
     * @return the six points that determine this Pointer's outline: the tip (P), the two outer base corners (A, B), the two
     * endpoints of the curve defining the inner outline (C1, C2), and the point (Q) that determines that curve's curvature.
     * (The point R, which lies on the tip-to-center line and through which the base line passes, is not itself part of the
     * outline, but is included since it helps define the other points.)
     */
    #getGeometry(): { P: Point; A: Point; B: Point; C1: Point; C2: Point; Q: Point; R: Point } {
        const angleRad = (this.angle / 180) * Math.PI;
        const u: Point = { x: Math.cos(angleRad), y: Math.sin(angleRad) }; // points away from the node, along the attachment angle
        const v: Point = { x: -Math.sin(angleRad), y: Math.cos(angleRad) }; // perpendicular to u
        const r = this.node.radius + this.node.linewidth / 2 + this.gap;
        const [nx, ny] = this.node.getLocation();
        const P: Point = { x: nx + u.x * r, y: ny + u.y * r };
        const R: Point = { x: P.x + u.x * this.baseOffset, y: P.y + u.y * this.baseOffset };
        const Q: Point = { x: P.x + u.x * this.depth, y: P.y + u.y * this.depth };
        const A: Point = { x: R.x + v.x * (this.width1 / 2), y: R.y + v.y * (this.width1 / 2) };
        const B: Point = { x: R.x - v.x * (this.width1 / 2), y: R.y - v.y * (this.width1 / 2) };
        const C1: Point = { x: R.x + v.x * (this.width2 / 2), y: R.y + v.y * (this.width2 / 2) };
        const C2: Point = { x: R.x - v.x * (this.width2 / 2), y: R.y - v.y * (this.width2 / 2) };
        return { P, A, B, C1, C2, Q, R };
    }

    /**
     * @return the bounding box of this Pointer's outline. Since the cubic Bézier curve that defines the inner outline lies within
     * the convex hull of its (here: three distinct) control points, taking the bounds of all the relevant points -- including Q --
     * yields a bounding box that is guaranteed to contain the entire outline.
     */
    #getBounds(): Bounds {
        const { P, A, B, C1, C2, Q } = this.#getGeometry();
        const xs = [P.x, A.x, B.x, C1.x, C2.x, Q.x];
        const ys = [P.y, A.y, B.y, C1.y, C2.y, Q.y];
        return {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys),
        };
    }

    override getWidth() {
        const { minX, maxX } = this.#getBounds();
        return maxX - minX;
    }

    override getHeight() {
        const { minY, maxY } = this.#getBounds();
        return maxY - minY;
    }

    override getBottomLeftCorner() {
        const { minX, minY } = this.#getBounds();
        return { bottom: minY, left: minX };
    }

    override getInfo(): Entry[] {
        return [
            {
                type: 'number input',
                key: 'gap',
                text: 'Gap',
                width: 'medium',
                value: this.gap,
                step: 0,
                tooltip: gapTooltip,
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'angle',
                text: 'Position angle',
                width: 'medium',
                value: this.angle,
                step: 0,
                tooltip: angleTooltip,
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'width1',
                text: 'Width 1',
                width: 'medium',
                value: this.width1,
                step: 1,
                tooltip: width1Tooltip,
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'width2',
                text: 'Width 2',
                width: 'medium',
                value: this.width2,
                step: 1,
                tooltip: width2Tooltip,
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'height',
                text: 'Height',
                width: 'medium',
                value: this.baseOffset,
                step: 1,
                tooltip: heightTooltip,
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'depth',
                text: 'Depth',
                width: 'medium',
                value: this.depth,
                step: 1,
                tooltip: depthTooltip,
                tooltipPlacement: 'left',
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
            { type: 'gloss', text: '(Shading=0: transparent; >0: opaque)', style: 'text-right text-xs' },
        ];
    }

    override handleEditing(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | number | null,
        _logIncrement: number,
        _selection: Item[],
        _unitScale: number,
        _displayFontFactor: number,
        key: string
    ): [(item: Item, list: (ENode | CNodeGroup)[]) => (ENode | CNodeGroup)[], applyTo: Range] {
        switch (key) {
            case 'angle':
                if (e && typeof e === 'object') {
                    const delta = parseCyclicInputValue(e.target.value, this.angle, 1)[1];
                    return [
                        (item, array) => {
                            if (!isNaN(delta) && delta !== 0 && item instanceof Pointer) {
                                item.angle = getCyclicValue(
                                    item.angle + delta,
                                    MIN_ROTATION,
                                    360,
                                    10 ** ROUNDING_DIGITS
                                );
                            }
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            case 'gap':
                if (e && typeof e === 'object') {
                    const d =
                        parseInputValue(e.target.value, MIN_GAP, MAX_GAP, this.gap, 0, ROUNDING_DIGITS) -
                        this.gap;
                    return [
                        (item, array) => {
                            if (!isNaN(d) && d !== 0 && item instanceof Ornament) {
                                item.gap = item.gap100 = round(item.gap + d, ROUNDING_DIGITS);
                            }
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            case 'width1':
                if (e && typeof e === 'object') {
                    const val = validFloat(e.target.value, MIN_WIDTH1, MAX_WIDTH1, this.width1);
                    return [
                        (item, array) => {
                            if (item instanceof Pointer) item.width1 = val;
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            case 'width2':
                if (e && typeof e === 'object') {
                    const val = validFloat(e.target.value, MIN_WIDTH2, MAX_WIDTH2, this.width2);
                    return [
                        (item, array) => {
                            if (item instanceof Pointer) item.width2 = val;
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            case 'height':
                if (e && typeof e === 'object') {
                    const val = validFloat(e.target.value, MIN_HEIGHT, MAX_HEIGHT, this.baseOffset);
                    return [
                        (item, array) => {
                            if (item instanceof Pointer) item.baseOffset = val;
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            case 'depth':
                if (e && typeof e === 'object') {
                    const val = validFloat(e.target.value, MIN_DEPTH, MAX_DEPTH, this.depth);
                    return [
                        (item, array) => {
                            if (item instanceof Pointer) item.depth = val;
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            case 'lw':
                if (e && typeof e === 'object') {
                    const val = validFloat(e.target.value, 0, MAX_LINEWIDTH, this.linewidth);
                    return [
                        (item, array) => {
                            if (item instanceof Pointer) item.linewidth = val;
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            case 'dash':
                if (e && typeof e === 'object') {
                    const dash = this.dashValidator.read(e.target as HTMLInputElement);
                    return [
                        (item, array) => {
                            if (item instanceof Pointer) item.dash = dash;
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            case 'shading':
                if (e && typeof e === 'object') {
                    const val = validFloat(e.target.value, 0, 1, this.shading);
                    return [
                        (item, array) => {
                            if (item instanceof Pointer) item.shading = val;
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            default:
                return [(_item, array) => array, 'onlyThis'];
        }
    }

    override reset() {} // Since there is no reset button in the editor, we don't need to do anything here.

    override getInfoString(): string {
        return [
            this.gap,
            this.angle,
            this.width1,
            this.width2,
            this.baseOffset,
            this.depth,
            this.linewidth,
            this.shading,
            this.dash.length,
            ...this.dash,
        ]
            .map(encode)
            .join(' ');
    }

    override getTexdrawCode(): string {
        if (this.linewidth <= 0 && this.shading <= 0) return '';
        const { P, A, B, C1, C2, Q } = this.#getGeometry();
        const p0 = new Texdraw.Point2D(P.x, P.y);
        const a = new Texdraw.Point2D(A.x, A.y);
        const b = new Texdraw.Point2D(B.x, B.y);
        const c1 = new Texdraw.Point2D(C1.x, C1.y);
        const c2 = new Texdraw.Point2D(C2.x, C2.y);
        const q = new Texdraw.Point2D(Q.x, Q.y);
        const shapes = [
            new Texdraw.Line(p0, a),
            new Texdraw.Line(a, c1),
            new Texdraw.CubicCurve(c1, q, q, c2),
            new Texdraw.Line(c2, b),
            new Texdraw.Line(b, p0),
        ];
        return Texdraw.getCommandSequence(shapes, shapes, false, this.linewidth, this.dash, this.shading);
    }

    override parse(
        _tex: string,
        info: string | null,
        dimRatio: number,
        _unitScale?: number,
        _displayFontFactor?: number,
        name?: string
    ) {
        if (info === null) {
            throw new ParseError(
                <span>Incomplete definition of pointer attached to {name}: info string required.</span>
            );
        }
        const split = info.split(/\s+/).filter((s) => s.length > 0);
        if (split.length < 9) {
            throw new ParseError(
                <span>
                    Pointer configuration string should contain at least nine elements, not {split.length}.
                </span>
            );
        }
        const values = split.map((s) => {
            const val = decode(s);
            if (!isFinite(val)) {
                throw Texdraw.makeParseError('Unexpected token in pointer configuration string', s);
            }
            return val;
        });
        const [gap, angle, width1, width2, height, depth, linewidth, shading, dashLength] = values;
        const dash = values.slice(9);
        if (dashLength !== dash.length) {
            throw new ParseError(
                <span>
                    Illegal data in definition of ornament attached to {name}: dash array length {dashLength}{' '}
                    does not match number of values found ({dash.length}).
                </span>
            );
        }

        const scaledGap = dimRatio * gap;
        if (scaledGap < MIN_GAP) {
            throw new ParseError(
                <span>
                    Illegal data in definition of ornament attached to {name}: gap {scaledGap} below minimum
                    value.
                </span>
            );
        } else if (scaledGap > MAX_GAP) {
            throw new ParseError(
                <span>
                    Illegal data in definition of ornament attached to {name}: gap {scaledGap} exceeds maximum
                    value.
                </span>
            );
        }
        this.gap = scaledGap;
        this.angle = getCyclicValue(angle, MIN_ROTATION, 360, Texdraw.ROUNDING_DIGITS);

        const scaledWidth1 = dimRatio * width1;
        if (scaledWidth1 < MIN_WIDTH1 || scaledWidth1 > MAX_WIDTH1) {
            throw new ParseError(
                <span>
                    Illegal data in definition of ornament attached to {name}: width1 {scaledWidth1} out of
                    range.
                </span>
            );
        }
        this.width1 = scaledWidth1;

        const scaledWidth2 = dimRatio * width2;
        if (scaledWidth2 < MIN_WIDTH2 || scaledWidth2 > MAX_WIDTH2) {
            throw new ParseError(
                <span>
                    Illegal data in definition of ornament attached to {name}: width2 {scaledWidth2} out of
                    range.
                </span>
            );
        }
        this.width2 = scaledWidth2;

        const scaledHeight = dimRatio * height;
        if (scaledHeight < MIN_HEIGHT || scaledHeight > MAX_HEIGHT) {
            throw new ParseError(
                <span>
                    Illegal data in definition of ornament attached to {name}: height {scaledHeight} out of
                    range.
                </span>
            );
        }
        this.baseOffset = scaledHeight;

        const scaledDepth = dimRatio * depth;
        if (scaledDepth < MIN_DEPTH || scaledDepth > MAX_DEPTH) {
            throw new ParseError(
                <span>
                    Illegal data in definition of ornament attached to {name}: depth {scaledDepth} out of
                    range.
                </span>
            );
        }
        this.depth = scaledDepth;

        const scaledLinewidth = dimRatio * linewidth;
        if (scaledLinewidth < 0 || scaledLinewidth > MAX_LINEWIDTH) {
            throw new ParseError(
                <span>
                    Illegal data in definition of ornament attached to {name}: line width {scaledLinewidth}{' '}
                    out of range.
                </span>
            );
        }
        this.linewidth = scaledLinewidth;

        if (shading < 0 || shading > 1) {
            throw new ParseError(
                <span>
                    Illegal data in definition of ornament attached to {name}: shading value {shading} out of
                    range.
                </span>
            );
        }
        this.shading = shading;

        if (dash.length > MAX_DASH_LENGTH) {
            throw new ParseError(
                <span>
                    Illegal data in definition of ornament attached to {name}: dash array length {dash.length}{' '}
                    exceeds maximum value.
                </span>
            );
        }
        const scaledDash = dash.map((v) => dimRatio * v);
        let val;
        if (scaledDash.some((v) => v < 0)) {
            throw new ParseError(
                <span>
                    Illegal data in definition of ornament attached to {name}: dash value should not be
                    negative.
                </span>
            );
        } else if (scaledDash.some((v) => (val = v) > MAX_DASH_VALUE)) {
            throw new ParseError(
                <span>
                    Illegal data in definition of ornament attached to {name}: dash value {val} exceeds
                    maximum value.
                </span>
            );
        }
        this.dash = scaledDash;
    }

    #getPathString(toX: (x: number) => string, toY: (y: number) => string): string {
        const { P, A, B, C1, C2, Q } = this.#getGeometry();
        return (
            `M ${toX(P.x)} ${toY(P.y)} L ${toX(A.x)} ${toY(A.y)} L ${toX(C1.x)} ${toY(C1.y)} ` +
            `C ${toX(Q.x)} ${toY(Q.y)}, ${toX(Q.x)} ${toY(Q.y)}, ${toX(C2.x)} ${toY(C2.y)} ` +
            `L ${toX(B.x)} ${toY(B.y)} Z`
        );
    }

    override getSvgBounds(): Bounds | null {
        if (this.linewidth <= 0 && this.shading <= 0) return null;
        const { minX, maxX, minY, maxY } = this.#getBounds();
        const lwc = this.linewidth / 2;
        return { minX: minX - lwc, maxX: maxX + lwc, minY: minY - lwc, maxY: maxY + lwc };
    }

    override getSvg(transX: (x: number) => number, transY: (y: number) => number): string {
        if (this.linewidth <= 0 && this.shading <= 0) return '';
        const d = this.#getPathString(
            (x) => fSvg(transX(x)),
            (y) => fSvg(transY(y))
        );
        const fill = this.shading > 0 ? `fill="${svgShadingBlend(this.shading)}"` : 'fill="none"';
        const stroke =
            this.linewidth > 0
                ? ` stroke="currentColor" stroke-width="${fSvg(this.linewidth)}" ` +
                  (this.dash.length > 0 ? `stroke-dasharray="${this.dash.join(' ')}" ` : '') +
                  `stroke-linecap="${LINECAP_STYLE}" stroke-linejoin="${LINEJOIN_STYLE}"`
                : '';
        return `<path d="${d}" ${fill}${stroke}/>`;
    }

    override getComponent(
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
    ) {
        return (
            <this.Component
                key={key}
                yOffset={yOffset}
                unitScale={unitScale}
                displayFontFactor={displayFontFactor}
                primaryColor={primaryColor}
                markColor={markColor}
                focus={focus}
                selected={selected}
                preselected={preselected}
                onMouseDown={onMouseDown}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            />
        );
    }

    /* eslint-disable react-hooks/rules-of-hooks */
    protected Component = ({
        yOffset,
        primaryColor,
        markColor,
        focus,
        selected,
        preselected,
        onMouseDown,
        onMouseEnter,
        onMouseLeave,
    }: OrnamentCompProps) => {
        const bounds = this.#getBounds();
        const w = bounds.maxX - bounds.minX;
        const h = bounds.maxY - bounds.minY;
        const lw = this.linewidth;
        const divLeft = bounds.minX - lw / 2 - MARK_LINEWIDTH;
        const divTop = H + yOffset - bounds.maxY - lw / 2 - MARK_LINEWIDTH;

        const toLocalX = (x: number) => String(x - bounds.minX + MARK_LINEWIDTH + lw / 2);
        const toLocalY = (y: number) => String(bounds.maxY - y + MARK_LINEWIDTH + lw / 2);
        const d = this.#getPathString(toLocalX, toLocalY);

        // The dimensions relevant for drawing the 'mark border', which should snugly enclose the pointer's outer stroke edges:
        const mW = w + lw;
        const mH = h + lw;
        const l = Math.min(Math.max(5, mW / 5), 25);
        const m = Math.min(Math.max(5, mH / 5), 25);

        const handleMouseDown = useCallback(
            (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => onMouseDown(this, e),
            [onMouseDown]
        );
        const handleMouseEnter = useCallback(
            (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => onMouseEnter(this, e),
            [onMouseEnter]
        );
        const handleMouseLeave = useCallback(
            (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => onMouseLeave(this, e),
            [onMouseLeave]
        );

        const fillColor = `hsl(${primaryColor.hue},${primaryColor.sat}%,${primaryColor.lgt}%)`;
        const divStyle = {
            position: 'absolute',
            left: `${divLeft}px`,
            top: `${divTop}px`,
            cursor: 'pointer',
        } as CSSProperties;

        return (
            <div
                className={
                    focus ? 'focused' : selected ? 'selected' : preselected ? 'preselected' : 'unselected'
                }
                id={this.id}
                onMouseDown={handleMouseDown}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={divStyle}
            >
                <svg
                    width={mW + MARK_LINEWIDTH * 2}
                    height={mH + MARK_LINEWIDTH * 2}
                    xmlns='http://www.w3.org/2000/svg'
                    style={{ overflow: 'visible' }}
                >
                    {(this.linewidth > 0 || this.shading > 0) && (
                        <path
                            d={d}
                            fill={this.shading > 0 ? fillColor : 'none'}
                            fillOpacity={this.shading > 0 ? this.shading : undefined}
                            stroke={this.linewidth > 0 ? fillColor : 'none'}
                            strokeWidth={this.linewidth}
                            strokeDasharray={this.dash.join(' ')}
                            strokeLinecap={LINECAP_STYLE}
                            strokeLinejoin={LINEJOIN_STYLE}
                        />
                    )}
                    {Ornament.markBorder(MARK_LINEWIDTH, MARK_LINEWIDTH, l, m, mW, mH, markColor)}
                </svg>
            </div>
        );
    };
    /* eslint-enable react-hooks/rules-of-hooks */
}
