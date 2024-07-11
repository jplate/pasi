import { round } from '../util/MathTools'

export const ROUNDING_DIGITS = 4;
const PRECISION = 10**ROUNDING_DIGITS; 


export class ParseError extends Error {
    constructor(
        public msg: React.ReactNode,
        public extraWide: boolean = false // indicates whether the modal dialog displaying the error message should be extra-wide.
    ) {super();}
}

class Point2D {
    constructor(
        public x: number,
        public y: number
    ) {}
    toString(): string {
        return `(${this.x}, ${this.y})`;
    }
}

interface Fillable {
    fillLevel: number
    filled: boolean
}
const isFillable = (obj: any): obj is Fillable => 
    typeof obj.fillLevel === 'number' &&
    typeof obj.filled === 'boolean';

export abstract class Shape {
    location: Point2D;
    genericDescription = 'a shape';
    isIndependent = false;

    constructor(location: Point2D) {
        this.location = location;
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
    filled: boolean;
    fillLevel: number;
    readonly genericDescription = 'a circle';
    readonly isIndependent = true;

    constructor(p: Point2D, r: number, f: boolean, fl: number) {
        super(p);
        this.radius = r;
        this.filled = f;
        this.fillLevel = fl;
    }

    toString(): string {
        return `(Circle: ${this.location}, r:${this.radius}, f:${this.fillLevel})`;
    }
}

export class CubicCurve extends Shape implements Fillable {
    p1: Point2D;
    p1a: Point2D;
    p2a: Point2D;
    p2: Point2D;
    filled: boolean;
    fillLevel: number;
    readonly genericDescription = 'a curve';
    readonly isIndependent = false;

    constructor(p1: Point2D, p1a: Point2D, p2a: Point2D, p2: Point2D) {
        super(p1);
        this.p1 = p1;
        this.p1a = p1a;
        this.p2a = p2a;
        this.p2 = p2;
        this.filled = false;
        this.fillLevel = 0;
    }

    toString(): string {
        return `(CubicCurve: ${this.p1}, ${this.p1a}, ${this.p2a}, ${this.p2}${this.filled ? " filled" : ""})`;
    }
}

export class Line extends Shape {
    p1: Point2D;
    p2: Point2D;
    readonly genericDescription = 'a line';
    readonly isIndependent = false;

    constructor(p1: Point2D, p2: Point2D) {
        super(p1);
        this.p1 = p1;
        this.p2 = p2;
    }

    toString(): string {
        return `(Line: ${this.p1}, ${this.p2})`;
    }
}

export class Path extends Shape implements Fillable {
    shapes: Shape[];
    drawn: boolean;
    filled: boolean;
    fillLevel: number;
    readonly genericDescription = 'a curve/line sequence';
    readonly isIndependent = false;

    constructor(shapes: Shape[], drawn: boolean, filled: boolean, fillLevel: number) {
        super(shapes[0].location);
        this.shapes = shapes;
        this.drawn = drawn;
        this.filled = filled;
        this.fillLevel = fillLevel;
    }

    toString(): string {
        return `(Path: ${(this.drawn ? "drawn" : "")}${(this.filled ? (this.drawn ? ", filled" : "filled") : "")}${this.shapes.join(', ')})`;
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
// So we have to use a slightly different approach.

const shapePattern = /(.*?)(\\lvec|\\clvec|\\larc|\\lcir|\\fcir)/g; // 1: preamble, 2: shape command

const lvecPattern = /^\\lvec\s*\((\S+)\s+(\S+)\)/; // 1: x, 2: y

const clvecPattern = /^\\clvec\s*\((\S+)\s+(\S+)\)\s*\((\S+)\s+(\S+)\)\s*\((\S+)\s+(\S+)\)/; // 3 groups for coordinates

const larcPattern = /^\\larc\s+r:(\S+)\s+sd:(\S+)\s+ed:(\S+)/; // radius, starting angle, end angle (in degrees)

const lfcirPattern = /^(?:\\lcir|\\fcir\s+f:(\S+))\s+r:(\S+)/; // fill-level, radius

const textPattern = /\\textref\s+h:(.)\s+v:(.)(?!.*\\textref.*).*\\htext\s*\((\S+)\s+(\S+)\)\{(.*)\}/g;

const linewdPattern = /.*\\linewd\s+(\S+)/;

const movePattern = /.*\\move\s*\((\S+)\s+(\S+)\)/;

const movePattern1 = /\\move\s*\((\S+)\s+(\S+)\)/;

const lpattPattern = /.*\\lpatt\s+\((.*)\)/;

const fillPattern = /.*\\(i|l)fill\s+f:(.*)/;

const floatPattern = /^-?\d*\.?\d+$/;


export const extractDashArray = (s: string) => {
    const match = s.match(lpattPattern);
    console.log(`m: ${match}`);
    return match? match[1].split(/\s+/).filter(s => s.length>0).map(s => decodeFloat(s)): null;  
}


export const getStrokedShapes = (s: string, defaultLinewidth: number): StrokedShape[] => {
    const textMatch = s.match(textPattern);
    if (textMatch) return []; // If we're dealing with a textref command, there's no need to go looking for shape commands, because any such commands will all be in the 
        // argument to \htext (i.e., they'll be part of a label text).
    const shapeFinder = new RegExp(shapePattern);
    let match = shapeFinder.exec(s);
  
    const l: StrokedShape[] = []; // list of Shapes, incl. Paths
    const lx: Shape[] = []; // current list of Shapes, possibly elements of a Path
    let lw = defaultLinewidth,
        index = 0, // to keep track of how far we've come in our search for shape commands in s.
        dashArray: number[] = [],
        stroke: Stroke = new Stroke(lw, dashArray),
        currentPoint: Point2D | null = null,
        newPoint: Point2D | null = null;
  
    while (match || lx.length > 0) { // Even after the shape commands run out, there may be a fill command to look out for, which will then be used to 
            // add relevant information to the Path to be constructed from the shapes stored in lx.

        if (match) {
            index = match.index + match[0].length;
        }
        const toSearch = match ? match[1] : s.slice(index); // m[1] is the material that precedes the first found shape. It might contain, e.g., a move command.
    
        const fillMatch = fillPattern.exec(toSearch);
        const lwMatch = linewdPattern.exec(toSearch);
        const moveMatch = movePattern.exec(toSearch);
        const dashMatch = lpattPattern.exec(toSearch);

        //console.log(`tS="${toSearch}" f=${fillMatch!==null}  l=${lwMatch!==null}  m=${moveMatch!==null} d=${dashMatch!==null} M: ${match?.map((m, i, a) => `${i}: "${a[i]}"`).join(', ')}`);
    
        let pathClosed = false,
            filled = false,
            fillLevel = 0,
            drawn = true;
        if (fillMatch) {
            pathClosed = true;
            filled = true;
            fillLevel = decodeFloat(fillMatch[2]);
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
                    s0.filled = filled;
                    s0.fillLevel = fillLevel;
                }
                const ss = new StrokedShape(
                    lx.length>1? new Path(lx, drawn, filled, fillLevel): s0,
                    stroke
                );
                l.push(ss);
            }
            lx.length = 0; // clear the array
            pathClosed = false;
        }
  
        if (match) {
            if (!currentPoint) {
                throw new ParseError(
                    <>
                        No specification of a starting point detected in the following code: {' '}
                        <pre className='mt-6 w-[50rem] overflow-auto'><code>{s}</code></pre>
                    </>, 
                    true // for an extra-wide dialog
                );
            }
    
            stroke = new Stroke(lw, dashArray);
            const shapeString = s.slice(match.index + match[1].length);
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
                        const filled = shapeMatch[1]?.length>0;
                        shape = new Circle(
                            currentPoint,
                            decodeFloat(shapeMatch[2]),
                            filled,
                            filled? decodeFloat(shapeMatch[1]): 1
                        );
                        break;
                    }
                default: {
                        console.warn(`Missed shape command "${match[2]}"`);
                    }
            }
    
            if (shape) {
                if (shape.isIndependent) {
                    l.push(new StrokedShape(shape, stroke));
                } else {
                    lx.push(shape);
                }
            }
            if (newPoint) {
                currentPoint = new Point2D(newPoint.x, newPoint.y);
            }
        }
        
        // Move to the next match
        match = shapeFinder.exec(s);
    }

    return l;
}

const getTexts = (s: string): Text[] => {
    const list: Text[] = [];
    let match: RegExpExecArray | null;
    while (match = textPattern.exec(s)) {
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
            const max = 20;
            throw new ParseError(<span>Number expected, read <code>{s.length>max? s.slice(0, max-3)+'...': s}</code>.</span>);
        }
        return round(result, ROUNDING_DIGITS);
    }
}


export const start = '\\begin{texdraw}';

export const end = '\\end{texdraw}';

export const dimCmd = '\\drawdim pt \\setunitscale';

export const linewidth = (lw: number) => `\\linewd ${encodeFloat(lw)}`;

export const move = (x: number, y: number) => `\\move(${encodeFloat(x)} ${encodeFloat(y)})`;

export const linePattern = (dash: number[]): string => `\\lpatt (${dash.join(' ')})`;

export const line = (x: number, y: number) => `\\lvec(${encodeFloat(x)} ${encodeFloat(y)})`;

export const ifill = (f: number) => `\\ifill f:${encodeFloat(1-f)}`;

export const lfill = (f: number) => `\\lfill f:${encodeFloat(1-f)}`;

export const circ = (r: number) => `\\lcir r:${encodeFloat(r)}`;

export const fcirc = (r: number, f: number) => `\\fcir f:${encodeFloat(1-f)} r:${encodeFloat(r)}`;

export const textref = (horizontal: Position, vertical: Position) => `\\textref h:${horizontal} v:${vertical}`;

export const movePoint = (s: string) => {
    const match = s.match(movePattern1);
    return match? new Point2D(decodeFloat(match[1]), decodeFloat(match[2])): null;
}


