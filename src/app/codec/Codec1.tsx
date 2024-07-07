import ENode from '../components/client/ENode'
import NodeGroup from '../components/client/NodeGroup'
import Group, { StandardGroup, getGroups } from '../components/client/Group'

const CODE = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!+#/{@}$%ì&*úùéè=<>ÈäöüÉ|Í~áà¡¢£¤¥¦§ß©';
const ENCODE_BASE = CODE.length;
const ENCODE_PRECISION = 10;


const encodeInt = (num: number) => {
    if (num === 0) return CODE[0];
    let result = '';
    while (num > 0) {
        result = CODE[num % ENCODE_BASE] + result;
        num = Math.floor(num / ENCODE_BASE);
    }
    return result;
}

const decodeInt = (str: string) => {
    let result = 0;
    for (let i = 0; i < str.length; i++) {
        const inc = CODE.indexOf(str[i]);
        if (inc<0) return NaN;
        result = result * ENCODE_BASE + inc;
    }
    return result;
}

/**
 * Returns a string that encodes the supplied argument in base 100.
 */
const encode = (val: number) => {
    if (isNaN(val)) return '?';
    else if (val===-Infinity) return '_';
    else if (val===Infinity) return '^';
    else {
        const isNegative = val<0;
        const abs = Math.abs(val);
        const integerPart = Math.floor(abs);
        const fractionalPart = abs - integerPart;
    
        const integerString = encodeInt(integerPart);
        let fractionalString = '';
    
        let fraction = fractionalPart;
        while (fraction > 0) {
            fraction *= ENCODE_BASE;
            const digit = Math.floor(fraction);
            fractionalString += encodeInt(digit);
            fraction -= digit;
    
            // Limit the length of the fractional part to avoid infinite loops
            if (fractionalString.length > ENCODE_PRECISION) break;
        }
    
        return `${isNegative? '-': ''}${fractionalString ? `${integerString}.${fractionalString}` : integerString}`;
    }
}

/**
 * Returns the number represented by the supplied string. This may be NaN. NaN is also returned if the string contains a syntax error.
 */
const decode = (s: string) => {
    if (s==='?') return NaN;
    else if (s==='_') return -Infinity;
    else if (s==='^') return Infinity;
    else {
        const isNegative = s.startsWith('-');
        const abs = isNegative? s.slice(1): s;
        const fpPos = s.indexOf('.');
        const integerPart = fpPos>=0? abs.slice(0, fpPos): s;
        const fractionalPart = fpPos>=0? abs.slice(fpPos+1): '';
        let val = decodeInt(integerPart);
        for (let i = 0, k = 1/ENCODE_BASE; i<fractionalPart.length; i++, k/=ENCODE_BASE) {
            const digit = CODE.indexOf(fractionalPart[i]);
            if (digit<0) return NaN;
            val += digit * k;
        }
        return (isNegative? -1: 1) * val;
    }
}


export const getCode = (list: (ENode | NodeGroup)[], pixel: number): string => {
    const arr = ['\\begin{texdraw}%pasiCodecV1'];

    // We start by constructing the 'preamble', which mainly contains information as to what groups contain which other groups.
    
    const gMap = new Map<Group<any>, string>(); // maps groups (except for NodeGroups, which are unnamed) to their names
    let groupCounter = 0;
    for (const it of list) {
        const groups = getGroups(it)[0];
        for (const g of groups) {
            if (gMap.has(g)) break;
            gMap.set(g, encode(groupCounter++));
        }
    }

    const groupInfo = [...gMap.entries()].reduce(
        (acc: string[], [g, name]) => {
            const list = g.members.reduce(
                (acc: string[], m) => m instanceof StandardGroup? [...acc, gMap.get(m)]: acc, 
                []
            );
            return list.length>0? [...acc, `${name}:${list.join(',')}`]: acc; 
        }, []
    ).join(';');

    arr.push(`\\drawdim pt \\setunitscale ${pixel} ${groupInfo}`);

    // Next, we construct the main part of the code.

    const eMap = new Map<ENode, string>(); // maps enodes to their names (cnode groups don't need names)
    let enodeCounter = 0;
    for (const it of list) {
        if (it instanceof ENode) {
            eMap.set(it, encode(enodeCounter++));
            arr.push(it.getTexdrawCode());
        }
    }

    arr.push('\\end{texdraw}');
    return arr.join('\n');
}
