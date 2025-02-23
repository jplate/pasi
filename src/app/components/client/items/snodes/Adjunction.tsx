import { Info } from '../Node';
import SNode, { complain } from '../SNode';
import { Entry, MAX_ROTATION_INPUT } from '../../ItemEditor';
import { Shape, angle, round, travel, getCyclicValue, angleDiff } from '@/app/util/MathTools';
import { parseInputValue, parseCyclicInputValue } from '../../EditorComponents';
import { MIN_ROTATION } from '@/app/Constants';
import * as Texdraw from '@/app/codec/Texdraw';
import { ParseError } from '@/app/codec/Texdraw';
import { TRAVEL_STEP_SIZE, TRAVEL_TOLERANCE } from '@/app/Constants';

export const DEFAULT_W0 = 8;
export const DEFAULT_W1 = 8;
export const DEFAULT_WC = 8;

export const DEFAULT_HOOK_ANGLE = 22.5;
export const DEFAULT_HOOK_LENGTH = 10;
export const MINIMUM_HOOK_LENGTH = 0;
export const MAXIMUM_HOOK_LENGTH = 999;
export const ROUNDING_DIGITS = 1; // precision used for parameters specific to Adjunction. We have to use a relatively low precision here,
// because those parameters will be inferred from the coordinates of points encoded in the texdraw code, and those coordinates are
// rounded to the nearest 10,000th of a pixel -- which creates inaccuracy.

const hookAngleTooltip = (
    <>The angle (in degrees) by which the arrowhead&rsquo;s hook deviates from the center line.</>
);

const hookLengthTooltip = <>The length of the arrowhead&rsquo;s hook.</>;

export default class Adjunction extends SNode {
    hookAngle = DEFAULT_HOOK_ANGLE; // the angle (in degrees) of the 'harpoonhead's' hook
    hookLength = DEFAULT_HOOK_LENGTH; // the length of that hook
    hookLength100 = DEFAULT_HOOK_LENGTH; // the length of that hook

    constructor(i: number, closest: boolean) {
        super(i, closest);
        this.editHandler = {
            ...this.nodeEditHandler,
            ...this.connectorEditHandler,
            ...this.commonArrowheadEditHandler,
            hookAngle: ({ e }: Info) => {
                if (e) {
                    const delta = parseCyclicInputValue(e.target.value, this.hookAngle, 0)[1];
                    return [
                        (item, array) => {
                            if (!isNaN(delta) && delta !== 0 && item instanceof Adjunction) {
                                item.hookAngle = getCyclicValue(
                                    item.hookAngle + delta,
                                    MIN_ROTATION,
                                    360,
                                    10 ** ROUNDING_DIGITS
                                );
                            }
                            return array;
                        },
                        'ENodesAndCNodeGroups',
                    ];
                }
            },
            hookLength: ({ e }: Info) => {
                if (e) {
                    const d =
                        parseInputValue(
                            e.target.value,
                            MINIMUM_HOOK_LENGTH,
                            MAXIMUM_HOOK_LENGTH,
                            this.hookLength,
                            0,
                            ROUNDING_DIGITS
                        ) - this.hookLength;
                    return [
                        (item, array) => {
                            if (!isNaN(d) && d !== 0 && item instanceof Adjunction) {
                                item.hookLength += d;
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
        this.hookLength = round(this.hookLength100 * val * 1e-2, ROUNDING_DIGITS);
    }

    override renormalizeArrowhead() {
        super.renormalizeArrowhead();
        this.hookLength100 = this.hookLength;
    }

    override copyValuesTo(target: Adjunction) {
        super.copyValuesTo(target);
        target.hookAngle = this.hookAngle;
        target.hookLength = this.hookLength;
    }

    override getArrowheadInfo(): Entry[] {
        return [
            ...super.getArrowheadInfo(),
            {
                type: 'number input',
                key: 'hookAngle',
                text: 'Hook angle',
                width: 'medium',
                value: this.hookAngle,
                step: 0,
                min: -MAX_ROTATION_INPUT,
                max: MAX_ROTATION_INPUT,
                tooltip: hookAngleTooltip,
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'hookLength',
                text: 'Hook length',
                width: 'medium',
                value: this.hookLength,
                step: 0,
                tooltip: hookLengthTooltip,
                tooltipPlacement: 'left',
            },
        ];
    }

    override getArrowheadShapes(): Shape[] {
        const adjustedLine = this.getAdjustedLine();
        const len = this.hookLength;
        const a = (this.hookAngle / 180) * Math.PI;
        const { x3: p1x, y3: p1y } = adjustedLine;
        const [p2x, p2y] = travel([1], this.w1, adjustedLine, -TRAVEL_STEP_SIZE, TRAVEL_TOLERANCE);
        const gamma = angle(p1x, p1y, p2x, p2y, true);
        const bx0 = len * Math.cos(gamma - a);
        const by0 = len * Math.sin(gamma - a);
        const bx1 = len * Math.cos(gamma + a);
        const by1 = len * Math.sin(gamma + a);
        return [
            { x0: p1x, y0: p1y, x1: p1x + bx0, y1: p1y + by0 }, // the left hook
            { x0: p1x, y0: p1y, x1: p1x + bx1, y1: p1y + by1 }, // the right hook
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
                (
                    <span>
                        {complain(nodeName)}: expected two shapes for the arrowhead, but got only{' '}
                        {stShapes.length}.
                    </span>
                )
            );
        }
        for (let i = 0; i < 2; i++) {
            const ss = stShapes[i];
            if (!(ss.shape instanceof Texdraw.Line)) {
                throw new ParseError(
                    (
                        <span>
                            {complain(nodeName)}: expected a line, but got {ss.shape.genericDescription}.
                        </span>
                    )
                );
            }
        }
        const lines = stShapes.map((ss) => ss.shape as Texdraw.Line);
        const { x: x0, y: y0 } = lines[0].p0;
        const { x: x1, y: y1 } = lines[0].p1;
        const { x: x2, y: y2 } = lines[1].p1;
        const a0 = angle(x0, y0, x1, y1, true); // the angle of the left hook, with the arrow's tip as origin
        const a1 = angle(x0, y0, x2, y2, true); // the angle of the right hook, with the arrow's tip as origin
        const a2 = angle(x0, y0, cpx, cpy, true); // the angle of the vector that leads from the arrow's tip to the connector's second control point
        const negativeAngles = angleDiff(a0, a2) + angleDiff(a2, a1) > 2 * Math.PI;
        const aDeg = ((negativeAngles ? -angleDiff(a1, a0) : angleDiff(a0, a1)) / Math.PI) * 90;
        const factor = 10 ** ROUNDING_DIGITS;
        this.hookAngle = round(
            Math.round(aDeg * factor) / factor,
            ROUNDING_DIGITS,
            2 // We seem to need a pretty low tolerance to avoid arithmetic errors.
        );
        this.hookLength = round(
            Math.round(Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2) * factor) / factor,
            ROUNDING_DIGITS,
            3
        );

        return stShapes.slice(2);
    }
}
