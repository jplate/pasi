import ENode from '../components/client/ENode'
import NodeGroup from '../components/client/NodeGroup'
import Group, { StandardGroup, getGroups } from '../components/client/Group'
import * as Texdraw from './Texdraw'


export const versionString = 'pasiCodecV1';

const CODE = '0123456789aáàäâbcdeéèêfghiíìîjklmnoóòöôpqrstuúùüûvwxyýzAÁÀÄÂBCDEÉÈÊFGHIÍÌÎJKLMNOÓÒÖÔPQRSTUÚÙÜÛVWXYÝZ';
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
    if (str==='') return NaN;
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
    if (s==='' || s==='?') return NaN;
    else if (s==='_') return -Infinity;
    else if (s==='^') return Infinity;
    else {
        const isNegative = s.startsWith('-');
        const abs = isNegative? s.slice(1): s;
        const fpPos = s.indexOf('.');
        const integerPart = fpPos>=0? abs.slice(0, fpPos): s;
        const fractionalPart = fpPos>=0? abs.slice(fpPos+1): '';
        let val = integerPart===''? 0: decodeInt(integerPart);
        for (let i = 0, k = ENCODE_BASE; i<fractionalPart.length; i++, k*=ENCODE_BASE) {
            const digit = CODE.indexOf(fractionalPart[i]);
            if (digit<0) return NaN;
            val += digit / k;
        }
        return (isNegative? -1: 1) * val;
    }
}

export const getCode = (list: (ENode | NodeGroup)[], pixel: number): string => {
    const arr = [`${Texdraw.start}%${versionString}`];

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
                (acc: string[], m) => m instanceof StandardGroup? [...acc, `${m.isActiveMember? ':': '.'}${gMap.get(m)}`]: acc, 
                []
            );
            return list.length>0? [...acc, `${name}${list.join('')}`]: acc; 
        }, []
    ).join(' ');

    arr.push(`${Texdraw.dimCmd} ${pixel}${groupInfo.length>0? ` %${groupInfo}`: ''}`);

    // Next, we construct the main part of the code.

    const eMap = new Map<ENode, string>(); // maps enodes to their names (cnode groups don't need names)
    let enodeCounter = 0;
    for (const it of list) {
        if (it instanceof ENode) {
            eMap.set(it, encode(enodeCounter++));
        }
        const code = it.getTexdrawCode();
        arr.push(`${code}%${getHint(it, eMap, gMap)}`);
    }

    arr.push(Texdraw.end);
    return arr.join('\n');
}

const getHint = (item: ENode | NodeGroup, eMap: Map<ENode, string>, gMap: Map<Group<any>, string>) => {
    let result = '';
    const cc = getItemInfoString(item, false);
    
    if (item instanceof ENode) {
        result = `${eMap.get(item)}${cc}`;
    }
    if (item.group) {
        result += `${item.isActiveMember? ':': '.'}${gMap.get(item.group)}`;
    }
    return result;
}

const getItemInfoString = (item: ENode | NodeGroup, inCompoundArrow: boolean): string => {
    let result = '';
    const info = item.getInfoString();
    if (info.length>0) {
        result += `(${info})`;
    }
    return result;
}

class ParseError extends Error {
    constructor(
        public msg: React.ReactNode
    ) {super();}
}

/**
 * Tries to match the supplied string to the supplied pattern with the specified offset. Returns the matched group if the match succeeds and null otherwise.
 */
const extractString = (s: string, pattern: string, offset: number): string | null => {
    const re = new RegExp(`^.{${offset}}{pattern}`);
    const match = s.match(re);
    return match? match[1]: null;	    
}


const getGroupMap = (str: string) => {
    const map = new Map<string, Group<any>>();
    str.split(' ').forEach(s => {
        const sp = s.split(/[\.:]/); // The dot/colon distinction is used to indicate whether a group member's membership is active.
        let g: StandardGroup<ENode | Group<any>>;
        if (map.has(sp[0])) {
            g = map.get(sp[0]) as StandardGroup<ENode | Group<any>>;
        }
        else {
            g = new StandardGroup<ENode | Group<any>>([]);
            map.set(sp[0], g);
        }
        if (g) {
            if (g.members.length>0) {
                throw new ParseError(<span>Corrupt data: group&nbsp;<span className='font-mono'>{sp[0]}</span> is assigned members more than once.</span>);
            }
            const groups = getGroups(g)[0]; // the current list of g's groups. This will be used to prevent us from building a cyclic hierarchy due to corrupt data.
            const memberStrings = sp.slice(1);
            const members = memberStrings.map(ms => {
                let m: Group<any>;
                if (map.has(ms)) {
                    m = map.get(ms) as Group<any>;
                    if (m) {
                        if (m.group) {
                            throw new ParseError(<span>Corrupt data: group <span className='font-mono'>{ms}</span> is listed as a member of more than one group.</span>);
                        }
                        if (m===g || 
                            groups.some(gr => m===gr || (m instanceof StandardGroup && m.contains(gr)))
                        ) {
                            throw new ParseError(<span>Corrupt data: group <span className='font-mono'>{ms}</span> cannot be a direct or indirect member of itself.</span>);
                        }
                    }
                }
                else {
                    m = new StandardGroup<ENode | Group<any>>([]);
                    map.set(ms, m);
                }
                m.group = g;
                m.isActiveMember = s[s.indexOf(ms)-1]===':';
                return m;
            });
            g.members = members;
        }
    });
    return map;
}

const parseENode = (tex: string, hint: string, eMap: Map<string, ENode>, gMap: Map<string, Group<any>>, counter: number): boolean => {
    let info: string | null = null,
        activeMember: boolean = true;
    const i =  hint.indexOf('('); // the beginning of the info string, if present.
    if(i>=0) {
        info = extractString(hint, '\\((.*?)\\)', i);
    }
    let j = hint.indexOf(':', info? i + info.length + 1: 0);
    if (j<0) {
        activeMember = false;
        j = hint.indexOf('.', info? i + info.length + 1: 0);
    }
    const name = i<0 && j<0? hint: hint.substring(0, i<0? j: i);
    const groupName = j<0? null: hint.slice(j);

    if(isNaN(decode(name)) || (groupName && isNaN(decode(groupName)))) return false; // By returning false at this point, 
        // we give the 'load' function the chance to try to interpret the tex/hint pair as representing something other than an ENode. 
        // If an error occurs beyond this point, that error will result in a failure to parse the entire texdraw code.

    //console.log(` name: ${name}  groupName: ${groupName}  active: ${activeMember}  info: ${info}`);

    const node = new ENode(counter, 0, 0);
    if (groupName) {
        let g: StandardGroup<ENode | Group<any>>;
        if (gMap.has(groupName)) {
            g = gMap.get(groupName) as StandardGroup<ENode | Group<any>>;
        }
        else {
            g = new StandardGroup<ENode | Group<any>>([]);
            gMap.set(groupName, g);
        }
        g.members.push(node);
        node.group = g;
    }
    node.parse(tex, hint);

    eMap.set(name, node);

    return true;
}

export const load = (code: string, eCounter: number, ngCounter: number): [(ENode | NodeGroup)[], number, number, number] => {
    const list: (ENode | NodeGroup)[] = [];
    const lines = code.split(/[\r|\n]+/).filter(l => l.length>0);
    const n = lines.length;
    
    if (n<3) {
        throw new ParseError(`Expected at least three lines of texdraw code, got ${n===0? 'zero': n===1? 'one': 'two'}.`);
    }
    
    // first line
    const expectedStart = `${Texdraw.start}%${versionString}`;
    if (!lines[0].startsWith(expectedStart)) {
        throw new ParseError(<>Code should start with <span>&lsquo;<span className='font-mono'>{expectedStart}</span>&rsquo;.</span></>);
    }

    // second line
    const split1 = lines[1].split('%');
    if (!split1[0].startsWith(Texdraw.dimCmd)) {
        throw new ParseError(<>Second line should start with <span>&lsquo;<span className='font-mono'>{Texdraw.dimCmd}</span>&rsquo;.</span></>);
    }
    const pixel = Number.parseFloat(split1[0].split(/\s+/).slice(-1)[0]);
    if (isNaN(pixel)) {
        throw new ParseError(<span>Number format error in argument to <span className='font-mono'>\setunitscale</span>.</span>);
    }
    const gMap = split1.length>1? getGroupMap(split1[1]): new Map<string, Group<any>>();

    // We now have to parse the remaining lines, except for the last one, which should just be identical with Texdraw.end.
    const eMap = new Map<string, ENode>();
    let tex = '',
        cont = false; // Ths last variable indicates whether the current texdraw command has started on a previous line.
    for (let i = 2; i<lines.length-1; i++) {
        const line = lines[i];
        // This regular expression matches a percent sign (%) that is not preceded by an even number of backslashes (\). 
        // In other words, it matches an unescaped occurrence of '%'.
        const match = /((?:^|[^\\])(?:\\\\)*)%/.exec(line);
        const newTex = match? line.slice(0, match.index): line; 
        tex = cont? tex + newTex: newTex;
        if (match) {
            const hint = line.slice(match.index + match[0].length);
            cont = false;
            console.log(` t: ${tex} h: ${hint}  m: ${match[0].length}`);
            const success = parseENode(tex, hint, eMap, gMap, eCounter);
            if (!success) {
                throw new ParseError(<>Unable to parse the following code: <pre className='mt-6'><code className='prose'>{tex} %{hint}</code></pre></>);
            }
            eCounter++;
        } 
        else {
            cont = true;
        }
    }

    // last line
    if (lines[lines.length-1]!==Texdraw.end) {
        throw new ParseError(<span>The last line should read &lsquo;<span className='font-mono'>{Texdraw.end}</span>&rsquo;. Incomplete code?</span>);
    }

    return [list, pixel, eCounter, ngCounter];
}
