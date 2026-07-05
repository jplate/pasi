import { Info, Handler } from '@/app/components/client/items/Node';
import SNode, { complain } from '@/app/components/client/items/SNode';
import { Entry } from '@/app/components/client/ItemEditor';
import { Shape, angle, round } from '@/app/util/MathTools';
import { parseInputValue } from '@/app/components/client/EditorComponents';
import * as Texdraw from '@/app/codec/Texdraw';
import { ParseError } from '@/app/codec/Texdraw';

export const DEFAULT_W0 = 8;
export const DEFAULT_W1 = 8;
export const DEFAULT_WC = 8;

export const DEFAULT_X1 = 3;
export const DEFAULT_Y1 = 3;
export const DEFAULT_X2 = 10;
export const DEFAULT_Y2 = 5;
export const DEFAULT_X3 = 11;
export const DEFAULT_Y3 = 4;
export const MIN_COORDINATE = -999;
export const MAX_COORDINATE = 999;
export const ROUNDING_DIGITS = 1; // precision used for parameters specific to Entailment. We have to use a relatively low precision here,
// because those parameters will be inferred from the coordinates of points encoded in the texdraw code, and those coordinates are
// rounded to the nearest 10,000th of a pixel -- which creates inaccuracy.

/**
 * The names of the parameters of the arrowhead.
 */
type GeometricParam = 'x1' | 'y1' | 'x2' | 'y2' | 'x3' | 'y3';

const x1Tooltip = (
    <>
        The X-coordinate (in pixels) of the first control point of each of the two B&eacute;zier curves. The
        origin of the coordinate system lies at the arrow&rsquo;s tip, with the X-axis pointing
        &lsquo;backwards&rsquo;, along the arrow&rsquo;s shaft.
    </>
);

const y1Tooltip = (
    <>
        The Y-coordinate (in pixels) of the first control point of the first B&eacute;zier curve, measured
        from the arrow&rsquo;s tip. (The second curve uses the same value with opposite sign.)
    </>
);

const x2Tooltip = (
    <>The X-coordinate (in pixels) of the second control point of each of the two B&eacute;zier curves.</>
);

const y2Tooltip = (
    <>
        The Y-coordinate (in pixels) of the second control point of the first B&eacute;zier curve. (The second
        curve uses the same value with opposite sign.)
    </>
);

const x3Tooltip = <>The X-coordinate (in pixels) of the end point of each of the two B&eacute;zier curves.</>;

const y3Tooltip = (
    <>
        The Y-coordinate (in pixels) of the end point of the first B&eacute;zier curve. (The second curve uses
        the same value with opposite sign.)
    </>
);

/**
 * Entailments are SNodes whose arrowheads consist of two 'barbs', laterally symmetric with respect to the arrow's shaft, each
 * defined by a cubic Bézier curve running from the arrow's tip to the barb's end point. Unlike Transition, the barbs are not
 * connected back to the shaft, so the arrowhead is an open (and unshaded) figure.
 */
export default class Entailment extends SNode {
    // The coordinates of the control points and end point of the first Bézier curve, with the arrow's tip as origin and the X-axis
    // pointing backwards along the arrow's shaft. The second Bézier curve uses the same coordinates with the sign of the Y-values flipped.
    x1 = DEFAULT_X1;
    y1 = DEFAULT_Y1;
    x2 = DEFAULT_X2;
    y2 = DEFAULT_Y2;
    x3 = DEFAULT_X3;
    y3 = DEFAULT_Y3;

    x1_100 = DEFAULT_X1;
    y1_100 = DEFAULT_Y1;
    x2_100 = DEFAULT_X2;
    y2_100 = DEFAULT_Y2;
    x3_100 = DEFAULT_X3;
    y3_100 = DEFAULT_Y3;

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
                            if (!isNaN(d) && d !== 0 && item instanceof Entailment) {
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
    }

    override renormalizeArrowhead() {
        super.renormalizeArrowhead();
        this.x1_100 = this.x1;
        this.y1_100 = this.y1;
        this.x2_100 = this.x2;
        this.y2_100 = this.y2;
        this.x3_100 = this.x3;
        this.y3_100 = this.y3;
    }

    override copyValuesTo(target: Entailment) {
        super.copyValuesTo(target);
        target.x1 = this.x1;
        target.y1 = this.y1;
        target.x2 = this.x2;
        target.y2 = this.y2;
        target.x3 = this.x3;
        target.y3 = this.y3;
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
        ];
    }

    /**
     * @return the two Shapes (cubic Bézier curves) that make up an arrowhead whose tip lies at the specified location and whose
     * axis points in the direction indicated by gamma (which is understood to point from the tip 'backwards', along the arrow's
     * shaft).
     */
    override getArrowheadShapesAt(tipX: number, tipY: number, gamma: number): Shape[] {
        // The unit vector (ux, uy) points from the tip backwards along the arrow's axis, and (vx, vy) is orthogonal to it:
        const ux = Math.cos(gamma);
        const uy = Math.sin(gamma);
        const vx = -uy;
        const vy = ux;
        const px = (x: number, y: number) => tipX + x * ux + y * vx;
        const py = (x: number, y: number) => tipY + x * uy + y * vy;
        const { x1, y1, x2, y2, x3, y3 } = this;
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
            }, // the first barb
            {
                x0: tipX,
                y0: tipY,
                x1: px(x1, -y1),
                y1: py(x1, -y1),
                x2: px(x2, -y2),
                y2: py(x2, -y2),
                x3: px(x3, -y3),
                y3: py(x3, -y3),
            }, // the second barb
        ];
    }

    override parseArrowhead(
        stShapes: Texdraw.StrokedShape[],
        cpx: number,
        cpy: number,
        dimRatio: number,
        nodeName: string
    ): Texdraw.StrokedShape[] {
        super.parseArrowhead(stShapes, cpx, cpy, dimRatio, nodeName);
        if (stShapes.length < 2) {
            throw new ParseError(
                <span>
                    {complain(nodeName)}: expected two curves for the arrowhead, but got only{' '}
                    {stShapes.length}.
                </span>
            );
        }
        for (let i = 0; i < 2; i++) {
            const ss = stShapes[i];
            if (!(ss.shape instanceof Texdraw.CubicCurve)) {
                throw new ParseError(
                    <span>
                        {complain(nodeName)}: expected a curve, but got {ss.shape.genericDescription}.
                    </span>
                );
            }
        }
        const curve0 = stShapes[0].shape as Texdraw.CubicCurve;
        const { x: tipX, y: tipY } = curve0.p0;
        // We infer the arrowhead's orientation from the direction of the vector that leads from the arrow's tip to the
        // connector's second control point:
        const gamma = angle(tipX, tipY, cpx, cpy, true);
        const ux = Math.cos(gamma);
        const uy = Math.sin(gamma);
        const vx = -uy;
        const vy = ux;
        const factor = 10 ** ROUNDING_DIGITS;
        const rnd = (
            val: number // We seem to need a pretty low tolerance to avoid arithmetic errors.
        ) => round(Math.round(val * factor) / factor, ROUNDING_DIGITS, 3);
        const local = (p: Texdraw.Point2D): [number, number] => [
            rnd((p.x - tipX) * ux + (p.y - tipY) * uy),
            rnd((p.x - tipX) * vx + (p.y - tipY) * vy),
        ];
        [this.x1, this.y1] = local(curve0.p0a);
        [this.x2, this.y2] = local(curve0.p1a);
        [this.x3, this.y3] = local(curve0.p1);

        // If the next two StrokedShapes are also CubicCurves, they make up a second arrowhead, sitting at the start of the arrow.
        // (Any shapes that represent the SNode itself will be Circles rather than CubicCurves.)
        if (stShapes.length > 2 && stShapes[2].shape instanceof Texdraw.CubicCurve) {
            if (!(stShapes.length > 3 && stShapes[3].shape instanceof Texdraw.CubicCurve)) {
                throw new ParseError(
                    <span>{complain(nodeName)}: expected two curves for the second arrowhead.</span>
                );
            }
            this.bidirectional = true;
            return stShapes.slice(4);
        }
        this.bidirectional = false;
        return stShapes.slice(2);
    }
}
