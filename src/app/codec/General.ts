import { round } from '../util/MathTools';

const CODE = '0123456789=#$&*+/<>!?@^_`|~abcdefghijklmnoóòöpqrstuúùüvwxyýzAÁÀÄBCDEÉÈFGHIÍÌJKLMNOÓÒÖPQRSTUÚÙÜVWXYÝZ';
export const ENCODE_BASE = CODE.length;
export const ENCODE_PRECISION = 2; // The number of digits -- in base 100 -- to which we're rounding numbers when encoding them.
const ROUNDING_DIGITS = 4; // The number of digits (in base 10) that we're using for the purposes of Math.round()

export const encodeInt = (num: number) => {
    if (num === 0) return CODE[0];
    let result = '';
    while (num > 0) {
        result = CODE[num % ENCODE_BASE] + result;
        num = Math.floor(round(num / ENCODE_BASE, ROUNDING_DIGITS));
    }
    return result;
};

export const decodeInt = (str: string) => {
    if (str === '') return NaN;
    let result = 0;
    for (let i = 0; i < str.length; i++) {
        const inc = CODE.indexOf(str[i]);
        if (inc < 0) return NaN;
        result = result * ENCODE_BASE + inc;
    }
    return result;
};

/**
 * Returns a string that encodes the supplied argument in base 100. The format is: integer part (if non-zero), plus '-' or '.', plus fractional part
 * (if applicable). The minus sign appears whenever the number is negative, the dot only if the number is positive and there's a fractional part.
 */
export const encode = (val: number) => {
    if (isNaN(val)) return 'î';
    else
        switch (val) {
            case -Infinity:
                return 'â';
            case Infinity:
                return 'ô';
            default: {
                const isNegative = val < 0;
                const abs = Math.abs(val);
                const integerPart = Math.floor(abs);
                const fractionalPart = abs - integerPart;

                const integerString = integerPart === 0 && fractionalPart !== 0 ? '' : encodeInt(integerPart);
                let fractionalString = '';

                let fraction = fractionalPart;
                for (let i = 0; i < ENCODE_PRECISION; i++) {
                    fraction *= ENCODE_BASE;
                    const digit = Math.floor(round(fraction, 0));
                    fractionalString += encodeInt(digit);
                    fraction = round(fraction - digit, 2 * (ENCODE_PRECISION - i));

                    if (fraction === 0) break;
                }

                return `${integerString}${isNegative ? '-' : fractionalPart ? '.' : ''}${fractionalPart ? fractionalString : ''}`;
            }
        }
};

/**
 * Returns the number represented by the supplied string. This may be NaN. NaN is also returned if the string contains a syntax error.
 */
export const decode = (s: string) => {
    switch (s) {
        case '':
        case 'î':
            return NaN;
        case 'â':
            return -Infinity;
        case 'ô':
            return Infinity;
        default: {
            const isNegative = s.includes('-');
            const fpPos = s.search(/[.-]/);
            const integerPart = fpPos >= 0 ? s.slice(0, fpPos) : s;
            const fractionalPart = fpPos >= 0 ? s.slice(fpPos + 1) : '';
            let val = integerPart === '' ? 0 : decodeInt(integerPart);
            for (let i = 0, k = ENCODE_BASE; i < fractionalPart.length; i++, k *= ENCODE_BASE) {
                const digit = CODE.indexOf(fractionalPart[i]);
                if (digit < 0) return NaN;
                val += round(digit / k, ROUNDING_DIGITS);
            }
            return (isNegative ? -1 : 1) * val;
        }
    }
};
