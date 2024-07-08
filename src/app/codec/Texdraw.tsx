import { round } from '../util/MathTools'
const ROUNDING_DIGITS = 3;
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

export const linewidth = (lw: number) => `\\linewd ${encodeFloat(lw)} `;

export const move = (x: number, y: number) => `\\move(${encodeFloat(x)} ${encodeFloat(y)}) `;

export const linePattern = (dash: number[]): string => `\\lpatt (${dash.join(' ')}) `;

export const line = (x: number, y: number) => `\\lvec(${encodeFloat(x)} ${encodeFloat(y)}) `;

export const ifill = (f: number) => `\\ifill f:${encodeFloat(1-f)} `;

export const lfill = (f: number) => `\\lfill f:${encodeFloat(1-f)} `;

export const circ = (r: number) => `\\lcir r:${encodeFloat(r)} `;

export const fcirc = (r: number, f: number) => `\\fcir f:${encodeFloat(1-f)} r:${encodeFloat(r)} `;