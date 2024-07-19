import Item from '../components/client/Item'
import ENode from '../components/client/ENode'
import CNodeGroup from '../components/client/CNodeGroup'
import Group, { StandardGroup, getGroups } from '../components/client/Group'
import * as Texdraw from './Texdraw'
import { ParseError } from './Texdraw'
import { round } from '../util/MathTools'

export const versionString = 'pasiCodecV1';

const CODE = '0123456789aáàäâbcdeéèêfghiíìîjklmnoóòöôpqrstuúùüûvwxyýzAÁÀÄÂBCDEÉÈÊFGHIÍÌÎJKLMNOÓÒÖÔPQRSTUÚÙÜÛVWXYÝZ';
const ENCODE_BASE = CODE.length;
const ENCODE_PRECISION = 2; // The number of digits -- in base 100 -- to which we're rounding numbers when encoding them.
const MAX_NAME_LENGTH = 3; // Maximum length for names of nodes and groups (used in detecting corrupt data).
const ENODE_PREFIX = 'E';
const NODEGROUP_PREFIX = 'S'; // The 'S' stands for 'set', because that's what a contour is most naturally taken to represent.



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
 * Returns a string that encodes the supplied argument in base 100. The format is: integer part + ('-' or '.') + fractional part (if applicable). The 
 * minus sign appears whenever the number is negative, the dot only if the number is positive and there's a fractional part.
 */
export const encode = (val: number) => {
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
        for (let i = 0; i < ENCODE_PRECISION; i++) {
            fraction *= ENCODE_BASE;
            const digit = Math.floor(fraction);
            fractionalString += encodeInt(digit);
            fraction = round(fraction - digit, 2 * (ENCODE_PRECISION - i));
    
            if (fraction===0) break;
        }
    
        return `${integerString}${isNegative? '-': fractionalPart? '.': ''}${fractionalPart ? fractionalString: ''}`;
    }
}

/**
 * Returns the number represented by the supplied string. This may be NaN. NaN is also returned if the string contains a syntax error.
 */
export const decode = (s: string) => {
    if (s==='' || s==='?') return NaN;
    else if (s==='_') return -Infinity;
    else if (s==='^') return Infinity;
    else {
        const isNegative = s.includes('-');
        const fpPos = s.search(/[\.-]/);
        const integerPart = fpPos>=0? s.slice(0, fpPos): s;
        const fractionalPart = fpPos>=0? s.slice(fpPos+1): '';
        let val = integerPart===''? 0: decodeInt(integerPart);
        for (let i = 0, k = ENCODE_BASE; i<fractionalPart.length; i++, k*=ENCODE_BASE) {
            const digit = CODE.indexOf(fractionalPart[i]);
            if (digit<0) return NaN;
            val += digit / k;
        }
        return (isNegative? -1: 1) * val;
    }
}


export const getCode = (list: (ENode | CNodeGroup)[], pixel: number): string => {
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

    arr.push(`${Texdraw.dimCmd} ${pixel} ${groupInfo.length>0? `%${groupInfo}`: ''}`); 

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

const getHint = (item: ENode | CNodeGroup, eMap: Map<ENode, string>, gMap: Map<Group<any>, string>) => {
    let result = [];
    const info = item.getInfoString();
    
    if (item instanceof ENode) {
        result.push(`${ENODE_PREFIX}${eMap.get(item)}${info.length>0? `{${info}}`: ''}`);
    }
    else if (item instanceof CNodeGroup) {
        result.push(`${NODEGROUP_PREFIX}{${info}}`);
    }

    if (item.group) {
        result.push(`${item.isActiveMember? ':': '.'}${gMap.get(item.group)}`);
    }

    return result.join('');
}

const getGroupMap = (str: string) => {
    const map = new Map<string, Group<any>>();
    str.split(' ').forEach(s => {
        const sp = s.split(/[\.:]/); // The dot/colon distinction is used to indicate whether a group member's membership is active.
        if (sp.some(s => s.length > MAX_NAME_LENGTH || isNaN(decodeInt(s)))) {
            throw new ParseError(<span>Corrupt data: illegal group names in preamble.</span>);
        }
        // Now that all group names are guaranteed to be reasonably short, we won't have to bother with truncating them in our error messages.

        let g: StandardGroup<ENode | Group<any>>;
        if (map.has(sp[0])) {
            g = map.get(sp[0]) as StandardGroup<ENode | Group<any>>;
        }
        else {
            g = new StandardGroup<ENode | Group<any>>([]);
            map.set(sp[0], g);
        }
        if (g.members.length>0) {
            throw new ParseError(<span>Corrupt data: group <code>{sp[0]}</code> is assigned members more than once.</span>);
        }
        const groups = getGroups(g)[0]; // the current list of g's groups. This will be used to prevent us from building a cyclic hierarchy due to corrupt data.
        const memberStrings = sp.slice(1);
        const members = memberStrings.map(ms => {
            let m: Group<any>;
            if (map.has(ms)) {
                m = map.get(ms) as Group<any>;
                if (m) {
                    if (m.group) {
                        throw new ParseError(<span>Corrupt data: group <code>{ms}</code> is listed as a member more than once.</span>);
                    }
                    if (m===g || 
                        groups.some(gr => m===gr || (m instanceof StandardGroup && m.contains(gr)))
                    ) {
                        throw new ParseError(<span>Corrupt data: group <code>{ms}</code> cannot be a direct or indirect member of itself.</span>);
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
    });
    return map;
}

/**
 * Truncate the supplied string for use in short error messages.
 */
const truncate = (s: string) => {
    const max = 25;
    return `${s.length>max? s.slice(0, max-3)+'...': s}`;
}

/**
 * Tries to match the supplied string to the supplied pattern with the specified offset. Returns the matched group if the match succeeds and null otherwise.
 */
const extractString = (s: string, pattern: string, offset: number): string | null => {
    const match = s.match(`^.{${offset}}${pattern}`);
    return match? match[1]: null;
}

/**
 * This function analyzes the 'hint', returning an array that contains the relevant item's name, the name of its group, 
 * a boolean indicating whether it is an active member of that group, and an info string.
 */
const analyzeHint = (hint: string): [name: string | null, groupName: string | null, activeMember: boolean | undefined, info: string | null] => {
    let info: string | null = null,
        activeMember: boolean | undefined = undefined;
    const i =  hint.indexOf('{'); // the beginning of the info string, if present.
    if(i >= 0) {
        info = extractString(hint, '\\{(.*?)\\}', i);
        if (!info) { 
            throw new ParseError(<span>Ill-formed directive: <code>{truncate(hint)}</code>.</span>);
        }
    }
    let j = hint.indexOf(':', info? i + info.length + 1: 0);
    if (j >= 0) {
        activeMember = true;
    } 
    else {
        j = hint.indexOf('.', info? i + info.length + 1: 0);
        if (j >= 0) {
            activeMember = false;
        }
    }
    const name = i < 0 && j < 0? hint.slice(1): hint.slice(1, i<0? j: i);
    const groupName = j < 0? null: hint.slice(j+1);
    if (j+1===hint.length) { // In this case the hint ends with a '.' or ':', which makes no sense.
        throw new ParseError(<span>Ill-formed directive: <code>{truncate(hint)}</code>.</span>);
    }
    return [name.length===0? null: name, groupName, activeMember, info];
}

/** 
 * This function adds the supplied ENode or NodeGroup to the group with the specified name, which is obtained from gMap.
 */
const addToGroup = (item: ENode | CNodeGroup, groupName: string, activeMember: boolean, gMap: Map<string, Group<any>>) => {
    if (groupName) {
        let g: StandardGroup<Item | Group<any>>;
        if (gMap.has(groupName)) {
            g = gMap.get(groupName) as StandardGroup<Item | Group<any>>;
        }
        else {
            g = new StandardGroup<Item | Group<any>>([]);
            gMap.set(groupName, g);
        }
        g.members.push(item);
        item.group = g;
        item.isActiveMember = activeMember;
    }
}

const parseENode = (tex: string, hint: string, eMap: Map<string, [ENode, boolean]>, gMap: Map<string, Group<any>>, counter: number): ENode => {
    // The 'hint' for an ENode has the following format:
    // ['E' + name] or 
    // ['E' + name + ('.' or ':') + groupName] or 
    // ['E' + name + info] or 
    // ['E' + name + info + ('.' or ':') + groupName].
    const [name, groupName, activeMember, info] = analyzeHint(hint);

    //console.log(` name: ${name}  groupName: ${groupName}  active: ${activeMember}  info: ${info}  in map: ${eMap.has(name)}`);

    if(!name || name.length > MAX_NAME_LENGTH || isNaN(decodeInt(name)) ||         
        (groupName && 
            (groupName.length > MAX_NAME_LENGTH || isNaN(decodeInt(groupName))))) {
        throw new ParseError(<span>Missing and/or illegal names in directive: <code>{truncate(hint)}</code>.</span>);
    }
    let node: ENode;
    if (eMap.has(name)) {
        let defined: boolean;
        [node, defined] = eMap.get(name) as [ENode, boolean];
        if (defined) {
            throw new ParseError(<span>Duplicate definition of entity node <code>{name}</code>.</span>);
        }
    }
    else {
        node = new ENode(counter, 0, 0);
    }
    if (groupName) addToGroup(node, groupName, activeMember!, gMap);
    node.parse(tex, info, name);
    eMap.set(name, [node, true]);
    return node;
}

const parseCNodeGroup = (tex: string, hint: string, gMap: Map<string, Group<any>>, counter: number): CNodeGroup => {
    // The 'hint' for a NodeGroup has the following format:
    // ['K' + info] or 
    // ['K' + info + ('.' or ':') + groupName].
    const [, groupName, activeMember, info] = analyzeHint(hint);
    const nodeGroup = new CNodeGroup(counter);
    nodeGroup.parse(tex, info);
    if (groupName) addToGroup(nodeGroup, groupName, activeMember!, gMap);
    return nodeGroup;
}

export const load = (code: string, eCounter: number, ngCounter: number): [(ENode | CNodeGroup)[], number, number, number] => {
    const list: (ENode | CNodeGroup)[] = [];
    const lines = code.split(/[\r|\n]+/).filter(l => l.length>0);
    const n = lines.length;
    
    if (n<3) {
        throw new ParseError(`Need at least three lines of texdraw code, got ${n===0? 'zero': n===1? 'one': 'two'}.`);
    }
    
    // first line
    const expectedStart = `${Texdraw.start}%${versionString}`;
    if (!lines[0].startsWith(expectedStart)) {
        throw new ParseError(<span>Code should start with <code>{expectedStart}</code>.</span>);
    }

    // second line
    const split1 = lines[1].split('%');
    if (!split1[0].startsWith(Texdraw.dimCmd)) {
        throw new ParseError(<span>Second line should start with <code>{Texdraw.dimCmd}</code>.</span>);
    }
    const pixel = Number.parseFloat(split1[0].slice(Texdraw.dimCmd.length));
    if (isNaN(pixel)) {
        throw new ParseError(<span>Number format error in argument to <code>\setunitscale</code>.</span>);
    }
    if (pixel<0) {
        throw new ParseError(<span>Argument to <code>\setunitscale</code> should not be negative.</span>);
    }
    const gMap = split1.length>1? getGroupMap(split1[1]): new Map<string, Group<any>>();

    // We now have to parse the remaining lines, except for the last one, which should just be identical with Texdraw.end.

    const eMap = new Map<string, [ENode, boolean]>(); // This maps names of ENodes to arrays holding (i) the respective ENode and (ii) a boolean indicating whether that
        // node has already been configured by parseENode. (ENodes will be added to this map as soon as their names are used, which can happen before their respective
        // definitions have been encountered in the texdraw code.)
    let tex = '',
        cont = false; // indicates whether the current texdraw command has started on a previous line
    for (let i = 2; i<lines.length-1; i++) {
        const line = lines[i];
        const match = /((?:^|[^\\])(?:\\\\)*)%/.exec(line); // find an unescaped occurrence of '%'
        const newTex = match? line.slice(0, match.index + match[1].length): line; 
        tex = cont? tex + newTex: newTex;
        if (match) {
            const hint = line.slice(match.index + match[0].length);
            cont = false;

            //console.log(` t="${tex}" h="${hint}" m=${match[0].length}`);
            const prefix = hint.slice(0, 1);
            switch (prefix) {
                case ENODE_PREFIX: {
                        const node = parseENode(tex, hint, eMap, gMap, eCounter);
                        eCounter++;
                        list.push(node);
                        break;
                    }
                case NODEGROUP_PREFIX: {
                        const nodeGroup = parseCNodeGroup(tex, hint, gMap, ngCounter);
                        ngCounter++;
                        list.push(nodeGroup);
                        break;
                    }
                default: { // In this case the specialized parse functions have all returned null, which only happens if there's an error in the 'hint'.
                    throw new ParseError(<span>Ill-formed directive: <code>{truncate(hint)}</code>.</span>);
                }
            }
        } 
        else {
            cont = true;
        }
    }

    // last line
    if (lines[lines.length-1]!==Texdraw.end) {
        throw new ParseError(<span>The last line should read <code>{Texdraw.end}</code>. Incomplete code?</span>);
    }

    return [list, pixel, eCounter, ngCounter];
}
