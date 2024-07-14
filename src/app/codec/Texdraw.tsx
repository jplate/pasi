import clsx from 'clsx/lite'

import { round } from '../util/MathTools'

export const ROUNDING_DIGITS = 4;
const PRECISION = 10**ROUNDING_DIGITS; 


export class ParseError extends Error {
    constructor(
        public msg: React.ReactNode,
        public extraWide: boolean = false // indicates whether the modal dialog displaying the error message should be extra-wide.
    ) {super();}
}

export const makeParseError = (message: React.ReactNode, code: string) => {
    const long = code.length > 30;
    const codeComp = long? <pre className='mt-6 w-[50rem]'><code>{code}</code></pre>: <code>{code}</code>;
    return new ParseError(long? 
            <><span>{message}:</span> {codeComp}</>: 
            <span>{message}: {codeComp}.</span>, 
        long
    );
}

export class Point2D {
    constructor(
        public x: number,
        public y: number
    ) {}

    toString(): string {
        return `(${this.x}, ${this.y})`;
    }
}

export interface Fillable {
    fillLevel: number
}
export const isFillable = (obj: any): obj is Fillable => 
    typeof obj.fillLevel === 'number';

export abstract class Shape {
    location: Point2D;
    genericDescription = 'a shape';
    isIndependent = false;

    constructor(location: Point2D) {
        this.location = location;
    }

    getStartingPoint(): Point2D {
        return this.location;
    }

    getEndPoint(): Point2D {
        return this.location;
    }
}

export class Arc extends Shape {
    radius: number;
    start: number;
    end: number;
    readonly genericDescription = 'an arc';
    readonly isIndependent = true;

    constructor(p: Point2D, r: number, st: number, ed: number) {
        super(p);
        this.radius = r;
        this.start = st;
        this.end = ed;
    }

    toString(): string {
        return `(Arc: ${this.location}, r:${this.radius}, st:${this.start}, ed:${this.end})`;
    }
}

export class Circle extends Shape {
    radius: number;
    fillLevel: number;
    readonly genericDescription = 'a circle';
    readonly isIndependent = true;

    constructor(p: Point2D, r: number, fl: number) {
        super(p);
        this.radius = r;
        this.fillLevel = fl;
    }

    toString(): string {
        return `(Circle: ${this.location}, r:${this.radius}, f:${this.fillLevel})`;
    }
}

export class CubicCurve extends Shape implements Fillable {
    p0: Point2D;
    p0a: Point2D;
    p1a: Point2D;
    p1: Point2D;
    fillLevel: number;
    readonly genericDescription = 'a curve';
    readonly isIndependent = false;

    constructor(p0: Point2D, p0a: Point2D, p1a: Point2D, p1: Point2D) {
        super(p0);
        this.p0 = p0;
        this.p0a = p0a;
        this.p1a = p1a;
        this.p1 = p1;
        this.fillLevel = 0;
    }

    toString(): string {
        return `(CubicCurve: ${this.p0}, ${this.p0a}, ${this.p1a}, ${this.p1}${this.fillLevel>0 ? " filled" : ""})`;
    }

    override getStartingPoint() {
        return this.p0;
    }

    override getEndPoint() {
        return this.p1;
    }
}

export class Line extends Shape {
    p0: Point2D;
    p1: Point2D;
    readonly genericDescription = 'a line';
    readonly isIndependent = false;

    constructor(p0: Point2D, p1: Point2D) {
        super(p0);
        this.p0 = p0;
        this.p1 = p1;
    }

    toString(): string {
        return `(Line: ${this.p0}, ${this.p1})`;
    }

    override getStartingPoint() {
        return this.p0;
    }

    override getEndPoint() {
        return this.p1;
    }
}

export class Path extends Shape implements Fillable {
    shapes: Shape[];
    drawn: boolean;
    fillLevel: number;
    readonly genericDescription = 'a curve/line sequence';
    readonly isIndependent = false;

    constructor(shapes: Shape[], drawn: boolean, fillLevel: number) {
        super(shapes[0].location);
        this.shapes = shapes;
        this.drawn = drawn;
        this.fillLevel = fillLevel;
    }

    toString(): string {
        const drawnFilled = [this.drawn? 'drawn': '', this.fillLevel>0? 'filled': ''].filter(s => s!=='').join(', ');
        return `(Path: ${drawnFilled} (${this.shapes.map(sh => sh.toString()).join(', ')})`;
    }
}

export class Stroke {
    linewidth: number;
    pattern: number[];

    constructor(lineWidth: number, pattern: number[]) {
        this.linewidth = lineWidth;
        this.pattern = pattern;
    }

    toString(): string {
        return `(Stroke: ${this.linewidth} (${this.pattern.join(', ')}))`;
    }
}

export class StrokedShape {
    stroke: Stroke;
    shape: Shape;

    constructor(shape: Shape, stroke: Stroke) {
        this.stroke = stroke;
        this.shape = shape;
    }

    toString(): string {
        return `${this.shape.toString()}, ${this.stroke.toString()}`;
    }
}

export class Text {
    text: string;
    vref: string;
    href: string;
    location: Point2D;
    readonly genericDescription = 'a text element';

    constructor(href: string, vref: string, x: number, y: number, text: string) {
        this.text = text;
        this.href = href;
        this.vref = vref;
        this.location = new Point2D(x, y);
    }
}


export const TOP = 'T';
export const LEFT = 'L';
export const RIGHT = 'R';
export const BOTTOM = 'B';
export const CENTER = 'C';

export type Position = typeof TOP | typeof LEFT | typeof RIGHT | typeof BOTTOM | typeof CENTER;


//const shapePattern = /(.*?)(?:\\lvec\s*\((\S+)\s+(\S+)\)|\\clvec\s*\((\S+)\s+(\S+)\)\s*\((\S+)\s+(\S+)\)\s*\((\S+)\s+(\S+)\)|\\larc\s+r:(\S+)\s+sd:(\S+)\s+ed:(\S+)|(?:\\lcir|\\fcir\s+f:(\S+))\s+r:(\S+))/g;
// This pattern works in java, but apparently javascript's regex engine gets easily confused by pattern alternations!
// For example, javascript wrongly thinks that the pattern fails to match the string '\linewd 1 \moved(430 410) \lcir r:12'.
// So we have to use a slightly different approach.

const clvecPattern = /^\\clvec\s*\((\S+)\s+(\S+)\)\s*\((\S+)\s+(\S+)\)\s*\((\S+)\s+(\S+)\)/; // 3 groups for coordinates

const fillPattern = /\\(i|l)fill\s+f:(\S*)/;

const floatPattern = /^-?\d*\.?\d+$/;

const larcPattern = /^\\larc\s+r:(\S+)\s+sd:(\S+)\s+ed:(\S+)/; // radius, starting angle, end angle (in degrees)

const lfcirPattern = /^(?:\\lcir|\\fcir\s+f:(\S+))\s+r:(\S+)/; // fill-level, radius

const linewdPattern = /\\linewd\s+(\S+)/;

const lpattPattern = /\\lpatt\s+\((.*?)\)/;

const lvecPattern = /^\\lvec\s*\((\S+)\s+(\S+)\)/; // 1: x, 2: y

const movePattern = /\\move\s*\((\S+)\s+(\S+)\)/;

const movePattern1 = /\\move\s*\((\S+)\s+(\S+)\)/;

const shapePattern = /(.*?)(\\lvec|\\clvec|\\larc|\\lcir|\\fcir)/; // 1: preamble, 2: shape command

const textPattern = /\\textref\s+h:(.)\s+v:(.)(?!.*\\textref.*).*\\htext\s*\((\S+)\s+(\S+)\)\{(.*)\}/g;


export const extractDashArray = (s: string) => {
    const match = s.match(lpattPattern);
    return match? match[1].split(/\s+/).filter(s => s.length>0).map(s => decodeFloat(s)): null;  
}

export const extractLinewidth = (s: string) => {
    const match = s.match(linewdPattern);
    return match? decodeFloat(match[1]): 0; 
}

export const getStrokedShapes = (code: string, defaultLinewidth: number): StrokedShape[] => {
    const textMatch = code.match(textPattern);
    if (textMatch) return []; // If we're dealing with a textref command, there's no need to go looking for shape commands, because any such commands will all be in the 
        // argument to \htext (i.e., they'll be part of a label text).
    const shapeFinder = new RegExp(shapePattern);
    const list: StrokedShape[] = []; // list of Shapes, incl. Paths
    const lx: Shape[] = []; // current list of Shapes, possibly elements of a Path
    let lw = defaultLinewidth,
        index = 0, // points to the end of the matched portion of the string.
        dashArray: number[] = [],
        stroke: Stroke = new Stroke(lw, dashArray),
        currentPoint: Point2D | null = null,
        newPoint: Point2D | null = null,
        match;

    while ((match = code.match(shapeFinder)) || lx.length > 0) { // Even after the shape commands run out, there may be a fill command to look out for, 
            // which will then be used to add relevant information to the Path to be constructed from the shapes stored in lx.

        index = match? match[0].length: 0;
        //console.log(`index: ${index} code: ${code}`);
        const toSearch = match ? match[1] : code; // match[1] is the material that precedes the first found shape. It might contain, e.g., a move command.
    
        const fillMatch = toSearch.match(fillPattern);
        const lwMatch = toSearch.match(linewdPattern);
        const moveMatch = toSearch.match(movePattern);
        const dashMatch = toSearch.match(lpattPattern);

        //console.log(`tS="${toSearch}" f=${fillMatch!==null}  l=${lwMatch!==null}  m=${moveMatch!==null} d=${dashMatch!==null} M: ${match?.map((m, i, a) => `${i}: "${a[i]}"`).join(', ')}`);
    
        let pathClosed = false,
            fillLevel = 0,
            drawn = true;
        if (fillMatch) {
            pathClosed = true;
            fillLevel = round(1 - decodeFloat(fillMatch[2]), ROUNDING_DIGITS);
            drawn = fillMatch[1]==='l';
        }
        if (moveMatch) { 
            pathClosed = true;
            currentPoint = new Point2D(decodeFloat(moveMatch[1]), decodeFloat(moveMatch[2]));
        }
        if (lwMatch) {
            pathClosed = true;
            lw = decodeFloat(lwMatch[1]);
        }
        if (dashMatch) { 
            pathClosed = true;
            dashArray = dashMatch[1].split(/\s+/).filter(s => s.length>0).map(s => decodeFloat(s));            
        }
        if (pathClosed || !match) {
            const lxs = lx.length;
            if (lxs > 0) {
                const s0 = lx[0];
                if (lxs===1 && isFillable(s0)) {
                    s0.fillLevel = fillLevel;
                }
                const ss = new StrokedShape(
                    lx.length>1? new Path([...lx], drawn, fillLevel): s0,
                    stroke
                );
                list.push(ss);
            }
            lx.length = 0; // clear the array
            pathClosed = false;
        }
  
        if (match) {
            if (!currentPoint) {
                throw makeParseError('No specification of a starting point detected in the following code', code);
            }
    
            stroke = new Stroke(lw, dashArray);
            const shapeString = code.slice(match[1].length);
            let shape: Shape | null = null,
                shapeMatch;
            switch (match[2]) {
                case '\\lvec': if (shapeMatch = shapeString.match(lvecPattern)) {
                        newPoint = new Point2D(decodeFloat(shapeMatch[1]), decodeFloat(shapeMatch[2]));
                        shape = new Line(currentPoint, newPoint);
                        break;
                    } 
                case '\\clvec': if (shapeMatch = shapeString.match(clvecPattern)) {
                        newPoint = new Point2D(decodeFloat(shapeMatch[5]), decodeFloat(shapeMatch[6]));
                        shape = new CubicCurve(
                            currentPoint,
                            new Point2D(decodeFloat(shapeMatch[1]), decodeFloat(shapeMatch[2])),
                            new Point2D(decodeFloat(shapeMatch[3]), decodeFloat(shapeMatch[4])),
                            newPoint
                        );
                        break;
                    } 
                case '\\larc': if (shapeMatch = shapeString.match(larcPattern)) {
                        shape = new Arc(
                            currentPoint,
                            decodeFloat(shapeMatch[1]),
                            decodeFloat(shapeMatch[2]),
                            decodeFloat(shapeMatch[3])
                        );
                        break;
                    }
                case '\\fcir':
                case '\\lcir': if (shapeMatch = shapeString.match(lfcirPattern)) {
                        shape = new Circle(
                            currentPoint,
                            decodeFloat(shapeMatch[2]),
                            shapeMatch[1]? round(1 - decodeFloat(shapeMatch[1]), ROUNDING_DIGITS): 0
                        );
                        break;
                    }
                default: {
                        console.warn(`Missed shape command "${match[2]}"`);
                    }
            }
    
            if (shapeMatch && shape) {
                index = match[1].length + shapeMatch[0].length;
                if (shape.isIndependent) {
                    list.push(new StrokedShape(shape, stroke));
                } else {
                    lx.push(shape);
                }
            }
            if (newPoint) {
                currentPoint = new Point2D(newPoint.x, newPoint.y);
            }
        }
        
        code = code.slice(index);
    }
    return list;
}


const getTexts = (code: string): Text[] => {
    const list: Text[] = [];
    let match: RegExpExecArray | null;
    while (match = textPattern.exec(code)) {
        list.push(new Text(
            match[1],
            match[2],
            decodeFloat(match[3]),
            decodeFloat(match[4]),
            match[5]
        ));
    }
    return list;
}


export const encodeFloat = (f: number): string => {
    let result: string;
    if (f === Number.POSITIVE_INFINITY) {
        result = 'I';
    } 
    else if (f === Number.NEGATIVE_INFINITY) {
        result = 'i';
    } 
    else {
        f = Math.round(f * PRECISION) / PRECISION;
        result = String(round(f, ROUNDING_DIGITS));
    }
    return result;
}

export const decodeFloat = (s: string): number => {
    if(s==='I') return Infinity;
    else if(s==='i') return -Infinity; 
    else {
        const result = parseFloat(s);
        if (isNaN(result) || !s.match(floatPattern)) { // Since parseFloat is very lenient, we have to explicitly check whether s is a proper 
                // representation of a number.            
            //console.trace();
            const max = 20;
            throw new ParseError(<span>Number expected, read <code>{s.length>max? s.slice(0, max-3)+'...': s}</code>.</span>);
        }
        return round(result, ROUNDING_DIGITS);
    }
}


export const start = '\\begin{texdraw}';

export const end = '\\end{texdraw}';

export const dimCmd = '\\drawdim pt \\setunitscale';

export const linewd = (lw: number) => `\\linewd ${encodeFloat(lw)} `;

export const move = (x: number, y: number) => `\\move(${encodeFloat(x)} ${encodeFloat(y)})`;

export const lpatt = (dash: number[]): string => `\\lpatt (${dash.join(' ')})`;

export const line = (x: number, y: number) => `\\lvec(${encodeFloat(x)} ${encodeFloat(y)})`;

export const curve = (p0ax: number, p0ay: number, p1ax: number, p1ay: number, p1x: number, p1y: number) =>
    `\\clvec(${encodeFloat(p0ax)} ${encodeFloat(p0ay)})(${encodeFloat(p1ax)} ${encodeFloat(p1ay)})(${encodeFloat(p1x)} ${encodeFloat(p1y)})`;        

export const ifill = (f: number) => `\\ifill f:${encodeFloat(1 - f)} `;

export const lfill = (f: number) => `\\lfill f:${encodeFloat(1 - f)} `;

export const circ = (r: number) => `\\lcir r:${encodeFloat(r)} `;

export const fcirc = (r: number, f: number) => `\\fcir f:${encodeFloat(1 - f)} r:${encodeFloat(r)} `;

export const textref = (horizontal: Position, vertical: Position) => `\\textref h:${horizontal} v:${vertical} `;

export const movePoint = (s: string) => {
    const match = s.match(movePattern1);
    return match? new Point2D(decodeFloat(match[1]), decodeFloat(match[2])): null;
}

/**
 * Returns a texdraw command sequence for both 'filled' and 'drawn' shapes. ('Drawn' shapes are ones that are not supposed to be filled.)
 * The sequence contains a command sequence for drawn shapes if and only if the following three conditions are satisfied:
 * 1. The specified shading is zero or the filled shapes form an open path (so that the texdraw command 'lfill' cannot be used even if the shading is non-zero).
 * 2. There is at least one drawn shape.
 * 3. The specified linewidth is greater than zero.
 */
export const getCommandSequence = (filledShapes: Shape[], drawnShapes: Shape[], openPath: boolean, lw: number, dash: number[], shading: number): string => {
    const result: string[] = [];
    const filled = shading > 0;
    if (filled && filledShapes.length > 0) {
        if (!openPath && lw > 0) { // If there's no open path, we'll use lfill (provided that linewidth is not zero) and not add any commands for the drawnShapes. 
                // So, if linewidth is non-zero, we'll need to add commands to set the linewidth and dash pattern, if applicable. 
            result.push(linewd(lw));        
            if (dash.length>0) { // Since, in the texdraw code, we always reset the dash pattern after changing it to something other than the empty string, we
                    // only need to add a command for it if the dash array is non-empty.
                result.push(lpatt(dash));
            }
        }
        const start = filledShapes[0].getStartingPoint();
        result.push(move(start.x, start.y));
        result.push(getShapeCommand(filledShapes[0]));
        for(let i = 1; i < filledShapes.length; i++) {
            result.push(getShapeCommand(filledShapes[i]));
        }
        if (openPath || lw===0) {            
            result.push(ifill(shading));
        }
        else {
            result.push(lfill(shading));
            if (dash.length>0) {
                // reset dash pattern
                result.push(lpatt([]));
            }
        }
    }
    if ((!filled || openPath) && drawnShapes.length > 0 && lw > 0) {
        // If there's an openPath, then we didn't use lfill but rather ifill, and so there's still the need to draw the shapes (provided there are any and lw>0).
        result.push(getCommandSequenceForDrawnShapes(drawnShapes, lw, dash));
    }
    return result.join('');
}

/**
 * Returns a texdraw command sequence for 'drawn' shapes, i.e., shapes that are not supposed to be filled.
 */
export const getCommandSequenceForDrawnShapes = (shapes: Shape[], lw: number, dash: number[]): string => {
    const result: string[] = [];
    
    if (dash.length>0) {
        result.push(lpatt(dash));
    }
    result.push(linewd(lw));

    const start = shapes[0].getStartingPoint();
    result.push(move(start.x, start.y));
    result.push(getShapeCommand(shapes[0]));

    let prevPoint = shapes[0].getEndPoint();
    for(let i = 1; i < shapes.length; i++) {
        const newPoint = shapes[i].getStartingPoint();
        if (prevPoint.x===newPoint.x && prevPoint.y===newPoint.y) {
            result.push(getShapeCommand(shapes[i]));
        }
        else { // In this case there's a jump, so we'll have to insert a texdraw move command.
            result.push(move(newPoint.x, newPoint.y));
            result.push(getShapeCommand(shapes[i]));
        }
        prevPoint = shapes[i].getEndPoint();
    }
    if (dash.length > 0) result.push(lpatt([]));

    return result.join('');
}

/**
 * The original version (in java) also handles the case where sh is an Arc. For now we'll ignore that case.
 */
export const getShapeCommand = (sh: Shape): string => {
    if (sh instanceof Line) {
        return line(sh.p1.x, sh.p1.y)
    }
    else if (sh instanceof CubicCurve) {
        return curve(sh.p0a.x, sh.p0a.y, sh.p1a.x, sh.p1a.y, sh.p1.x, sh.p1.y);
    }
    else {
        console.warn(`Unexpected shape: ${sh.genericDescription}`);
        return '';
    }
}
