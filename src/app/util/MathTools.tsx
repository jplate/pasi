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

