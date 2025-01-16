/****************************************************************************
 * ROUNDING AND NORMALIZING
 ****************************************************************************/

export const DEFAULT_TOLERANCE = 5; // used in round() to catch arithmetic inaccuracies.

/**
 * For n = 0,...,digits, rounds to nearest (10^n)th if the difference to that value is less than 10^-(n + tolerance).
 * Used for avoiding the compounding of slight rounding errors, as well as for suppressing tiny arithmetical errors common in JS.
 */
export const round = (num: number, digits: number, tolerance = DEFAULT_TOLERANCE): number => {
    for (let n = 0; n <= digits; n++) {
        const factor = 10 ** n;
        const e = 10 ** -(n + tolerance);
        const rounded = Math.round(num * factor) / factor;
        if (Math.abs(rounded - num) < e) return rounded;
    }
    return num;
};

const modulo = (value: number, base: number) => {
    // a modulo function that works also for negative numbers
    return ((value % base) + base) % base;
};

/**
 * Normalizes a 'raw' value (first argument) relative to a cyclic scale with the supplied minimum and base. Also rounds the result.
 */
export const getCyclicValue = (raw: number, min: number, base: number, roundingFactor: number): number => {
    const v1 = modulo(raw - min, base);
    const v2 = (v1 == 0 ? base : v1) + min; // jump back to min only *after* reaching min+base.
    return Math.round(v2 * roundingFactor) / roundingFactor;
};

/****************************************************************************
 * OPERATIONS ON GEOMETRIC POINTS
 ****************************************************************************/

/**
 * Rotates a point around another point by a given angle.
 * @returns The new coordinates {x, y} of the rotated point.
 */
export const rotatePoint = (
    px: number,
    py: number,
    cx: number,
    cy: number,
    angle: number,
    roundingDigits: number
): { x: number; y: number } => {
    // Convert angle from degrees to radians
    const radians: number = (angle * Math.PI) / 180;

    // Translate point to origin
    const translatedX: number = px - cx;
    const translatedY: number = py - cy;

    // Rotate point, and apply rounding to get rid of tiny rounding errors that would otherwise accumulate:
    const rotatedX: number = round(
        translatedX * Math.cos(radians) - translatedY * Math.sin(radians),
        roundingDigits
    );
    const rotatedY: number = round(
        translatedX * Math.sin(radians) + translatedY * Math.cos(radians),
        roundingDigits
    );

    // Translate point back
    const finalX: number = rotatedX + cx;
    const finalY: number = rotatedY + cy;

    return { x: finalX, y: finalY };
};

/**
 * Scales a point around a specified origin by a given scale factor.
 * @returns The new coordinates {x, y} of the scaled point.
 */
export const scalePoint = (
    px: number,
    py: number,
    ox: number,
    oy: number,
    scaleFactor: number
): { x: number; y: number } => {
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
};

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
        byteArray[byteArray.length - 1] <<= 8 - remainingBits;
    }

    return Buffer.from(byteArray).toString('base64');
};

export const fromBase64 = (base64Str: string): boolean[] => {
    const byteArray = Buffer.from(base64Str, 'base64');
    const bools: boolean[] = [];

    for (const byte of byteArray) {
        for (let i = 7; i >= 0; i--) {
            bools.push((byte & (1 << i)) !== 0);
        }
    }

    return bools.slice(0, bools.length - ((8 - ((base64Str.length * 6) % 8)) % 8));
};

/****************************************************************************
 * LINES AND CURVES
 ****************************************************************************/

export type Shape = Line | CubicCurve;

export type Line = {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
};

export type CubicCurve = {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    x3: number;
    y3: number;
};

/**
 * Returns the bounds of the supplied array of Shapes.
 */
export const getBounds = (shapes: Shape[]): { minX: number; maxX: number; minY: number; maxY: number } => {
    const n = shapes.length;
    let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
    for (let i = 0; i < n; i++) {
        const sh = shapes[i];
        let mx, mX, my, mY;
        if ('x3' in sh) {
            mx = Math.min(sh.x0, sh.x1, sh.x2, sh.x3);
            mX = Math.max(sh.x0, sh.x1, sh.x2, sh.x3);
            my = Math.min(sh.y0, sh.y1, sh.y2, sh.y3);
            mY = Math.max(sh.y0, sh.y1, sh.y2, sh.y3);
        } else {
            mx = Math.min(sh.x0, sh.x1);
            mX = Math.max(sh.x0, sh.x1);
            my = Math.min(sh.y0, sh.y1);
            mY = Math.max(sh.y0, sh.y1);
        }
        if (mx < minX) minX = mx;
        if (mX > maxX) maxX = mX;
        if (my < minY) minY = my;
        if (mY > maxY) maxY = mY;
    }
    /* // Uncomment for debugging
    if (isNaN(minX) || isNaN(maxX) || isNaN(minY) || isNaN(maxY)) {
        shapes.forEach((sh, i) => {
            if('x3' in sh) {
                console.log(`${i} (${sh.x0} ${sh.y0}) (${sh.x1}, ${sh.y1}) (${sh.x2}, ${sh.y2}) (${sh.x3}, ${sh.y3})`);
            }
            else {
                console.log(`${i} (${sh.x0}, ${sh.y0}) (${sh.x1}, ${sh.y1})`);
            }
        });
    }
    */
    return { minX, maxX, minY, maxY };
};

/**
 * Returns the SVG path corresponding to the supplied array of Shapes, with coordinates transformed according to the supplied functions.
 */
export const getPath = (shapes: Shape[], transX: (x: number) => number, transY: (y: number) => number) => {
    const n = shapes.length;
    const path: string[] = new Array(n).fill('');
    for (let i = 0; i < n; i++) {
        const sh = shapes[i];
        if ('x3' in sh) {
            path[i] =
                `M ${transX(sh.x0)} ${transY(sh.y0)} C ${transX(sh.x1)} ${transY(sh.y1)}, ${transX(sh.x2)} ${transY(sh.y2)}, ${transX(sh.x3)} ${transY(sh.y3)}`;
        } else {
            path[i] = `M ${transX(sh.x0)} ${transY(sh.y0)} L ${transX(sh.x1)} ${transY(sh.y1)}`;
        }
    }
    return path.join(' ');
};

/**
 * @return the point of the cubic curve defined by the specified points that corresponds to the parameter t.
 */
export const cubicBezier = (c: CubicCurve, t: number) => {
    const b0 = bernsteinCoeff(3, 0, t);
    const b0a = bernsteinCoeff(3, 1, t);
    const b1 = bernsteinCoeff(3, 3, t);
    const b1a = bernsteinCoeff(3, 2, t);

    return [b0 * c.x0 + b0a * c.x1 + b1 * c.x3 + b1a * c.x2, b0 * c.y0 + b0a * c.y1 + b1 * c.y3 + b1a * c.y2];
};

const bernsteinCoeff = (n: number, m: number, t: number) => {
    return over(n, m) * t ** m * (1 - t) ** (n - m);
};

export const over = (n: number, m: number) => {
    return factorial(n) / (factorial(n - m) * factorial(m));
};

export const factorial = (n: number): number => {
    return n == 0 ? 1 : n * factorial(n - 1);
};

/**
 * Calculates (iteratively) the length of the supplied CubicCurve.
 */
export const bezierLength = ({ x0, y0, x1, y1, x2, y2, x3, y3 }: CubicCurve, steps: number = 100): number => {
    let length = 0;
    let prevX = x0;
    let prevY = y0;

    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const [x, y] = cubicBezier({ x0, y0, x1, y1, x2, y2, x3, y3 }, t);

        const dx = x - prevX;
        const dy = y - prevY;

        length += Math.sqrt(dx * dx + dy * dy);

        prevX = x;
        prevY = y;
    }

    return length;
};

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
        const [x, y] = cubicBezier({ x0, y0, x1, y1, x2, y2, x3, y3 }, t);

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
};

/**
 * @returns the angle in degrees (relative to the positive X-axis) of the tangent vector of the specified CubicCurve at the specified t-value.
 */
export const bezierAngle = ({ x0, y0, x1, y1, x2, y2, x3, y3 }: CubicCurve, t: number): number => {
    // Derivatives of the cubic Bézier curve with respect to t
    const dx = 3 * (1 - t) * (1 - t) * (x1 - x0) + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (x3 - x2);

    const dy = 3 * (1 - t) * (1 - t) * (y1 - y0) + 6 * (1 - t) * t * (y2 - y1) + 3 * t * t * (y3 - y2);

    const angleRadians = Math.atan2(dy, dx);

    return angleRadians * (180 / Math.PI);
};

/**
 * Performs a simple search to get the point on the curve c that lies closest to the supplied reference point.
 * @param x X coordinate of the reference point
 * @param y Y coordinate of the reference point
 * @param t0 start of the search interval
 * @param t1 end of the search interval
 * @param d0 distance of the point at t0 from the reference point
 * @param d1 distance of the point at t1 from the reference point
 * @param j number of iterations
 */
const findClosest = (
    x: number,
    y: number,
    c: CubicCurve,
    t0: number,
    d0: number,
    t1: number,
    d1: number,
    j: number
): number => {
    if (d0 > d1) {
        // If the curve is closer to the reference point at the end of the search interval, we'll start from there.
        [t0, t1] = [t1, t0];
        [d0, d1] = [d1, d0];
    }
    const div = 20;
    const dmin = 0.4;
    const incr = (t1 - t0) / div;
    let firstT = t0;
    let firstD = d0;
    let secondT = t0;
    let secondD = d0;
    let prevD = d0;
    let prevT = d0;
    for (let i = 1; i < div; i++) {
        const t = t0 + i * incr;
        const [bx, by] = cubicBezier(c, t);
        const d = Math.sqrt((x - bx) ** 2 + (y - by) ** 2);
        if (d < firstD) {
            firstD = d;
            firstT = t;
            secondD = prevD;
            secondT = prevT;
        } else if (d < secondD) {
            secondD = d;
            secondT = t;
        }
        prevD = d;
        prevT = t;
    }

    if (firstD <= dmin || j <= 0 || firstT === secondT) {
        return firstT;
    } else {
        return findClosest(x, y, c, firstT, firstD, secondT, secondD, j - 1);
    }
};

/**
 * @return the approximately closest point to (x,y) on the curve c between the t-values t0 and t1 (both should be between 0 and 1)
 */
export const closestTo = (x: number, y: number, c: CubicCurve, t0: number, t1: number): number => {
    const [x0, y0] = cubicBezier(c, t0);
    const [x1, y1] = cubicBezier(c, t1);
    const d0 = Math.sqrt((x0 - x) ** 2 + (y0 - y) ** 2);
    const d1 = Math.sqrt((x1 - x) ** 2 + (y1 - y) ** 2);
    return findClosest(x, y, c, t0, d0, t1, d1, 8);
};

/**
 * @param u initially contains the starting position (as a t-value), will contain the end position
 * @param distance the desired distance (i.e., path-length) from the start position
 * @param c the curve to be travelled
 * @param dt the step size
 * @param closeEnough the difference between the distance traveled and the desired distance that is considered 'close enough'
 * @return the point at the end position
 */
export const travelFor = (
    u: number[],
    distance: number,
    c: CubicCurve,
    dt: number,
    closeEnough: number
): [x: number, y: number] => {
    const t0 = u[0];
    let t = t0;
    let [x0, y0] = cubicBezier(c, t0);
    let [x1, y1] = [x0, y0];
    let totalDistance = 0;
    let safetyFactor = 1.2;
    while (true) {
        let steps = 1;
        let d = 0;
        while (totalDistance < distance) {
            [x0, y0] = [x1, y1];

            t += steps * dt;

            [x1, y1] = cubicBezier(c, t);
            d = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);

            totalDistance += d;

            if (distance < totalDistance) {
                // adjust step multiplier
                steps = Math.floor(Math.min(1e6, Math.max(1, (distance - totalDistance) / d / safetyFactor)));
            }

            // console.log(`steps: ${steps}  totD: ${totalDistance}`);
        }
        if (Math.abs(distance - totalDistance) < closeEnough) break;
        // Otherwise we overshot. So we revert back to the previous values, provided that the reason for overshooting lies in
        // our having taken too many steps at once. While reverting, we also increase the safetyFactor.
        else if (steps > 1) {
            t -= dt;
            totalDistance -= d;
            [x1, y1] = [x0, x0];
            safetyFactor += 0.1;
        } else break;
    }
    u[0] = t;
    return [x1, y1];
};

/**
 * @param u initially contains the starting position, will contain the end position
 * @param distance desired path-length from start to end position
 * @param c the curve to be travelled
 * @param dt the step size
 * @param closeEnough the tolerance for distance matching
 * @return the point at the end position
 */
export const travel = (u: number[], distance: number, c: CubicCurve, dt: number, closeEnough: number) => {
    return travelFor(u, distance, c, dt, closeEnough);
};

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
    return inRadians ? radians : radians * (180 / Math.PI);
};

/**
 * Normalize the specified angle with respect to a reference angle alpha. The returned angle will lie between alpha-PI and alpha+PI.
 * @param angle
 * @param alpha
 * @return
 */
export const normalize = (angle: number, alpha: number) => {
    return angle >= alpha + Math.PI
        ? angle - 2 * Math.PI * (1 + Math.floor((angle - alpha - Math.PI) / 2 / Math.PI))
        : angle < alpha - Math.PI
          ? angle + 2 * Math.PI * (1 + Math.floor((alpha - Math.PI - angle) / 2 / Math.PI))
          : angle;
};

/*
 * Returns the difference between a and b, in positive direction. Ranges over [0..2*Math.PI[
 */
export const angleDiff = (a: number, b: number) => {
    const epsilon = 1e-8;
    let d = normalize(b, a + Math.PI) - a;
    if (Math.abs(d - 2 * Math.PI) < epsilon) {
        d = 0;
    }
    return d;
};
