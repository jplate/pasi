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
export const MIN_WIDTH = 1;
export const MAX_WIDTH = 300;
export const MIN_LENGTH = 1;
export const MAX_LENGTH = 300;
export const DEFAULT_WIDTH = 3;
export const DEFAULT_LENGTH = 3;
export const DEFAULT_SHADING = 1;

const gapTooltip = (
    <>
        The distance between the circumference of the node to which this ornament is attached and the closest
        point of the ornament&rsquo;s own bounding box.
    </>
);

const angleTooltip = (
    <>
        The angle of a straight line from the center of the node to which this ornament is attached to the
        nearest point of the ornament&rsquo;s own bounding box.
    </>
);

/**
 * An Existence is an Ornament that manifests as a small rectangle attached to a Node, by default located directly underneath it.
 */
export default class Existence extends Ornament {
    linewidth: number = DEFAULT_LINEWIDTH;
    shading: number = DEFAULT_SHADING;
    dash: number[] = [];

    private dashValidator: DashValidator = new DashValidator(MAX_DASH_VALUE, MAX_DASH_LENGTH);

    /**
     * Creates a new Existence, which is added (via the superclass constructor) to the supplied Node's array of Ornaments.
     * It also receives a unique ID.
     */
    constructor(node: Node) {
        super(node);
        this.angle = DEFAULT_ANGLE;
        this.width = DEFAULT_WIDTH;
        this.height = DEFAULT_LENGTH;
    }

    override clone(node: Node) {
        const clone = new Existence(node);
        this.copyValuesTo(clone);
        return clone;
    }

    protected override copyValuesTo(target: Existence) {
        super.copyValuesTo(target);
        target.width = this.width;
        target.height = this.height;
        target.linewidth = this.linewidth;
        target.shading = this.shading;
        target.dash = this.dash;
    }

    override getWidth() {
        return this.width;
    }

    override getHeight() {
        return this.height;
    }

    override getBottomLeftCorner() {
        const { top, left } = this.#getCorner();
        return { bottom: top - this.height, left };
    }

    #getPositioning(): [number, number] {
        const angle = this.angle;
        return [
            angle < -90 || angle > 90 ? -1 : angle === -90 || angle === 90 ? 0 : 1,
            angle > 0 && angle < 180 ? 1 : angle === 0 || angle === 180 ? 0 : -1,
        ];
    }

    #getCorner(): { left: number; top: number } {
        const angle = this.angle;
        const angleRad = (angle / 180) * Math.PI;
        const [hPos, vPos] = this.#getPositioning();
        const r = this.node.radius + this.node.linewidth / 2 + this.gap;
        const [nx, ny] = this.node.getLocation();
        const w = this.width,
            h = this.height;
        return {
            left: nx + (hPos === 0 ? -w / 2 : r * Math.cos(angleRad) - (hPos < 0 ? w : 0)),
            top: ny + (vPos === 0 ? h / 2 : r * Math.sin(angleRad) + (vPos > 0 ? h : 0)),
        };
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
                key: 'width',
                text: 'Width',
                width: 'medium',
                value: this.width,
                step: 1,
            },
            {
                type: 'number input',
                key: 'length',
                text: 'Length',
                width: 'medium',
                value: this.height,
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
                            if (!isNaN(delta) && delta !== 0 && item instanceof Existence) {
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
            case 'width':
                if (e && typeof e === 'object') {
                    const val = validFloat(e.target.value, MIN_WIDTH, MAX_WIDTH, this.width);
                    return [
                        (item, array) => {
                            if (item instanceof Existence) item.width = val;
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            case 'length':
                if (e && typeof e === 'object') {
                    const val = validFloat(e.target.value, MIN_LENGTH, MAX_LENGTH, this.height);
                    return [
                        (item, array) => {
                            if (item instanceof Existence) item.height = val;
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
                            if (item instanceof Existence) item.linewidth = val;
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
                            if (item instanceof Existence) item.shading = val;
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
                            if (item instanceof Existence) item.dash = dash;
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
            this.width,
            this.height,
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
        const { left, top } = this.#getCorner();
        const w = this.width,
            h = this.height;
        const p0 = new Texdraw.Point2D(left, top);
        const p1 = new Texdraw.Point2D(left + w, top);
        const p2 = new Texdraw.Point2D(left + w, top - h);
        const p3 = new Texdraw.Point2D(left, top - h);
        const lines = [
            new Texdraw.Line(p0, p1),
            new Texdraw.Line(p1, p2),
            new Texdraw.Line(p2, p3),
            new Texdraw.Line(p3, p0),
        ];
        return Texdraw.getCommandSequence(lines, lines, false, this.linewidth, this.dash, this.shading);
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
                <span>
                    Incomplete definition of rectangle ornament attached to {name}: info string required.
                </span>
            );
        }
        const split = info.split(/\s+/).filter((s) => s.length > 0);
        if (split.length < 7) {
            throw new ParseError(
                <span>
                    Rectangle-ornament configuration string should contain at least seven elements, not{' '}
                    {split.length}.
                </span>
            );
        }
        const values = split.map((s) => {
            const val = decode(s);
            if (!isFinite(val)) {
                throw Texdraw.makeParseError(
                    'Unexpected token in rectangle-ornament configuration string',
                    s
                );
            }
            return val;
        });
        const [gap, angle, width, height, linewidth, shading, dashLength] = values;
        const dash = values.slice(7);
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

        const scaledWidth = dimRatio * width;
        if (scaledWidth < MIN_WIDTH || scaledWidth > MAX_WIDTH) {
            throw new ParseError(
                <span>
                    Illegal data in definition of ornament attached to {name}: width {scaledWidth} out of
                    range.
                </span>
            );
        }
        this.width = scaledWidth;

        const scaledLength = dimRatio * height;
        if (scaledLength < MIN_LENGTH || scaledLength > MAX_LENGTH) {
            throw new ParseError(
                <span>
                    Illegal data in definition of ornament attached to {name}: length {scaledLength} out of
                    range.
                </span>
            );
        }
        this.height = scaledLength;

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

    override getSvgBounds(): Bounds | null {
        if (this.linewidth <= 0 && this.shading <= 0) return null;
        const { left, top } = this.#getCorner();
        return { minX: left, maxX: left + this.width, minY: top - this.height, maxY: top };
    }

    override getSvg(transX: (x: number) => number, transY: (y: number) => number): string {
        if (this.linewidth <= 0 && this.shading <= 0) return '';
        const { left, top } = this.#getCorner();
        const fill = this.shading > 0 ? `fill="${svgShadingBlend(this.shading)}"` : 'fill="none"';
        const stroke =
            this.linewidth > 0
                ? ` stroke="currentColor" stroke-width="${fSvg(this.linewidth)}" ` +
                  (this.dash.length > 0 ? `stroke-dasharray="${this.dash.join(' ')}" ` : '') +
                  `stroke-linecap="${LINECAP_STYLE}" stroke-linejoin="${LINEJOIN_STYLE}"`
                : '';
        return (
            `<rect x="${fSvg(transX(left))}" y="${fSvg(transY(top))}" ` +
            `width="${fSvg(this.width)}" height="${fSvg(this.height)}" ${fill}${stroke}/>`
        );
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
        const w = this.width;
        const h = this.height;
        const { left, top } = this.#getCorner();
        const divLeft = left - MARK_LINEWIDTH;
        const divTop = H + yOffset - top - MARK_LINEWIDTH;

        const rTop = MARK_LINEWIDTH / 2;
        const rLeft = MARK_LINEWIDTH / 2;
        const mW = w + MARK_LINEWIDTH;
        const mH = h + MARK_LINEWIDTH;
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
                        <rect
                            x={rLeft}
                            y={rTop}
                            width={w}
                            height={h}
                            fill={this.shading > 0 ? fillColor : 'none'}
                            fillOpacity={this.shading > 0 ? this.shading : undefined}
                            stroke={this.linewidth > 0 ? fillColor : 'none'}
                            strokeWidth={this.linewidth}
                            strokeDasharray={this.dash.join(' ')}
                            strokeLinecap={LINECAP_STYLE}
                            strokeLinejoin={LINEJOIN_STYLE}
                        />
                    )}
                    {Ornament.markBorder(rLeft, rTop, l, m, mW, mH, markColor)}
                </svg>
            </div>
        );
    };
    /* eslint-enable react-hooks/rules-of-hooks */
}
