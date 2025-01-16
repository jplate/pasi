import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx/lite';
import { Lora } from 'next/font/google';
import Item, { Range } from '../Item';
import Ornament, { OrnamentCompProps, ROUNDING_DIGITS, MIN_GAP, MAX_GAP } from '../Ornament';
import Node from '../Node';
import ENode from '../ENode';
import CNodeGroup from '../../CNodeGroup';
import { H, MARK_LINEWIDTH } from '@/app/Constants';
import { Entry } from '../../ItemEditor';
import { parseInputValue, parseCyclicInputValue, validInt } from '../../EditorComponents';
import { MIN_ROTATION } from '@/app/Constants';
import { getCyclicValue, round } from '@/app/util/MathTools';
import * as Texdraw from '@/app/codec/Texdraw';
import { ParseError } from '@/app/codec/Texdraw';
import { encode, decode } from '@/app/codec/General';

export const MIN_WIDTH = 5;
export const MIN_HEIGHT = 5;
export const MAX_WIDTH = 300;
export const DISPLAY_FONTSIZE_RATIO = 0.88;
export const DISPLAY_LINE_SPACING = 1.2;
export const MIN_PARBOX_WIDTH = 0;
export const MAX_PARBOX_WIDTH = 9999;
export const DEFAULT_PARBOX_WIDTH = 200;

const NORMAL_FONT = 'Lora';
const normalFont = Lora({
    weight: ['400'],
    subsets: ['latin'],
    style: ['normal'],
});

const MATH_FONT = 'Lora';
const mathFont = Lora({
    weight: ['400'],
    subsets: ['latin'],
    style: ['italic'],
});

type Line = {
    text: string;
    width: number;
    asc: number; // the ascender height of this line
    desc: number; // the descender height
};

const fontSizes = Array.from(Texdraw.fontSizes.values());
const fontSizeCmds = Array.from(Texdraw.fontSizes.keys()).map((label) => `\\${label}`);
const fontSizeCmdReps = fontSizeCmds.map((cmd, i) => <code key={i}>{cmd}</code>);
const normalFontSize = Texdraw.fontSizes.getByKey(Texdraw.NORMAL_SIZE_STRING) as number;

const fontSizePattern = new RegExp(`.*?\\\\(${Array.from(Texdraw.fontSizes.keys()).join('|')}) `);
const mathPattern = /^\s*\$(.*)\$\s*$/;
const vphantPattern0 = /^\s?\\vphantom\{(.*?)\}/;
const vphantPattern1 = /\\vphantom\{(.*)\}$/;
const centeredTextPattern = /^\\begin\{center\}(.*)\\(?:\\\\)*end\{center\}$/;
const parboxPattern = /^\s*\\parbox\{(\d+(?:\.\d+)?)pt\}\{(.*)\}$/;

export default class Label extends Ornament {
    text: string = '';
    centered: boolean = false;
    mathMode: boolean = false;
    vphant: string = '';
    fontSize: number = normalFontSize;
    parbox: boolean = false;
    parboxWidth: number = DEFAULT_PARBOX_WIDTH;
    centerText: boolean = false;
    tilt: number = 0;

    private lines: Line[] = [];

    /**
     * Creates a new Label, which is added (via the superclass constructor) to the supplied Node's array of Ornaments.
     * It also receives a unique ID.
     */
    constructor(node: Node) {
        super(node);
        this.width = MIN_WIDTH;
        this.height = this.fontSize * DISPLAY_FONTSIZE_RATIO;
    }

    override clone(node: Node) {
        const clone = new Label(node);
        this.copyValuesTo(clone);
        return clone;
    }

    protected override copyValuesTo(target: Label) {
        super.copyValuesTo(target);
        target.centered = this.centered;
        target.text = this.text;
        target.fontSize = this.fontSize;
        target.mathMode = this.mathMode;
        target.vphant = this.vphant;
        target.parbox = this.parbox;
        target.parboxWidth = this.parboxWidth;
        target.centerText = this.centerText;
    }

    override getWidth() {
        return this.width;
    }

    override getHeight() {
        return this.height;
    }

    override getBottomLeftCorner() {
        const { top, left } = this.#getTopLeftCorner(this.width, this.height);
        return { bottom: top - this.height, left: left };
    }

    #getTopLeftCorner(w: number, h: number) {
        const angle = this.angle;
        const angleRad = (angle / 180) * Math.PI;
        const [hPos, vPos] = this.#getPositioning();
        const r = this.node.radius + this.node.linewidth / 2 + this.gap;
        const [nx, ny] = this.node.getLocation();
        return {
            left: nx + (this.centered || hPos === 0 ? -w / 2 : r * Math.cos(angleRad) - (hPos < 0 ? w : 0)),
            top: ny + (this.centered || vPos === 0 ? h / 2 : r * Math.sin(angleRad) + (vPos > 0 ? h : 0)),
        };
    }

    #getPositioning() {
        const angle = this.angle;
        return [
            angle < -90 || angle > 90 ? -1 : angle === -90 || angle == 90 ? 0 : 1,
            angle > 0 && angle < 180 ? 1 : angle === 0 || angle === 180 ? 0 : -1,
        ];
    }

    #getRefPoint(hPos: number, vPos: number, left: number, bottom: number, centeredText: boolean) {
        const centered = this.centered;
        const w = this.getWidth();
        const h = this.getHeight();
        const lineH = this.fontSize; // This is needed to compensate for a texdraw quirk in connection with '\begin{center}...\end{center}' in parboxes.
        const [nx, ny] = this.node.getLocation();
        return {
            x: centered || hPos === 0 ? nx : hPos === -1 ? left + w : left,
            y:
                centered || vPos === 0
                    ? ny
                    : (vPos === -1 ? bottom + h : bottom) - (centeredText ? vPos * lineH : 0),
        };
    }

    override getInfo(): Entry[] {
        return [
            { type: 'checkbox', key: 'centered', text: 'Centered', value: this.centered },
            {
                type: 'number input',
                key: 'gap',
                text: 'Gap',
                negativeTopMargin: true,
                width: 'long',
                value: this.gap,
                step: 0,
                disabled: this.centered,
                tooltip: (
                    <>
                        The distance between the circumference of the node to which the label is attached and
                        the closest point of the label&rsquo;s own bounding box.
                    </>
                ),
                tooltipPlacement: 'left',
            },
            {
                type: 'number input',
                key: 'angle',
                text: 'Position angle',
                width: 'long',
                value: this.angle,
                step: 0,
                disabled: this.centered,
                tooltip: (
                    <>
                        The angle of a straight line from the center of the node to which the label is
                        attached to the nearest point of the label&rsquo;s own bounding box.
                    </>
                ),
                tooltipPlacement: 'left',
            },
            {
                type: 'checkbox',
                key: 'parbox',
                text: <code>\parbox</code>,
                value: this.parbox,
                tooltip: (
                    <>
                        Wrap the content of the label in a <code>\parbox</code> command.
                    </>
                ),
                tooltipPlacement: 'right',
            },
            {
                type: 'number input',
                key: 'parbox width',
                text: 'Width',
                negativeTopMargin: true,
                width: 'long',
                value: this.parboxWidth,
                step: 0,
                disabled: !this.parbox,
            },
            {
                type: 'checkbox',
                key: 'center text',
                text: 'Center content',
                value: this.centerText,
                disabled: !this.parbox,
            },
            {
                type: 'checkbox',
                key: 'mathMode',
                text: 'Math mode',
                value: this.mathMode,
                disabled: this.parbox,
                tooltip: (
                    <>
                        Enclose the content of the label in a pair of <code>$</code> characters.
                    </>
                ),
                tooltipPlacement: 'right',
            },
            {
                type: 'number input',
                key: 'tilt',
                text: 'Tilt',
                negativeTopMargin: true,
                width: 'long',
                value: this.tilt,
                step: 0,
                tooltip: (
                    <>
                        Rotation angle (in degrees). Note: not every <i>PostScript</i> driver supports rotated
                        text.
                    </>
                ),
                tooltipPlacement: 'left',
            },
            {
                type: 'string input',
                key: 'vphant',
                text: (
                    <>
                        <code>\vphantom</code>
                    </>
                ),
                value: this.vphant,
                width: 'long',
                tooltip: (
                    <>
                        Include a <code>\vphantom</code> command with the specified string. (If the{' '}
                        <code>\parbox</code> option is selected, this command will be inserted both at the end
                        and at the beginning of the text.)
                    </>
                ),
                tooltipPlacement: 'left',
            },
            {
                type: 'menu',
                key: 'fontSize',
                text: 'Font size',
                values: fontSizeCmdReps,
                value: fontSizes.indexOf(this.fontSize),
                step: 1,
                tooltip: (
                    <>
                        Include font size command (if distinct from <code>\{Texdraw.NORMAL_SIZE_STRING}</code>
                        ).
                    </>
                ),
                tooltipPlacement: 'left',
            },
            { type: 'textarea', key: 'text', fullHeight: true, value: this.text },
        ];
    }

    override handleEditing(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | null,
        _logIncrement: number,
        _selection: Item[],
        unitScale: number,
        displayFontFactor: number,
        key: string
    ): [(item: Item, list: (ENode | CNodeGroup)[]) => (ENode | CNodeGroup)[], applyTo: Range] {
        switch (key) {
            case 'angle':
                if (e) {
                    const delta = parseCyclicInputValue(e.target.value, this.angle, 1)[1];
                    return [
                        (item, array) => {
                            if (!isNaN(delta) && delta !== 0 && item instanceof Label) {
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
                if (e) {
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
            case 'centered': {
                const centered = !this.centered;
                return [
                    (item, array) => {
                        if (item instanceof Label) {
                            item.centered = centered;
                        }
                        return array;
                    },
                    'wholeSelection',
                ];
            }
            case 'text':
                if (e) {
                    const text = e.target.value;
                    return [
                        (item, array) => {
                            if (item instanceof Label) {
                                item.text = text;
                                item.updateLines(unitScale, displayFontFactor);
                            }
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            case 'fontSize':
                if (typeof e === 'number') {
                    const index = e;
                    return [
                        (item, array) => {
                            if (item instanceof Label) {
                                const fontSize = fontSizes[index];
                                item.fontSize = fontSize;
                                item.updateLines(unitScale, displayFontFactor);
                            }
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            case 'vphant':
                if (e) {
                    return [
                        (item, array) => {
                            if (item instanceof Label) {
                                item.vphant = e.target.value;
                                item.updateLines(unitScale, displayFontFactor);
                            }
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            case 'mathMode': {
                const mathMode = !this.mathMode;
                return [
                    (item, array) => {
                        if (item instanceof Label) {
                            item.mathMode = mathMode;
                            item.updateLines(unitScale, displayFontFactor);
                        }
                        return array;
                    },
                    'wholeSelection',
                ];
            }
            case 'tilt':
                if (e) {
                    const delta = parseCyclicInputValue(e.target.value, this.tilt, 1)[1];
                    return [
                        (item, array) => {
                            if (!isNaN(delta) && delta !== 0 && item instanceof Label) {
                                item.tilt = getCyclicValue(
                                    item.tilt + delta,
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
            case 'parbox': {
                const parbox = !this.parbox;
                return [
                    (item, array) => {
                        if (item instanceof Label) {
                            item.parbox = parbox;
                            item.updateLines(unitScale, displayFontFactor);
                        }
                        return array;
                    },
                    'wholeSelection',
                ];
            }
            case 'parbox width':
                if (e) {
                    const val = validInt(e.target.value, MIN_PARBOX_WIDTH, MAX_PARBOX_WIDTH);
                    const d = val - this.parboxWidth;
                    return [
                        (item, array) => {
                            if (!isNaN(d) && d !== 0 && item instanceof Label) {
                                item.parboxWidth = round(item.parboxWidth + d, ROUNDING_DIGITS);
                                item.updateLines(unitScale, displayFontFactor);
                            }
                            return array;
                        },
                        'wholeSelection',
                    ];
                }
            case 'center text': {
                const centeredText = !this.centerText;
                return [
                    (item, array) => {
                        if (item instanceof Label) {
                            item.centerText = centeredText;
                        }
                        return array;
                    },
                    'wholeSelection',
                ];
            }
            default:
                return [(item, array) => array, 'onlyThis'];
        }
    }

    override reset() {} // Since there is no reset button in the editor, we don't need to do anything here.

    override getInfoString() {
        return [
            this.gap,
            this.angle,
            (this.parbox && this.mathMode) || (!this.parbox && this.centerText) ? 1 : 0,
        ]
            .map(encode)
            .join(' ');
    }

    override getTexdrawCode(unitScale: number) {
        const vphantomCmd = this.vphant.length > 0 ? `\\vphantom{${this.vphant}}` : '';
        const textWithVphantom = this.parbox
            ? `${vphantomCmd}${this.text}${vphantomCmd}`
            : `${vphantomCmd}${this.text}`;
        const centeredText = this.centerText;
        const textWithoutSizeCmds = this.parbox
            ? `\\parbox{${this.parboxWidth * unitScale}pt}{${centeredText ? '\\begin{center}' : ''}${textWithVphantom}${centeredText ? '\\end{center}' : ''}}`
            : this.mathMode
              ? `$${textWithVphantom}$`
              : textWithVphantom;
        const centered = this.centered;
        const fontSizeIndex = fontSizes.indexOf(this.fontSize);
        if (fontSizeIndex === -1) {
            console.warn(`Invalid font size: ${this.fontSize}`);
            return '';
        }
        const [hPos, vPos] = this.#getPositioning();
        const { bottom, left } = this.getBottomLeftCorner();
        const { x, y } = this.#getRefPoint(hPos, vPos, left, bottom, centeredText);
        return [
            Texdraw.textref(
                centered || hPos === 0 ? Texdraw.CENTER : hPos > 0 ? Texdraw.LEFT : Texdraw.RIGHT,
                centered || vPos === 0 ? Texdraw.CENTER : vPos > 0 ? Texdraw.BOTTOM : Texdraw.TOP
            ),
            Texdraw.text(
                x,
                y,
                this.tilt,
                clsx(this.fontSize !== normalFontSize && fontSizeCmds[fontSizeIndex], textWithoutSizeCmds)
            ),
        ].join('');
    }

    override parse(
        tex: string,
        info: string | null,
        dimRatio: number,
        unitScale: number,
        displayFontFactor: number,
        name?: string
    ) {
        // The 'name' in this case is a string that identifies the node to which this Label is supposed to be attached.
        const texts = Texdraw.getTexts(tex);
        if (texts.length < 1) {
            throw new ParseError(<>Missing text element in definition of label for {name}.</>);
        }
        if (texts[0].href === Texdraw.CENTER && texts[0].vref === Texdraw.CENTER) {
            this.centered = true;
        }
        if (isFinite(texts[0].tilt)) {
            this.tilt = texts[0].tilt;
        }
        let text = texts[0].text;
        const fontSizeMatch = text.match(fontSizePattern);
        if (fontSizeMatch) {
            //console.log(`fsm: "${fontSizeMatch[0]}"`);
            const detectedFontSize = Texdraw.fontSizes.getByKey(fontSizeMatch[1]);
            if (detectedFontSize) {
                this.fontSize = detectedFontSize;
            }
            text = text.slice(fontSizeMatch[0].length);
        }

        const parboxMatch = text.match(parboxPattern);
        if (parboxMatch) {
            this.parbox = true;
            const val = parseFloat(parboxMatch[1]);
            if (isNaN(val) || val < 0) {
                throw new ParseError(
                    (
                        <span>
                            Invalid <code>\parbox</code> width: <code>{parboxMatch[1]}</code>
                        </span>
                    )
                );
            }
            this.parboxWidth = round((dimRatio * val) / unitScale, ROUNDING_DIGITS);
            text = parboxMatch[2];
        } else {
            this.parbox = false;
        }

        if (!this.parbox) {
            const mathMatch = text.match(mathPattern);
            if (mathMatch) {
                this.mathMode = true;
                text = mathMatch[1];
            } else {
                this.mathMode = false;
            }
        } else {
            // If we do have a parbox, its text might be centered. So we check:
            const centeredTextMatch = text.match(centeredTextPattern);
            if (centeredTextMatch) {
                this.centerText = true;
                text = centeredTextMatch[1];
            } else {
                this.centerText = false;
            }
        }

        const vphantMatch0 = text.match(vphantPattern0);
        if (vphantMatch0) {
            this.vphant = vphantMatch0[1];
            text = text.slice(vphantMatch0[0].length);
            if (this.parbox) {
                // In this case there should also be a \vphantom at the end of the text.
                const vphantMatch1 = text.match(vphantPattern1);
                if (vphantMatch1) {
                    // We have to check if this string is the same we already found, or whether it has been altered by the user.
                    if (vphantMatch0[1] === vphantMatch1[1]) {
                        text = text.slice(0, vphantMatch1.index);
                    } // Otherwise the \vphantom string at the end has been changed by the user, so we include it in the text, so that the information
                    // doesn't get lost.
                }
            }
        }

        this.text = text;
        this.updateLines(unitScale / dimRatio, displayFontFactor);

        if (info) {
            const split = info.split(/\s+/).filter((s) => s.length > 0);
            if (split.length !== 3) {
                throw new ParseError(
                    (
                        <span>
                            Label configuration string should contain exactly three elements, not{' '}
                            {split.length}.
                        </span>
                    )
                );
            }
            const [gap, angle, specialBit] = split.map((s) => {
                const val = decode(s);
                // console.log(`s: "${s}" val: ${val}`);
                if (!isFinite(val)) {
                    throw Texdraw.makeParseError('Unexpected token in label configuration string', s);
                }
                return val;
            });
            const scaledGap = dimRatio * gap;

            if (scaledGap < MIN_GAP) {
                throw new ParseError(
                    (
                        <span>
                            Illegal data in definition of label for {name}: gap {scaledGap} below minimum
                            value.
                        </span>
                    )
                );
            } else if (scaledGap > MAX_GAP) {
                throw new ParseError(
                    (
                        <span>
                            Illegal data in definition of label for {name}: gap {scaledGap} exceeds maximum
                            value.
                        </span>
                    )
                );
            }

            this.gap = scaledGap;
            this.angle = getCyclicValue(angle, MIN_ROTATION, 360, Texdraw.ROUNDING_DIGITS);
            if (specialBit !== 0) {
                // The 'special bit' encodes a bit of information that we weren't able to put into the texdraw code.
                if (this.parbox) {
                    this.mathMode = true;
                } else {
                    this.centerText = true;
                }
            }
        }
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

    static #split(text: string, maxWidth: number, ctx: CanvasRenderingContext2D): string[] {
        const words = text.split(/\s+/);
        const result: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = ctx.measureText(testLine).width;

            if (testWidth > maxWidth) {
                if (currentLine) {
                    result.push(currentLine);
                    currentLine = word;
                } else {
                    result.push(word);
                    currentLine = '';
                }
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            result.push(currentLine);
        }
        return result;
    }

    /**
     * Updates this.lines, as well as this.width and this.height. This function is called from a number of places, including the MainPanel
     * and the functions returned by Item.handleEditing() (and hence from the callBacks constructed by ItemEditor). It would have been more in the
     * declarative spirit to do these things at render, but that would be too late for the purposes of MainPanel.adjustLimit().
     */
    updateLines(unitScale: number, displayFontFactor: number): void {
        const lines: Line[] = [];
        let textW = 0,
            textH = 0;
        const canvas = document.getElementById('real-canvas') as HTMLCanvasElement | null;
        if (canvas) {
            // Here we determine the (approximate) height of the text:
            const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
            const measureFontSize = (this.fontSize * displayFontFactor) / unitScale;
            const fontString = `400 ${this.mathMode ? 'italic' : 'normal'} ${measureFontSize}px ${this.mathMode ? MATH_FONT : NORMAL_FONT} serif`;
            ctx.font = fontString;

            const lineStrings = this.parbox ? Label.#split(this.text, this.parboxWidth, ctx) : [this.text];
            const n = lineStrings.length;
            lineStrings.forEach((s, i) => {
                const textToMeasureH = s === '' ? 'a' : s;
                const textToMeasureV =
                    this.vphant && (i === 0 || i === n - 1) ? `${this.vphant}${s}` : s === '' ? 'a' : s;
                const textMetricsH = ctx.measureText(textToMeasureH);
                const textMetricsV = ctx.measureText(textToMeasureV);
                const w = textMetricsH.width;
                const asc = textMetricsV.actualBoundingBoxAscent;
                const desc = textMetricsV.actualBoundingBoxDescent;
                textW = Math.max(textW, w);
                if (i === 0) {
                    textH = asc;
                }
                if (i < n - 1) {
                    textH += DISPLAY_FONTSIZE_RATIO * measureFontSize * DISPLAY_LINE_SPACING;
                } else {
                    textH += desc;
                }
                const line: Line = { text: s, width: w, asc: asc, desc: desc };
                lines.push(line);
            });

            if (false) {
                // For debugging purposes (requires the 'real-canvas' element to not be hidden).
                const { width: cw, height: ch } = canvas ?? { width: 0, height: 0 }; // Somehow TS forgets that canvas can't be null at this point.
                ctx.clearRect(0, 0, cw, ch);
                ctx.fillText(this.text, 0, 50);
                console.log(`canvas-font: ${ctx.font} should be: ${fontString}`);
            }
        } else {
            // This shouldn't normally happen.
            console.warn("Element 'real-canvas' not found.");
        }
        this.lines = lines;
        this.width = Math.max(MIN_WIDTH, this.parbox ? this.parboxWidth : textW);
        this.height = Math.max(MIN_HEIGHT, textH);
        //console.log(`n: ${lines.length} height: ${this.height}`);
    }

    protected Component = ({
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
    }: OrnamentCompProps) => {
        const [width, setWidth] = useState(this.width);
        const textElementRef = useRef<SVGTextElement>(null); // This is needed for the case that we don't have a parbox. In that case the width of the label
        // has to be adjusted dynamically based on the content, and this can be done more accurately using a ref for the text element.

        const text = this.text;
        const lines = this.lines;
        const height = this.height;
        const fontSize = (DISPLAY_FONTSIZE_RATIO * this.fontSize * displayFontFactor) / unitScale;
        const mathMode = this.mathMode;
        const parbox = this.parbox;

        useEffect(() => {
            if (!parbox && textElementRef.current) {
                // If parbox is false, we try to get a width measurement directly from the text element itself. This may
                // be a good deal more accurate than what can be done with updateLines().
                this.width = Math.max(MIN_WIDTH, textElementRef.current.getBBox().width);
            }
            setWidth(this.width);
        }, [parbox, lines]);

        // Compute the positioning of the div:
        const { left: labelLeft, top: labelTop } = this.#getTopLeftCorner(width, height);
        const divLeft = labelLeft - MARK_LINEWIDTH;
        const divTop = H + yOffset - labelTop - MARK_LINEWIDTH;
        const [hPos, vPos] = this.#getPositioning();
        const centered = this.centered;

        // Compute the coordinates (and dimensions) of the inner rectangle, relative to the div:
        const top = MARK_LINEWIDTH / 2;
        const left = MARK_LINEWIDTH / 2;
        const mW = width + MARK_LINEWIDTH; // width and...
        const mH = height + MARK_LINEWIDTH * 2; // ...height relevant for drawing the 'mark border'
        const l = Math.min(Math.max(5, mW / 5), 25);
        const m = Math.min(Math.max(5, mH / 5), 25);
        const firstAsc = lines.length > 0 ? Math.max(MIN_HEIGHT - lines[0].desc, lines[0].asc) : MIN_HEIGHT;

        return (
            <div
                className={
                    focus ? 'focused' : selected ? 'selected' : preselected ? 'preselected' : 'unselected'
                }
                id={this.id}
                onMouseDown={(e) => onMouseDown(this, e)}
                onMouseEnter={(e) => onMouseEnter(this, e)}
                onMouseLeave={(e) => onMouseLeave(this, e)}
                style={{
                    position: 'absolute',
                    left: `${divLeft}px`,
                    top: `${divTop}px`,
                    cursor: 'pointer',
                    transform: `rotate(${-this.tilt}deg)`,
                    transformOrigin: `${centered || hPos === 0 ? width / 2 : hPos === -1 ? width : 0}px ${centered || vPos === 0 ? height / 2 : vPos === -1 ? 0 : height}px`,
                }}
            >
                <svg
                    width={width + MARK_LINEWIDTH * 4}
                    height={height + MARK_LINEWIDTH * 4}
                    xmlns='http://www.w3.org/2000/svg'
                    style={{ overflow: 'visible' }}
                >
                    {(() => {
                        if (lines.length > 0) {
                            const fontClassName =
                                !parbox && mathMode ? mathFont.className : normalFont.className;
                            const fillColor = `hsl(${primaryColor.hue},${primaryColor.sat}%,${primaryColor.lgt}%`;
                            if (parbox) {
                                let next = firstAsc,
                                    baseLine = 0;
                                return lines.map((line, i) => {
                                    baseLine = next;
                                    next += fontSize * DISPLAY_LINE_SPACING;
                                    //console.log(`line ${i}: ${line.text} w: ${line.width}`);
                                    return (
                                        <text
                                            key={i}
                                            x={left + (this.centerText ? (width - line.width) / 2 : 0)}
                                            y={MARK_LINEWIDTH + top + baseLine}
                                            className={fontClassName}
                                            fontSize={fontSize}
                                            wordSpacing={
                                                this.centerText
                                                    ? 'normal'
                                                    : `${(width - line.width) / line.text.split(/\s+/).length}px`
                                            }
                                            fill={fillColor}
                                        >
                                            {line.text}
                                        </text>
                                    );
                                });
                            } else {
                                return (
                                    <text
                                        ref={textElementRef}
                                        x={left}
                                        y={MARK_LINEWIDTH + top + firstAsc}
                                        className={fontClassName}
                                        fontSize={fontSize}
                                        fill={fillColor}
                                    >
                                        {text}{' '}
                                        {/* Interestingly, putting 'lines[0].text' instead of 'text' here leads to textElementRef being assigned to
                                                a different text element! Apparently, React cares how we refer to a string. */}
                                    </text>
                                );
                            }
                        }
                    })()}
                    {Ornament.markBorder(left, top, l, m, mW, mH, markColor)}
                </svg>
            </div>
        );
    };
}
