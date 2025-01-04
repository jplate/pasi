
/****************************************************************************
 * ROUNDING AND NORMALIZING
 ****************************************************************************/

/**
 * For n = 0,...,digits, rounds to nearest (10^n)th if the difference to that value is less than 10^-(n+5). Used for avoiding the compounding of slight rounding errors.
 */
export const round = (num: number, digits: number): number => { 
    for (let n = 0; n <= digits; n++) {
        const factor = 10 ** n;
        const e = 10 ** -(n + 5);
        const rounded = Math.round(num*factor) / factor;
        if (Math.abs(rounded-num) < e) return rounded;
    }
    return num;
}

const modulo = (value: number, base: number) => { // a modulo function that works also for negative numbers
    return (value % base + base) % base;
}

/** 
 * Normalizes a 'raw' value (first argument) relative to a cyclic scale with the supplied minimum and base. Also rounds the result.
 */
export const getCyclicValue = (raw: number, min: number, base: number, roundingFactor: number): number => {
    const v1 = modulo(raw - min, base);
    const v2 = (v1==0? base: v1) + min; // jump back to min only *after* reaching min+base.
    return Math.round(v2 * roundingFactor) / roundingFactor;
}


/****************************************************************************
 * OPERATIONS ON GEOMETRIC POINTS
 ****************************************************************************/

/**
 * Rotates a point around another point by a given angle.
 * @returns The new coordinates {x, y} of the rotated point.
 */
export const rotatePoint = (px: number, py: number, cx: number, cy: number, angle: number, roundingDigits: number): { x: number, y: number } => {
    // Convert angle from degrees to radians
    const radians: number = angle * Math.PI / 180;

    // Translate point to origin
    const translatedX: number = px - cx;
    const translatedY: number = py - cy;

    // Rotate point, and apply rounding to get rid of tiny rounding errors that would otherwise accumulate:
    const rotatedX: number = round(translatedX * Math.cos(radians) - translatedY * Math.sin(radians), roundingDigits);
    const rotatedY: number = round(translatedX * Math.sin(radians) + translatedY * Math.cos(radians), roundingDigits);

    // Translate point back
    const finalX: number = rotatedX + cx;
    const finalY: number = rotatedY + cy;

    return { x: finalX, y: finalY };
}

/**
 * Scales a point around a specified origin by a given scale factor.
 * @returns The new coordinates {x, y} of the scaled point.
 */
export const scalePoint = (px: number, py: number, ox: number, oy: number, scaleFactor: number): { x: number, y: number } => {
    // Translate point to the origin
    const translatedX = px - ox;
    const translatedY = py - oy;

    // Scale the point
    const scaledX = translatedX * scaleFactor;
    const scaledY = translatedY * scaleFactor;

    // Translate point back
    const finalX = scaledX + ox;
    const finalY = scaledY + oy;

    return { x: finalX, y: finalY };
}


/****************************************************************************
 * STRING ENCODING AND DECODING
 ****************************************************************************/

export const toBase64 = (bools: boolean[]): string => {
    const byteArray = new Uint8Array(Math.ceil(bools.length / 8));

    for (let i = 0; i < bools.length; i++) {
        const byteIndex = Math.floor(i / 8);
        byteArray[byteIndex] <<= 1;
        if (bools[i]) {
            byteArray[byteIndex] |= 1;
        }
    }

    // Shift remaining bits in the last byte
    const remainingBits = bools.length % 8;
    if (remainingBits !== 0) {
        byteArray[byteArray.length - 1] <<= (8 - remainingBits);
    }

    return Buffer.from(byteArray).toString('base64');
}

export const fromBase64 = (base64Str: string): boolean[] => {
    const byteArray = Buffer.from(base64Str, 'base64');
    const bools: boolean[] = [];

    for (let byte of byteArray) {
        for (let i = 7; i >= 0; i--) {
            bools.push((byte & (1 << i)) !== 0);
        }
    }

    return bools.slice(0, bools.length - (8 - (base64Str.length * 6 % 8)) % 8);
}


/****************************************************************************
 * CUBIC CURVES
 ****************************************************************************/

export type CubicCurve = {
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
}

/**
 * @return the point of the cubic curve defined by the specified points that corresponds to the parameter t.  
 */
export const cubicBezier = (c: CubicCurve, t: number) => {
    const b0 = bernsteinCoeff(3, 0, t);
    const b0a = bernsteinCoeff(3, 1, t);
    const b1 = bernsteinCoeff(3, 3, t);
    const b1a = bernsteinCoeff(3, 2, t);
    
    return {x: b0 * c.x0 + b0a * c.x1 + b1 * c.x3 + b1a * c.x2, 
            y: b0 * c.y0 + b0a * c.y1 + b1 * c.y3 + b1a * c.y2 };
}

const bernsteinCoeff = (n: number, m: number, t: number) => {
    return over(n, m) * (t ** m) * ((1 - t) ** (n - m));
}

export const over = (n: number, m: number) => {
    return factorial(n) / (factorial(n - m) * factorial(m));
}

export const factorial = (n: number): number => {
    return n==0? 1: n*factorial(n-1);
}

/**
 * Calculates (iteratively) the length of the supplied CubicCurve.
 */
export const bezierLength = ({ x0, y0, x1, y1, x2, y2, x3, y3 }: CubicCurve, steps: number = 100): number => {    

    let length = 0;
    let prevX = x0;
    let prevY = y0;

    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const { x, y } = cubicBezier({ x0, y0, x1, y1, x2, y2, x3, y3 }, t);

        const dx = x - prevX;
        const dy = y - prevY;

        length += Math.sqrt(dx * dx + dy * dy);

        prevX = x;
        prevY = y;
    }

    return length;
}

/**
 * @returns the approximate value of t at which the specified CubicCurve has reached the specified length.
 */
export const tAtLength = (
    { x0, y0, x1, y1, x2, y2, x3, y3 }: CubicCurve,
    targetLength: number,
    steps: number = 1000
): number => {

    let accumulatedLength = 0;
    let prevX = x0;
    let prevY = y0;

    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const { x, y } = cubicBezier({ x0, y0, x1, y1, x2, y2, x3, y3 }, t);

        const dx = x - prevX;
        const dy = y - prevY;

        accumulatedLength += Math.sqrt(dx * dx + dy * dy);

        if (accumulatedLength >= targetLength) {
            return t;
        }

        prevX = x;
        prevY = y;
    }

    // In case of floating-point inaccuracies, return the endpoint
    return 1;
}

/**
 * @returns the angle in degrees (relative to the positive X-axis) of the tangent vector of the specified CubicCurve at the specified t-value.
 */
export const bezierAngle = (
    { x0, y0, x1, y1, x2, y2, x3, y3 }: CubicCurve,
    t: number
): number => {

    // Derivatives of the cubic Bézier curve with respect to t
    const dx = 3 * (1 - t) * (1 - t) * (x1 - x0) +
               6 * (1 - t) * t * (x2 - x1) +
               3 * t * t * (x3 - x2);

    const dy = 3 * (1 - t) * (1 - t) * (y1 - y0) +
               6 * (1 - t) * t * (y2 - y1) +
               3 * t * t * (y3 - y2);


    const angleRadians = Math.atan2(dy, dx);

    return angleRadians * (180 / Math.PI);
}


/****************************************************************************
 * OPERATIONS ON ANGLES
 ****************************************************************************/

/**
 * Returns the counterclockwise-measured angle of the vector connecting (x0, y0) and (x1, y1).
 */
export const angle = (x1: number, y1: number, x2: number, y2: number, inRadians: boolean = false): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const radians = Math.atan2(dy, dx);
    return inRadians? radians: radians * (180 / Math.PI);
}

/**
 * Normalize the specified angle with respect to a reference angle alpha. The returned angle will lie between alpha-PI and alpha+PI.
 * @param angle
 * @param alpha
 * @return
 */
export const normalize = (angle: number, alpha: number) => {
    return angle>=alpha+Math.PI? angle - 2*Math.PI*(1 + Math.floor((angle - alpha - Math.PI)/2/Math.PI)): 
           angle<alpha-Math.PI? angle + 2*Math.PI*(1 + Math.floor((alpha - Math.PI - angle)/2/Math.PI)): 
           angle;
}

/*
 * Returns the difference between a and b, in positive direction. Ranges over [0..2*Math.PI[
 */
export const angleDiff = (a: number, b: number) => {
    const epsilon = 1e-8;
    let d = normalize(b, a + Math.PI) - a;
    if(Math.abs(d - 2*Math.PI) < epsilon) {
        d = 0;
    }
    return d;
}
