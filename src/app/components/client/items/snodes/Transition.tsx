import { Info, Handler } from '@/app/components/client/items/Node';
import SNode, { complain } from '@/app/components/client/items/SNode';
import { validateShading } from '@/app/components/client/items/ENode';
import { Entry } from '@/app/components/client/ItemEditor';
import { Shape, CubicCurve, angle, round } from '@/app/util/MathTools';
import { parseInputValue, validFloat } from '@/app/components/client/EditorComponents';
import * as Texdraw from '@/app/codec/Texdraw';
import { ParseError } from '@/app/codec/Texdraw';

export const DEFAULT_W0 = 8;
export const DEFAULT_W1 = 8;
export const DEFAULT_WC = 8;

export const DEFAULT_X1 = 3;
export const DEFAULT_Y1 = 1;
export const DEFAULT_X2 = 5;
export const DEFAULT_Y2 = 2;
export const DEFAULT_X3 = 10;
export const DEFAULT_Y3 = 5;
export const DEFAULT_DEPTH = 7;
export const DEFAULT_SHADING = 0;
export const MIN_COORDINATE = -999;
export const MAX_COORDINATE = 999;
export const MINIMUM_DEPTH = 0;
export const MAXIMUM_DEPTH = 999;
export const ROUNDING_DIGITS = 1; // precision used for parameters specific to Transition. We have to use a relatively low precision here,
// because those parameters will be inferred from the coordinates of points encoded in the texdraw code, and those coordinates are
// rounded to the nearest 10,000th of a pixel -- which creates inaccuracy.

/**
 * The names of those parameters of the arrowhead that represent geometric quantities (i.e., all except for the shading).
 */
type GeometricParam = 'x1' | 'y1' | 'x2' | 'y2' | 'x3' | 'y3' | 'depth';

const x1Tooltip = (
    <>
        The X-coordinate (in pixels) of the forward edge&rsquo;s first control point. (The origin of the
        coordinate system lies at the arrow&rsquo;s tip, with the X-axis pointing backwards along the
        arrow&rsquo;s shaft.)
    </>
);

const y1Tooltip = (
    <>
        The Y-coordinate (in a coordinate system centered on the arrow&rsquo;s tip) of the forward
        edge&rsquo;s first control point.
    </>
);

const x2Tooltip = (
    <>
        The X-coordinate (in a coordinate system centered on the arrow&rsquo;s tip) of the forward
        edge&rsquo;s second control point.
    </>
);

const y2Tooltip = (
    <>
        The Y-coordinate (in a coordinate system centered on the arrow&rsquo;s tip) of the forward
        edge&rsquo;s second control point.
    </>
);

const x3Tooltip = (
    <>
        The X-coordinate (in a coordinate system centered on the arrow&rsquo;s tip) of the forward
        edge&rsquo;s end point.
    </>
);

const y3Tooltip = (
    <>
        The Y-coordinate (in a coordinate system centered on the arrow&rsquo;s tip) of the forward
        edge&rsquo;s end point.
    </>
);

const depthTooltip = (
    <>The distance (in pixels) from the arrow&rsquo;s tip to the point where the arrowhead meets the shaft.</>
);

const shadingTooltip = <>The fill level of the arrowhead (0: transparent; 1: fully opaque).</>;

/**
 * Transitions are SNodes whose arrowheads are closed, laterally symmetric figures bounded by four lines: two cubic Bézier curves that
 * run from the arrow's tip to the two 'barbs', and two straight lines that connect each barb to the point where the arrowhead meets
 * the connector (the arrow's 'shaft').
 */
export default class Transition extends SNode {
    // The coordinates of the control points and end point of the first Bézier curve, with the arrow's tip as origin and the X-axis
    // pointing backwards along the arrow's shaft. The second Bézier curve uses the same coordinates with the sign of the Y-values flipped.
    x1 = DEFAULT_X1;
    y1 = DEFAULT_Y1;
    x2 = DEFAULT_X2;
    y2 = DEFAULT_Y2;
    x3 = DEFAULT_X3;
    y3 = DEFAULT_Y3;
    depth = DEFAULT_DEPTH; // the distance from the arrow's tip to the point where the arrowhead meets the shaft
    ahShading = DEFAULT_SHADING; // the arrowhead's fill level (0: transparent; 1: fully opaque)

    x1_100 = DEFAULT_X1;
    y1_100 = DEFAULT_Y1;
    x2_100 = DEFAULT_X2;
    y2_100 = DEFAULT_Y2;
    x3_100 = DEFAULT_X3;
    y3_100 = DEFAULT_Y3;
    depth100 = DEFAULT_DEPTH;

    constructor(i: number, closest: boolean) {
        super(i, closest);
        const paramHandler =
            (key: GeometricParam, min: number, max: number): Handler[string] =>
            ({ e }: Info) => {
                if (e) {
                    const d =
                        parseInputValue(e.target.value, min, max, this[key], 0, ROUNDING_DIGITS) - this[key];
                    return [
                        (item, array) => {
                            if (!isNaN(d) && d !== 0 && item instanceof Transition) {
                                item[key] += d;
                            }
                            return array;
                        },
                        'ENodesAndCNodeGroups',
                    ];
                }
            };
        this.editHandler = {
            ...this.nodeEditHandler,
            ...this.connectorEditHandler,
            ...this.commonArrowheadEditHandler,
            x1: paramHandler('x1', MIN_COORDINATE, MAX_COORDINATE),
            y1: paramHandler('y1', MIN_COORDINATE, MAX_COORDINATE),
            x2: paramHandler('x2', MIN_COORDINATE, MAX_COORDINATE),
            y2: paramHandler('y2', MIN_COORDINATE, MAX_COORDINATE),
            x3: paramHandler('x3', MIN_COORDINATE, MAX_COORDINATE),
            y3: paramHandler('y3', MIN_COORDINATE, MAX_COORDINATE),
            depth: paramHandler('depth', MINIMUM_DEPTH, MAXIMUM_DEPTH),
            ahShading: ({ e }: Info) => {
                if (e) {
                    const sh = validFloat(e.target.value, 0, 1);
                    return [
                        (item, array) => {
                            if (item instanceof Transition) {
                                item.ahShading = sh;
                            }
                            return array;
                        },
                        'ENodesAndCNodeGroups',
                    ];
                }
            },
        };
    }

    getDefaultW0() {
        return DEFAULT_W0;
    }

    getDefaultW1() {
        return DEFAULT_W1;
    }

    getDefaultWC() {
        return DEFAULT_WC;
    }

    override scaleArrowhead(val: number) {
        super.scaleArrowhead(val);
        this.x1 = round(this.x1_100 * val * 1e-2, ROUNDING_DIGITS);
        this.y1 = round(this.y1_100 * val * 1e-2, ROUNDING_DIGITS);
        this.x2 = round(this.x2_100 * val * 1e-2, ROUNDING_DIGITS);
        this.y2 = round(this.y2_100 * val * 1e-2, ROUNDING_DIGITS);
        this.x3 = round(this.x3_100 * val * 1e-2, ROUNDING_DIGITS);
        this.y3 = round(this.y3_100 * val * 1e-2, ROUNDING_DIGITS);
        this.depth = round(this.depth100 * val * 1e-2, ROUNDING_DIGITS);
    }

    override renormalizeArrowhead() {
        super.renormalizeArrowhead();
        this.x1_100 = this.x1;
        this.y1_100 = this.y1;
        this.x2_100 = this.x2;
        this.y2_100 = this.y2;
        this.x3_100 = this.x3;
        this.y3_100 = this.y3;
        this.depth100 = this.depth;
    }

    override copyValuesTo(target: Transition) {
        super.copyValuesTo(target);
        target.x1 = this.x1;
        target.y1 = this.y1;
        target.x2 = this.x2;
        target.y2 = this.y2;
        target.x3 = this.x3;
        target.y3 = this.y3;
        target.depth = this.depth;
        target.ahShading = this.ahShading;
    }

    override getArrowheadShading(): number {
        return this.ahShading;
    }

    override getArrowheadInfo(): Entry[] {
        return [
            ...super.getArrowheadInfo(),
            {
                type: 'number input',
                key: 'x1',
                text: 'X1',
                width: 'medium',
                value: this.x1,
                step: 0,
                tooltip: x1Tooltip,
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'y1',
                text: 'Y1',
                width: 'medium',
                value: this.y1,
                step: 0,
                tooltip: y1Tooltip,
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'x2',
                text: 'X2',
                width: 'medium',
                value: this.x2,
                step: 0,
                tooltip: x2Tooltip,
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'y2',
                text: 'Y2',
                width: 'medium',
                value: this.y2,
                step: 0,
                tooltip: y2Tooltip,
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'x3',
                text: 'X3',
                width: 'medium',
                value: this.x3,
                step: 0,
                tooltip: x3Tooltip,
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'y3',
                text: 'Y3',
                width: 'medium',
                value: this.y3,
                step: 0,
                tooltip: y3Tooltip,
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'depth',
                text: 'Depth',
                width: 'medium',
                value: this.depth,
                step: 0,
                tooltip: depthTooltip,
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'ahShading',
                text: 'Shading',
                width: 'medium',
                value: this.ahShading,
                min: 0,
                max: 1,
                step: 0.1,
                tooltip: shadingTooltip,
                tooltipPlacement: 'left',
            },
            { type: 'gloss', text: '(Shading=0: transparent; >0: opaque)', style: 'text-right text-xs' },
        ];
    }

    /**
     * Since the connector should end where the arrowhead starts, we here shift the end point of the line -- and, to preserve the
     * line's direction at that point, also its second control point -- backwards by this.depth. If this.bidirectional is true,
     * the same is done (mutatis mutandis) at the start of the line.
     */
    override getAdjustedLine(): CubicCurve {
        const line = this.getLine();
        const gamma1 = this.getArrowheadAngle(line);
        const dx1 = this.depth * Math.cos(gamma1);
        const dy1 = this.depth * Math.sin(gamma1);
        const result = {
            ...line,
            x2: line.x2 + dx1,
            y2: line.y2 + dy1,
            x3: line.x3 + dx1,
            y3: line.y3 + dy1,
        };
        if (this.bidirectional) {
            const gamma0 = this.getArrowheadAngle(line, true);
            const dx0 = this.depth * Math.cos(gamma0);
            const dy0 = this.depth * Math.sin(gamma0);
            result.x0 += dx0;
            result.y0 += dy0;
            result.x1 += dx0;
            result.y1 += dy0;
        }
        return result;
    }

    /**
     * @return the four Shapes that make up an arrowhead whose tip lies at the specified location and whose axis points in the
     * direction indicated by gamma (which is understood to point from the tip 'backwards', along the arrow's shaft).
     */
    override getArrowheadShapesAt(tipX: number, tipY: number, gamma: number): Shape[] {
        // The unit vector (ux, uy) points from the tip backwards along the arrow's axis, and (vx, vy) is orthogonal to it:
        const ux = Math.cos(gamma);
        const uy = Math.sin(gamma);
        const vx = -uy;
        const vy = ux;
        const px = (x: number, y: number) => tipX + x * ux + y * vx;
        const py = (x: number, y: number) => tipY + x * uy + y * vy;
        const { x1, y1, x2, y2, x3, y3, depth } = this;
        const backX = px(depth, 0);
        const backY = py(depth, 0);
        // The four shapes are arranged so as to form a single closed path, which allows the arrowhead to be filled:
        return [
            {
                x0: tipX,
                y0: tipY,
                x1: px(x1, y1),
                y1: py(x1, y1),
                x2: px(x2, y2),
                y2: py(x2, y2),
                x3: px(x3, y3),
                y3: py(x3, y3),
            }, // the first Bézier curve
            { x0: px(x3, y3), y0: py(x3, y3), x1: backX, y1: backY }, // the first straight line
            { x0: backX, y0: backY, x1: px(x3, -y3), y1: py(x3, -y3) }, // the second straight line (reversed)
            {
                x0: px(x3, -y3),
                y0: py(x3, -y3),
                x1: px(x2, -y2),
                y1: py(x2, -y2),
                x2: px(x1, -y1),
                y2: py(x1, -y1),
                x3: tipX,
                y3: tipY,
            }, // the second Bézier curve (reversed)
        ];
    }

    protected override getArrowheadTexdrawCode(): string {
        if (this.ahShading > 0) {
            const shapes = Texdraw.translateShapes(this.getArrowheadShapes());
            const parts: string[] = [];
            // Each group of four shapes forms one closed path, and each such path has to be filled separately:
            for (let i = 0; i < shapes.length; i += 4) {
                const group = shapes.slice(i, i + 4);
                parts.push(
                    Texdraw.getCommandSequence(
                        group,
                        group,
                        false,
                        this.ahLinewidth,
                        this.ahDash,
                        this.ahShading
                    )
                );
            }
            return parts.join('');
        }
        return super.getArrowheadTexdrawCode();
    }

    override parseArrowhead(
        stShapes: Texdraw.StrokedShape[],
        cpx: number,
        cpy: number,
        dimRatio: number,
        nodeName: string
    ): Texdraw.StrokedShape[] {
        super.parseArrowhead(stShapes, cpx, cpy, dimRatio, nodeName);
        const sh = stShapes[0].shape;
        if (!(sh instanceof Texdraw.Path) || sh.shapes.length !== 4) {
            throw new ParseError(
                <span>
                    {complain(nodeName)}: expected a sequence of four connected shapes for the arrowhead, but
                    got {sh instanceof Texdraw.Path ? sh.shapes.length : sh.genericDescription}.
                </span>
            );
        }
        const [c0, l0, l1, c1] = sh.shapes;
        for (const curve of [c0, c1]) {
            if (!(curve instanceof Texdraw.CubicCurve)) {
                throw new ParseError(
                    <span>
                        {complain(nodeName)}: expected a curve, but got {curve.genericDescription}.
                    </span>
                );
            }
        }
        for (const line of [l0, l1]) {
            if (!(line instanceof Texdraw.Line)) {
                throw new ParseError(
                    <span>
                        {complain(nodeName)}: expected a line, but got {line.genericDescription}.
                    </span>
                );
            }
        }
        if (!sh.drawn) {
            // In this case the arrowhead has been filled without being drawn, which means that its linewidth is zero (and that the
            // linewidth inferred by super.parseArrowhead() is left over from the connector).
            this.ahLinewidth = 0;
        }
        this.ahShading = validateShading(sh.fillLevel, nodeName);

        const curve0 = c0 as Texdraw.CubicCurve;
        const { x: tipX, y: tipY } = curve0.p0;
        const { x: backX, y: backY } = (l0 as Texdraw.Line).p1;
        const factor = 10 ** ROUNDING_DIGITS;
        const rnd = (
            val: number // We seem to need a pretty low tolerance to avoid arithmetic errors.
        ) => round(Math.round(val * factor) / factor, ROUNDING_DIGITS, 3);
        const depth = Math.sqrt((backX - tipX) ** 2 + (backY - tipY) ** 2);
        let ux, uy;
        if (depth > 10 ** -Texdraw.ROUNDING_DIGITS) {
            ux = (backX - tipX) / depth;
            uy = (backY - tipY) / depth;
        } else {
            // If the depth is (practically) zero, we infer the arrowhead's orientation from the direction of the vector that leads
            // from the arrow's tip to the connector's second control point:
            const gamma = angle(tipX, tipY, cpx, cpy, true);
            ux = Math.cos(gamma);
            uy = Math.sin(gamma);
        }
        const vx = -uy;
        const vy = ux;
        const local = ({ x, y }: Texdraw.Point2D): [number, number] => [
            rnd((x - tipX) * ux + (y - tipY) * uy),
            rnd((x - tipX) * vx + (y - tipY) * vy),
        ];
        [this.x1, this.y1] = local(curve0.p0a);
        [this.x2, this.y2] = local(curve0.p1a);
        [this.x3, this.y3] = local(curve0.p1);
        this.depth = rnd(depth);

        // If the next StrokedShape is also a Path, it represents a second arrowhead, sitting at the start of the arrow.
        // (Any shapes that represent the SNode itself will be Circles rather than Paths.)
        if (stShapes.length > 1 && stShapes[1].shape instanceof Texdraw.Path) {
            const sh1 = stShapes[1].shape as Texdraw.Path;
            if (sh1.shapes.length !== 4) {
                throw new ParseError(
                    <span>
                        {complain(nodeName)}: expected a sequence of four connected shapes for the second
                        arrowhead, but got {sh1.shapes.length}.
                    </span>
                );
            }
            this.bidirectional = true;
            return stShapes.slice(2);
        }
        this.bidirectional = false;
        return stShapes.slice(1);
    }
}
