import Item from '../components/client/items/Item'
import Node from '../components/client/items/Node'
import ENode from '../components/client/items/ENode'
import SNode from '../components/client/items/SNode'
import CNodeGroup from '../components/client/CNodeGroup'
import Group, { StandardGroup, getGroups } from '../components/client/Group'
import * as Texdraw from './Texdraw'
import { ParseError } from './Texdraw'
import Ornament from '../components/client/items/Ornament'
import Label from '../components/client/items/Label'
import Adjunction from '../components/client/items/Adjunction'
import BidirectionalMap from '../util/BidirectionalMap'
import { getItems } from '../components/client/MainPanel'
import { encodeInt, decodeInt, encode, decode } from './General'

export const versionString = 'pasiCodecV1';

const MAX_NAME_LENGTH = 3; // Maximum length for names of nodes and groups (used in detecting corrupt data).
const ENODE_PREFIX = 'E';
const CNODEGROUP_PREFIX = 'S'; // The 'S' stands for 'set', because that's what a contour is most naturally taken to represent.
const CNODE_NAME_INFIX = '-'; // Used in constructing names of CNodes in the 'hints' for the decoding of Ornament information. This infix
    // must *not* overlap with CODE.

const ornamentPrefixMap = new BidirectionalMap<string, new (node: Node) => any>([
    ['L', Label]
]);

const sNodePrefixMap = new BidirectionalMap<string, new (i: number) => any>([
    ['A', Adjunction]
]);

export const getCode = (list: (ENode | CNodeGroup)[], unitscale: number): string => {
    const arr = [`${Texdraw.start}%${versionString}`];

    // We start by constructing the 'preamble', which mainly contains information as to what groups contain which other groups.
    
    const gMap = new Map<Group<any>, string>(); // maps groups (including CNodeGroups) to their names
    let groupCounter = 0;
    for (const it of getItems(list)) {
        const groups = getGroups(it)[0];
        for (const g of groups) {
            if (gMap.has(g)) break;
            gMap.set(g, encode(groupCounter++));
        }
    }

    const groupInfo = [...gMap.entries()].reduce(
        (acc: string[], [g, name]) => {
            const groupInfoList = g.members.reduce(
                (acc: string[], m) => m instanceof StandardGroup? [...acc, `${m.isActiveMember? ':': '.'}${gMap.get(m)}`]: acc, 
                []
            );
            return groupInfoList.length>0? [...acc, `${name}${groupInfoList.join('')}`]: acc; 
        }, []
    ).join(' ');

    arr.push(`${Texdraw.dimCmd} ${unitscale} ${groupInfo.length>0? `%${groupInfo}`: ''}`); 

    // Next, we construct a map from Nodes to their names.

    const nodeMap = new Map<Node, string>(); // maps Nodes to their names (cnode groups don't need names)
    let eNodeCounter = 0;
    for (const it of list) {
        let cngName: string | undefined = undefined;
        if (it instanceof CNodeGroup) {
            cngName = gMap.get(it);
        }
        const nodes: Node[] = it instanceof CNodeGroup? it.members: [it];
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            let nodeName: string;
            if (node instanceof ENode) {
                nodeName = encodeInt(eNodeCounter++);
            } 
            else { // Otherwise we're dealing with a CNode:
                nodeName = `${cngName}${CNODE_NAME_INFIX}${i}`;
            }
            nodeMap.set(node, nodeName);
        }
    }

    // Finally, we construct the main part of the code.

    for (const it of list) {
        const code = it.getTexdrawCode();
        let cngName: string | undefined = undefined;
        if (it instanceof CNodeGroup) {
            cngName = gMap.get(it);
            arr.push(`${code}%${CNODEGROUP_PREFIX}${cngName}{${it.getInfoString()}}${getGroupInfo(it, gMap)}`); 
        }
        
        const nodes: Node[] = it instanceof CNodeGroup? it.members: [it];
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const nodeName = nodeMap.get(node);
            if (node instanceof ENode) {
                let nodeInfo;
                if (node instanceof SNode) {
                    const prefix = sNodePrefixMap.getByValue(node.constructor as new (i: number) => any);
                    const invNames = node.involutes.map(inv => nodeMap.get(inv));
                    nodeInfo = `${prefix}${nodeName}(${invNames.join(',')})`;
                }
                else {
                    nodeInfo = `${ENODE_PREFIX}${nodeName}`;
                }
                const info = node.getInfoString();
                arr.push(`${code}%${nodeInfo}${info.length>0? `{${info}}`: ''}${getGroupInfo(node, gMap)}`); 
            } 
            // We now have to add the codes for any ornaments.
            for (const o of node.ornaments) {
                const code = o.getTexdrawCode(unitscale);
                const prefix = ornamentPrefixMap.getByValue(o.constructor as new (node: Node) => any);
                const info = o.getInfoString();
                arr.push(`${code}%${prefix}${nodeName}{${info}}${getGroupInfo(o, gMap)}`); 
            }
        }
    }

    arr.push(Texdraw.end);
    return arr.join('\n');
}

const getGroupInfo = (it: CNodeGroup | Item, gMap: Map<Group<any>, string>) => it.group? `${it.isActiveMember? ':': '.'}${gMap.get(it.group)}`: '';

const getGroupMap = (str: string, sgCounter: number) => {
    const map = new Map<string, Group<any>>();
    str.split(' ').forEach(s => {
        const sp = s.split(/[\.:]/); // The dot/colon distinction is used to indicate whether a group member's membership is active.
        if (sp.some(s => s.length > MAX_NAME_LENGTH || isNaN(decodeInt(s)))) {
            throw new ParseError(<span>Corrupt data: illegal group names in preamble.</span>);
        }
        // Now that all group names are guaranteed to be reasonably short, we won't have to bother with truncating them in our error messages.

        let g: StandardGroup<Item | Group<any>>;
        if (map.has(sp[0])) {
            g = map.get(sp[0]) as StandardGroup<ENode | Group<any>>;
        }
        else {
            g = new StandardGroup<Item | Group<any>>(sgCounter, []);
            sgCounter++;
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
                m = new StandardGroup<Item | Group<any>>(sgCounter, []);
                sgCounter++;
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
const analyzeHint = (
    hint: string, 
    allowFractionalName: boolean = false// indicates whether we allow the 'name' to represent a floating point number.
): [name: string, groupName: string | null, activeMember: boolean | undefined, info: string | null] => {
    let info: string | null = null,
        activeMember: boolean | undefined = undefined;
    const i =  hint.indexOf('{'); // the beginning of the info string, if present.
    if(i >= 0) {
        info = extractString(hint, '\\{(.*?)\\}', i);
        if (!info) { 
            throw new ParseError(<span>Ill-formed directive (expected closing bracket): <code>{truncate(hint)}</code>.</span>);
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
        throw new ParseError(<span>Directive should not end with a period or colon: <code>{truncate(hint)}</code>.</span>);
    }
    const tooLong = name && name.length > 2 * MAX_NAME_LENGTH + 1;
    const isInt = name && !tooLong && !isNaN(decodeInt(name));
    if(!name || tooLong ||
        (isInt && name.length > MAX_NAME_LENGTH) || 
        (!allowFractionalName && !isInt) || 
        (groupName && 
            (groupName.length > MAX_NAME_LENGTH || isNaN(decodeInt(groupName))))) {
        throw new ParseError(<span>Missing and/or illegal item identifier: <code>{truncate(name)}</code>.</span>);
    }

    return [name, groupName, activeMember, info];
}

/** 
 * This function adds the supplied ENode or NodeGroup to the group with the specified name, which is either obtained from gMap or created.
 * Returns an updated StandardGroup counter.
 */
const addToGroup = (item: Item | CNodeGroup, groupName: string, activeMember: boolean, gMap: Map<string, Group<any>>, sgCounter: number) => {
    if (groupName) {
        let g: StandardGroup<Item | Group<any>>;
        if (gMap.has(groupName)) {
            g = gMap.get(groupName) as StandardGroup<Item | Group<any>>;
        }
        else {
            g = new StandardGroup<Item | Group<any>>(sgCounter, []);
            sgCounter++;
            gMap.set(groupName, g);
        }
        g.members.push(item);
        item.group = g;
        item.isActiveMember = activeMember;
    }
    return sgCounter;
}

const parseENode = (tex: string, hint: string, dimRatio: number, eMap: Map<string, [ENode, boolean]>, 
    gMap: Map<string, Group<any>>, counter: number, sgCounter: number
): [ENode, number] => {
    // The 'hint' for an ENode has the following format:
    // ['E' + name] or 
    // ['E' + name + ('.' or ':') + groupName] or 
    // ['E' + name + info] or 
    // ['E' + name + info + ('.' or ':') + groupName].
    const [name, groupName, activeMember, info] = analyzeHint(hint);

    //console.log(` name: ${name}  groupName: ${groupName}  active: ${activeMember}  info: ${info}  in map: ${eMap.has(name)}`);

    let node: ENode;
    if (eMap.has(name)) {
        const [it, defined] = eMap.get(name) as [ENode, boolean];
        if (!(it instanceof ENode)) {
            throw new ParseError(<span><code>{name}</code> used as a name of both a contour node group and an entity node.</span>);
        }
        if (defined) {
            throw new ParseError(<span>Duplicate definition of entity node <code>{name}</code>.</span>);
        }
        node = it;
    }
    else {
        node = new ENode(counter, 0, 0);
    }

    if (groupName) {
        sgCounter = addToGroup(node, groupName, activeMember!, gMap, sgCounter);
    }
    node.parse(tex, info, dimRatio, 1, 1, name);
    eMap.set(name, [node, true]);
    return [node, sgCounter];
}

const parseCNodeGroup = (tex: string, hint: string, dimRatio: number, cngMap: Map<string, [CNodeGroup, boolean]>, gMap: Map<string, Group<any>>, 
    counter: number, sgCounter: number
): [CNodeGroup, number] => {
    // The 'hint' for a NodeGroup has the following format:
    // ['K' + info] or 
    // ['K' + info + ('.' or ':') + groupName].
    const [name, groupName, activeMember, info] = analyzeHint(hint);

    let cng: CNodeGroup;
    if (cngMap.has(name)) {
        const [it, defined] = cngMap.get(name) as [ENode | CNodeGroup, boolean];
        if (!(it instanceof CNodeGroup)) {
            throw new ParseError(<span><code>{name}</code> used as a name of both an entity node and a contour node group.</span>);
        }
        if (defined) {
            throw new ParseError(<span>Duplicate definition of contour node group <code>{name}</code>.</span>);
        }
        cng = it;
    }
    else {
        cng = new CNodeGroup(counter);
    }
    if (groupName) {
        sgCounter = addToGroup(cng, groupName, activeMember!, gMap, sgCounter);
    }
    cng.parse(tex, info, dimRatio);
    cngMap.set(name, [cng, true]); 
    return [cng, sgCounter];
}

const parseOrnament = (tex: string, hint: string, dimRatio: number, oClass: new (node: Node) => any, 
    eMap: Map<string, [ENode, boolean]>, cngMap: Map<string, [CNodeGroup, boolean]>, gMap: Map<string, Group<any>>, 
    sgCounter:number, unitscale: number, displayFontFactor: number
): [Ornament, number] => {
    // The 'hint' for an Ornament has (roughly) the following format:
    // [prefix + nodeName + info] or 
    // [prefix + nodeName + info + ('.' or ':') + groupName].
    const [name, groupName, activeMember, info] = analyzeHint(hint, true);
    // The 'name' should here have the format [eNodeName] OR [cngName + CNODE_NAME_INFIX + nodeIndex].
    const split = name.split(CNODE_NAME_INFIX);
    let o: Ornament, 
        nodeIdentifier = ''; // This will be passed on to Ornapment.parse() for the purpose of constructing error messages.
    if (split.length===1) { // In this case we're dealing with an Ornament attached to an ENode.
        let node: Node | undefined = undefined,
            defined = false;
        const enName = split[0];
        const eNodeIndex = decode(enName);
        if (!isFinite(eNodeIndex)) {
            throw new ParseError(<span>Invalid entity node identifier: <code>{name}</code>.</span>);
        }
        if (eMap.has(enName)) {
            [node, defined] = eMap.get(enName) as [ENode, boolean];
        }
        if (!node || !defined) {
            throw new ParseError(<span>Entity node <code>{enName}</code> should be defined before the definition of any ornaments attached to it.</span>);
        }
        nodeIdentifier = `entity node ${eNodeIndex}`;
        o = new oClass(node);
    }
    else { // In this case we're dealing with an Ornament attached to a CNode.
        let cng: CNodeGroup | undefined = undefined,
            defined = false;
        const cngName = split[0];
        const cngIndex = decode(cngName);
        const cnIndex = split.length>1? decode(split[1]): 0;
        if (split.length!==2 || !isFinite(cngIndex) || !isFinite(cnIndex)) {
            throw new ParseError(<span>Invalid contour node identifier: <code>{name}</code>.</span>);
        }
        if (cngMap.has(cngName)) {
            [cng, defined] = cngMap.get(cngName) as [CNodeGroup, boolean];
        }
        if (!cng || !defined) {
            throw new ParseError(<span>Contour node group <code>{cngName}</code> should be defined before the definition of any ornaments attached to it.</span>);
        }
        if (cnIndex > cng.members.length - 1) {
            throw new ParseError(<span>Node index out of bounds: {cnIndex}.</span>);
        }
        nodeIdentifier = `node ${cnIndex} of contour node group ${cngIndex}`;
        const cn = cng.members[cnIndex];
        o = new oClass(cn);
    }

    //console.log(`info: ${info}`);
    if (info===null) {	        	
        throw new ParseError(<span>Incomplete definition of ornament for {nodeIdentifier}: info string required.</span>);
    }

    if (groupName) {
        sgCounter = addToGroup(o, groupName, activeMember!, gMap, sgCounter);
    }
    o.parse(tex, info, dimRatio, unitscale, displayFontFactor, nodeIdentifier);
    return [o, sgCounter];
}

export const load = (code: string, unitscale: number | undefined, displayFontFactor: number, eCounter: number, cngCounter: number, sgCounter: number
): [(ENode | CNodeGroup)[], number, number, number, number] => {
    const list: (ENode | CNodeGroup)[] = [];
    const lines = code.split(/[\r\n]+/).filter(l => l.length>0);
    const n = lines.length;
    
    if (n<3) {
        throw new ParseError(<span>Need at least three lines of <i>texdraw</i> code, got {n===0? 'zero': n===1? 'one': 'two'}.</span>);
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
    const loadedUnitscale = Number.parseFloat(split1[0].slice(Texdraw.dimCmd.length));
    if (isNaN(loadedUnitscale)) {
        throw new ParseError(<span>Number format error in argument to <code>\setunitscale</code>.</span>);
    }
    if (loadedUnitscale<0) {
        throw new ParseError(<span>Argument to <code>\setunitscale</code> should not be negative.</span>);
    }
    const gMap = split1.length>1? getGroupMap(split1[1], sgCounter): new Map<string, Group<any>>();
    

    // We now have to parse the remaining lines, except for the last one, which should just be identical with Texdraw.end.

    const eMap = new Map<string, [ENode, boolean]>();     // These two maps map names of ENodes or CNodeGroups to arrays holding (i) the respective ENode or
    const cngMap = new Map<string, [CNodeGroup, boolean]>(); // CNodeGroup and (ii) a boolean indicating whether that node or group has already been configured 
        // by parseENode or parseCNodeGroup. (ENodes and CNodeGroups will be added to the respective map as soon as their names are used, which can happen   
        // before their definitions have been encountered in the texdraw code. However, the definition of any ornament has to come later than the definition 
        // of the node to which it is attached.)
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
            const dimRatio = unitscale===undefined? 1: loadedUnitscale / unitscale;
            switch (prefix) {
                case ENODE_PREFIX: {
                        let node: ENode;
                        [node, sgCounter] = parseENode(tex, hint, dimRatio, eMap, gMap, eCounter, sgCounter);
                        eCounter++;
                        list.push(node);
                        break;
                    }
                case CNODEGROUP_PREFIX: {
                        let cng: CNodeGroup;
                        [cng, sgCounter] = parseCNodeGroup(tex, hint, dimRatio, cngMap, gMap, cngCounter, sgCounter);
                        cngCounter++;
                        list.push(cng);
                        break;
                    }
                default: { // In this case we're probably dealing with an Ornament:
                    const oClass = ornamentPrefixMap.getByKey(prefix);
                    let o: Ornament;
                    if (oClass) {
                        [o, sgCounter] = parseOrnament(tex, hint, dimRatio, oClass, eMap, cngMap, gMap, sgCounter, loadedUnitscale, displayFontFactor);
                    }
                    else { // In this case the prefix has not been recognized.
                        throw new ParseError(<span>Unexpected directive: <code>{truncate(hint)}</code>.</span>);
                    }
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

    return [list, loadedUnitscale, eCounter, cngCounter, sgCounter];
}
