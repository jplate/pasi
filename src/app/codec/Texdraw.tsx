import { round } from '../util/MathTools'
const ROUNDING_DIGITS = 5;
const PRECISION = 10**ROUNDING_DIGITS; 

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

export const linewidth = (lw: number) => `\\linewd ${lw} `;

export const move = (x: number, y: number) => `\\move(${x} ${y}) `;

export const linePattern = (dash: number[]): string => `\\lpatt (${dash.join(' ')}) `;

export const line = (x: number, y: number) => `\\lvec(${x} ${y}) `;

export const ifill = (f: number) => `\\ifill f:${1-f} `;

export const lfill = (f: number) => `\\lfill f:${1-f} `;

export const circ = (r: number) => `\\lcir r:${r} `;

export const fcirc = (r: number, f: number) => `\\fcir f:${1-f} r:${r} `;