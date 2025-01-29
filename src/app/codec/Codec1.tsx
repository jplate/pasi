import Item from '../components/client/items/Item';
import Node from '../components/client/items/Node';
import ENode from '../components/client/items/ENode';
import SNode from '../components/client/items/SNode';
import GNode from '../components/client/items/GNode';
import CNodeGroup from '../components/client/CNodeGroup';
import Group, { StandardGroup, getGroups } from '../components/client/Group';
import * as Texdraw from './Texdraw';
import { ParseError } from './Texdraw';
import Ornament from '../components/client/items/Ornament';
import Label from '../components/client/items/ornaments/Label';
import Adjunction from '../components/client/items/snodes/Adjunction';
import Identity from '../components/client/items/snodes/Identity';
import Order from '../components/client/items/snodes/Order';
import BidirectionalMap from '../util/BidirectionalMap';
import { getItems } from '../components/client/MainPanel';
import { encodeInt, decodeInt, encode, decode } from './General';

export const versionString = 'pasiCodecV1';

const MAX_NAME_LENGTH = 3; // Maximum length for names of nodes and groups (used in detecting corrupt data).
const ENODE_PREFIX = 'E';
const GNODE_PREFIX = 'G';
const CNODEGROUP_PREFIX = 'S'; // The 'S' stands for 'set', because that's what a contour is most naturally taken to represent.
const CNODE_NAME_INFIX = '-'; // Used in constructing names of CNodes in the 'hints' for the decoding of Ornament information. This infix
// must *not* overlap with CODE.

const ornamentPrefixMap = new BidirectionalMap<string, new (node: Node) => Ornament>([['L', Label]]);

const sNodePrefixMap = new BidirectionalMap<string, new (i: number) => SNode>([
    ['A', Adjunction],
    ['I', Identity],
    ['O', Order],
]);

type NodeIdentifier = {
    name: string;
    index?: number;
};

export const getCode = (list: (ENode | CNodeGroup)[], unitScale: number): string => {
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

    const groupInfo = [...gMap.entries()]
        .reduce((acc: string[], [g, name]) => {
            const groupInfoList = g.members.reduce(
                (acc: string[], m) =>
                    m instanceof StandardGroup
                        ? [...acc, `${m.isActiveMember ? ':' : '.'}${gMap.get(m)}`]
                        : acc,
                []
            );
            return groupInfoList.length > 0 ? [...acc, `${name}${groupInfoList.join('')}`] : acc;
        }, [])
        .join(' ');

    arr.push(`${Texdraw.dimCmd} ${unitScale} ${groupInfo.length > 0 ? `%${groupInfo}` : ''}`);

    // Next, we construct a map from Nodes to their names.

    const nodeMap = new Map<Node, string>(); // maps Nodes to their names (cnode groups don't need names)
    let eNodeCounter = 0;
    for (const it of list) {
        let cngName: string | undefined = undefined;
        if (it instanceof CNodeGroup) {
            cngName = gMap.get(it);
        }
        const nodes: Node[] = it instanceof CNodeGroup ? it.members : [it];
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            let nodeName: string;
            if (node instanceof ENode) {
                nodeName = encodeInt(eNodeCounter++);
            } else {
                // Otherwise we're dealing with a CNode:
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
            arr.push(
                `${code}%${CNODEGROUP_PREFIX}${cngName}{${it.getInfoString()}}${getGroupInfo(it, gMap)}`
            );
        }

        const nodes: Node[] = it instanceof CNodeGroup ? it.members : [it];
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const nodeName = nodeMap.get(node);
            if (node instanceof ENode) {
                let nodeInfo;
                if (node instanceof SNode) {
                    const prefix = sNodePrefixMap.getByValue(node.constructor as new (i: number) => any);
                    const invNames = node.involutes.map((inv) => nodeMap.get(inv));
                    nodeInfo = `${prefix}${nodeName}(${invNames.join(' ')})`;
                } else if (node instanceof GNode) {
                    nodeInfo = `${GNODE_PREFIX}${nodeName}`;
                } else {
                    nodeInfo = `${ENODE_PREFIX}${nodeName}`;
                }
                const info = node.getInfoString();
                arr.push(
                    `${code}%${nodeInfo}${info.length > 0 ? `{${info}}` : ''}${getGroupInfo(node, gMap)}`
                );
            }
            // We now have to add the codes for any ornaments.
            for (const o of node.ornaments) {
                const code = o.getTexdrawCode(unitScale);
                const prefix = ornamentPrefixMap.getByValue(o.constructor as new (node: Node) => any);
                const info = o.getInfoString();
                arr.push(`${code}%${prefix}${nodeName}{${info}}${getGroupInfo(o, gMap)}`);
            }
        }
    }

    arr.push(Texdraw.end);
    return arr.join('\n');
};

const getGroupInfo = (it: CNodeGroup | Item, gMap: Map<Group<any>, string>) =>
    it.group ? `${it.isActiveMember ? ':' : '.'}${gMap.get(it.group)}` : '';

const getGroupMap = (str: string, sgCounter: number) => {
    const map = new Map<string, Group<any>>();
    str.split(' ').forEach((s) => {
        const sp = s.split(/[.:]/); // The dot/colon distinction is used to indicate whether a group member's membership is active.
        if (sp.some((s) => s.length > MAX_NAME_LENGTH || isNaN(decodeInt(s)))) {
            throw new ParseError(<span>Corrupt data: illegal group names in preamble.</span>);
        }
        // Now that all group names are guaranteed to be reasonably short, we won't have to bother with truncating them in our error messages.

        let g: StandardGroup<Item | Group<any>>;
        if (map.has(sp[0])) {
            g = map.get(sp[0]) as StandardGroup<ENode | Group<any>>;
        } else {
            g = new StandardGroup<Item | Group<any>>(sgCounter, []);
            sgCounter++;
            map.set(sp[0], g);
        }
        if (g.members.length > 0) {
            throw new ParseError(
                (
                    <span>
                        Corrupt data: group <code>{sp[0]}</code> is assigned members more than once.
                    </span>
                )
            );
        }
        const groups = getGroups(g)[0]; // the current list of g's groups. This will be used to prevent us from building a cyclic hierarchy due to corrupt data.
        const memberStrings = sp.slice(1);
        const members = memberStrings.map((ms) => {
            let m: Group<any>;
            if (map.has(ms)) {
                m = map.get(ms) as Group<any>;
                if (m) {
                    if (m.group) {
                        throw new ParseError(
                            (
                                <span>
                                    Corrupt data: group <code>{ms}</code> is listed as a member more than
                                    once.
                                </span>
                            )
                        );
                    }
                    if (
                        m === g ||
                        groups.some((gr) => m === gr || (m instanceof StandardGroup && m.contains(gr)))
                    ) {
                        throw new ParseError(
                            (
                                <span>
                                    Corrupt data: group <code>{ms}</code> cannot be a direct or indirect
                                    member of itself.
                                </span>
                            )
                        );
                    }
                }
            } else {
                m = new StandardGroup<Item | Group<any>>(sgCounter, []);
                sgCounter++;
                map.set(ms, m);
            }
            m.group = g;
            m.isActiveMember = s[s.indexOf(ms) - 1] === ':';
            return m;
        });
        g.members = members;
    });
    return map;
};

/**
 * Truncate the supplied string for use in short error messages.
 */
const truncate = (s: string) => {
    const max = 25;
    return `${s.length > max ? s.slice(0, max - 3) + '...' : s}`;
};

/**
 * Tries to match the supplied string to the supplied pattern with the specified offset. Returns the matched group if the match succeeds and null otherwise.
 */
const extractString = (s: string, pattern: string, offset: number): string | null => {
    const match = s.match(`^.{${offset}}${pattern}`);
    return match ? match[1] : null;
};

/**
 * This function analyzes the 'hint', returning an array that contains the relevant item's name, the name of its group,
 * a boolean indicating whether it is an active member of that group, and an info string.
 */
const analyzeHint = (
    hint: string
): [name: string, groupName: string | null, activeMember: boolean | undefined, info: string | null] => {
    let info: string | null = null,
        activeMember: boolean | undefined = undefined;
    const i = hint.indexOf('{'); // the beginning of the info string, if present.
    if (i >= 0) {
        info = extractString(hint, '\\{(.*?)\\}', i);
        if (!info) {
            throw new ParseError(
                (
                    <span>
                        Ill-formed directive (expected closing bracket): <code>{truncate(hint)}</code>.
                    </span>
                )
            );
        }
    }
    let j = hint.indexOf(':', info ? i + info.length + 1 : 0);
    if (j >= 0) {
        activeMember = true;
    } else {
        j = hint.indexOf('.', info ? i + info.length + 1 : 0);
        if (j >= 0) {
            activeMember = false;
        }
    }
    const name = i < 0 && j < 0 ? hint.slice(1) : hint.slice(1, i < 0 ? j : i);
    const groupName = j < 0 ? null : hint.slice(j + 1);
    if (j + 1 === hint.length) {
        // In this case the hint ends with a '.' or ':', which makes no sense.
        throw new ParseError(
            (
                <span>
                    Directive should not end with a period or colon: <code>{truncate(hint)}</code>.
                </span>
            )
        );
    }

    return [name, groupName, activeMember, info];
};

const validateName = (
    name: string,
    allowCNodeName: boolean = false // indicates whether we allow name to be of the format 'name + CNODE_NAME_INFIX + nodeIndex'.
): NodeIdentifier => {
    if (!name) {
        throw new ParseError(<span>Missing item identifier.</span>);
    }
    if ((!allowCNodeName && name.length > MAX_NAME_LENGTH) || name.length > 2 * MAX_NAME_LENGTH + 1) {
        throw new ParseError(
            (
                <span>
                    Identifier too long: <code>{truncate(name)}</code>.
                </span>
            )
        );
    }
    const split = name.split(CNODE_NAME_INFIX);
    const index = split.length > 1 ? decodeInt(split[1]) : undefined;
    if (!isFinite(decodeInt(split[0])) || (index && (!allowCNodeName || !isFinite(index)))) {
        throw new ParseError(
            (
                <span>
                    Illegal identifier: <code>{truncate(name)}</code>.
                </span>
            )
        );
    }
    return { name: split[0], index };
};

/**
 * This function adds the supplied ENode or NodeGroup to the group with the specified name, which is either obtained from gMap or created.
 * Returns an updated StandardGroup counter.
 */
const addToGroup = (
    item: Item | CNodeGroup,
    groupName: string,
    activeMember: boolean,
    gMap: Map<string, Group<any>>,
    sgCounter: number
) => {
    if (groupName) {
        let g: StandardGroup<Item | Group<any>>;
        if (gMap.has(groupName)) {
            g = gMap.get(groupName) as StandardGroup<Item | Group<any>>;
        } else {
            g = new StandardGroup<Item | Group<any>>(sgCounter, []);
            sgCounter++;
            gMap.set(groupName, g);
        }
        g.members.push(item);
        item.group = g;
        item.isActiveMember = activeMember;
    }
    return sgCounter;
};

const parseENode = (
    tex: string,
    isGNode: boolean,
    hint: string,
    dimRatio: number,
    eMap: Map<string, ENode>,
    gMap: Map<string, Group<any>>,
    counter: number,
    sgCounter: number
): [ENode, number] => {
    // The 'hint' for an ENode has the following format:
    // ['E' + name] or
    // ['E' + name + ('.' or ':') + groupName] or
    // ['E' + name + info] or
    // ['E' + name + info + ('.' or ':') + groupName].
    const [name, groupName, activeMember, info] = analyzeHint(hint);
    validateName(name);

    //console.log(` name: ${name}  groupName: ${groupName}  active: ${activeMember}  info: ${info}  in map: ${eMap.has(name)}`);

    if (eMap.get(name)) {
        throw new ParseError(
            (
                <span>
                    Duplicate definition of entity node <code>{name}</code>.
                </span>
            )
        );
    }
    const node = isGNode ? new GNode(counter, 0, 0) : new ENode(counter, 0, 0);

    if (groupName) {
        validateName(groupName);
        sgCounter = addToGroup(node, groupName, activeMember!, gMap, sgCounter);
    }
    node.parse(tex, info, dimRatio, 1, 1, name);
    eMap.set(name, node);
    return [node, sgCounter];
};

const sNodeNameMatch = /(\S+)\((\S+)\s+(\S+)\)/;

const parseSNode = (
    tex: string,
    hint: string,
    dimRatio: number,
    snClass: new (id: number) => SNode,
    eMap: Map<string, ENode>,
    invMap: Map<SNode, NodeIdentifier[]>,
    gMap: Map<string, Group<any>>,
    counter: number,
    sgCounter: number
): [SNode, number] => {
    const [nameString, groupName, activeMember, info] = analyzeHint(hint);

    // Extract the names of this node and its two involutes from the nameString
    const match = nameString.match(sNodeNameMatch);
    if (!match) {
        throw new ParseError(
            (
                <span>
                    Illegal expression: <code>{truncate(nameString)}</code>.
                </span>
            )
        );
    }
    const name: string = validateName(match[1]).name;
    const inv0Id: NodeIdentifier = validateName(match[2], true);
    const inv1Id: NodeIdentifier = validateName(match[3], true);

    if (eMap.get(name)) {
        throw new ParseError(
            (
                <span>
                    Duplicate definition of entity node <code>{name}</code>.
                </span>
            )
        );
    }
    const sn = new snClass(counter);

    if (groupName) {
        validateName(groupName);
        sgCounter = addToGroup(sn, groupName, activeMember!, gMap, sgCounter);
    }

    sn.parse(tex, info, dimRatio, 1, 1, name);
    eMap.set(name, sn);
    invMap.set(sn, [inv0Id, inv1Id]);
    return [sn, sgCounter];
};

const parseCNodeGroup = (
    tex: string,
    hint: string,
    dimRatio: number,
    cngMap: Map<string, CNodeGroup>,
    gMap: Map<string, Group<any>>,
    counter: number,
    sgCounter: number
): [CNodeGroup, number] => {
    // The 'hint' for a NodeGroup has the following format:
    // ['K' + info] or
    // ['K' + info + ('.' or ':') + groupName].
    const [name, groupName, activeMember, info] = analyzeHint(hint);
    validateName(name);

    if (cngMap.get(name)) {
        throw new ParseError(
            (
                <span>
                    Duplicate definition of contour node group <code>{name}</code>.
                </span>
            )
        );
    }
    const cng = new CNodeGroup(counter);
    if (groupName) {
        validateName(groupName);
        sgCounter = addToGroup(cng, groupName, activeMember!, gMap, sgCounter);
    }
    cng.parse(tex, info, dimRatio);
    cngMap.set(name, cng);
    return [cng, sgCounter];
};

const parseOrnament = (
    tex: string,
    hint: string,
    dimRatio: number,
    oClass: new (node: Node) => Ornament,
    eMap: Map<string, ENode>,
    cngMap: Map<string, CNodeGroup>,
    gMap: Map<string, Group<any>>,
    sgCounter: number,
    unitScale: number,
    displayFontFactor: number
): number => {
    // The 'hint' for an Ornament has (roughly) the following format:
    // [prefix + nodeName + info] or
    // [prefix + nodeName + info + ('.' or ':') + groupName].
    const [nameString, groupName, activeMember, info] = analyzeHint(hint);
    // The 'name' should here have the format [eNodeName] OR [cngName + CNODE_NAME_INFIX + nodeIndex].
    const { name, index } = validateName(nameString, true);
    let o: Ornament,
        nodeIdentifier = ''; // This will be passed on to Ornapment.parse() for the purpose of constructing error messages.
    if (index === undefined) {
        // In this case we're dealing with an Ornament attached to an ENode.
        const eNodeIndex = decode(name);
        if (!isFinite(eNodeIndex)) {
            throw new ParseError(
                (
                    <span>
                        Invalid entity node identifier: <code>{name}</code>.
                    </span>
                )
            );
        }
        const node = eMap.get(name);
        if (!node) {
            throw new ParseError(
                (
                    <span>
                        Entity node <code>{name}</code> should be defined before the definition of any
                        ornaments attached to it.
                    </span>
                )
            );
        }
        nodeIdentifier = `entity node ${eNodeIndex}`;
        o = new oClass(node);
    } else {
        // In this case we're dealing with an Ornament attached to a CNode.
        const cngIndex = decode(name);
        const cng = cngMap.get(name);
        if (!cng) {
            throw new ParseError(
                (
                    <span>
                        Contour node group <code>{name}</code> should be defined before the definition of any
                        ornaments attached to it.
                    </span>
                )
            );
        }
        if (index > cng.members.length - 1) {
            throw new ParseError(<span>Node index out of bounds: {index}.</span>);
        }
        nodeIdentifier = `node ${index} of contour node group ${cngIndex}`;
        const cn = cng.members[index];
        o = new oClass(cn);
    }

    //console.log(`info: ${info}`);
    if (info === null) {
        throw new ParseError(
            <span>Incomplete definition of ornament for {nodeIdentifier}: info string required.</span>
        );
    }

    if (groupName) {
        validateName(groupName);
        sgCounter = addToGroup(o, groupName, activeMember!, gMap, sgCounter);
    }
    o.parse(tex, info, dimRatio, unitScale, displayFontFactor, nodeIdentifier);
    return sgCounter;
};

export const load = (
    code: string,
    unitScale: number | undefined,
    displayFontFactor: number,
    eCounter: number,
    cngCounter: number,
    sgCounter: number
): [(ENode | CNodeGroup)[], number, number, number, number] => {
    const list: (ENode | CNodeGroup)[] = [];
    const lines = code.split(/[\r\n]+/).filter((l) => l.length > 0);
    const n = lines.length;

    if (n < 3) {
        throw new ParseError(
            (
                <span>
                    Need at least three lines of <i>texdraw</i> code, got{' '}
                    {n === 0 ? 'zero' : n === 1 ? 'one' : 'two'}.
                </span>
            )
        );
    }

    // first line
    const expectedStart = `${Texdraw.start}%${versionString}`;
    if (!lines[0].startsWith(expectedStart)) {
        throw new ParseError(
            (
                <span>
                    Code should start with <code>{expectedStart}</code>.
                </span>
            )
        );
    }

    // second line
    const split1 = lines[1].split('%');
    if (!split1[0].startsWith(Texdraw.dimCmd)) {
        throw new ParseError(
            (
                <span>
                    Second line should start with <code>{Texdraw.dimCmd}</code>.
                </span>
            )
        );
    }
    const loadedunitScale = Number.parseFloat(split1[0].slice(Texdraw.dimCmd.length));
    if (isNaN(loadedunitScale)) {
        throw new ParseError(
            (
                <span>
                    Number format error in argument to <code>\setunitScale</code>.
                </span>
            )
        );
    }
    if (loadedunitScale < 0) {
        throw new ParseError(
            (
                <span>
                    Argument to <code>\setunitScale</code> should not be negative.
                </span>
            )
        );
    }
    const gMap = split1.length > 1 ? getGroupMap(split1[1], sgCounter) : new Map<string, Group<any>>();

    // We now have to parse the remaining lines, except for the last one, which should just be identical with Texdraw.end.

    const eMap = new Map<string, ENode>();
    const cngMap = new Map<string, CNodeGroup>();
    const invMap = new Map<SNode, NodeIdentifier[]>();
    let tex = '',
        cont = false; // indicates whether the current texdraw command has started on a previous line
    for (let i = 2; i < lines.length - 1; i++) {
        const line = lines[i];
        const match = /((?:^|[^\\])(?:\\\\)*)%/.exec(line); // find an unescaped occurrence of '%'
        const newTex = match ? line.slice(0, match.index + match[1].length) : line;
        tex = cont ? tex + newTex : newTex;
        if (match) {
            const hint = line.slice(match.index + match[0].length);
            cont = false;

            //console.log(` t="${tex}" h="${hint}" m=${match[0].length}`);
            const prefix = hint.slice(0, 1);
            const dimRatio = unitScale === undefined ? 1 : loadedunitScale / unitScale;
            let isGNode = false;
            switch (prefix) {
                case GNODE_PREFIX: {
                    isGNode = true;
                    // fall through because we rely on parseENode for the rest.
                }
                case ENODE_PREFIX: {
                    let node: ENode;
                    [node, sgCounter] = parseENode(
                        tex,
                        isGNode,
                        hint,
                        dimRatio,
                        eMap,
                        gMap,
                        eCounter,
                        sgCounter
                    );
                    eCounter++;
                    list.push(node);
                    break;
                }
                case CNODEGROUP_PREFIX: {
                    let cng: CNodeGroup;
                    [cng, sgCounter] = parseCNodeGroup(
                        tex,
                        hint,
                        dimRatio,
                        cngMap,
                        gMap,
                        cngCounter,
                        sgCounter
                    );
                    cngCounter++;
                    list.push(cng);
                    break;
                }
                default: {
                    // In this case we're probably dealing with an Ornament or SNode:
                    const snClass = sNodePrefixMap.getByKey(prefix);
                    if (snClass) {
                        let sn: SNode;
                        [sn, sgCounter] = parseSNode(
                            tex,
                            hint,
                            dimRatio,
                            snClass,
                            eMap,
                            invMap,
                            gMap,
                            eCounter,
                            sgCounter
                        );
                        eCounter++;
                        list.push(sn);
                    } else {
                        const oClass = ornamentPrefixMap.getByKey(prefix);
                        if (oClass) {
                            sgCounter = parseOrnament(
                                tex,
                                hint,
                                dimRatio,
                                oClass,
                                eMap,
                                cngMap,
                                gMap,
                                sgCounter,
                                loadedunitScale,
                                displayFontFactor
                            );
                        } else {
                            // In this case the prefix has not been recognized.
                            throw new ParseError(
                                (
                                    <span>
                                        Unexpected directive: <code>{truncate(hint)}</code>.
                                    </span>
                                )
                            );
                        }
                    }
                }
            }
        } else {
            cont = true;
        }
    }
    invMap.forEach((invIds, sn) => {
        const involutes: Node[] = invIds.map((id) => {
            let node;
            if (id.index !== undefined) {
                const cng = cngMap.get(id.name);
                if (!cng) {
                    throw new ParseError(
                        (
                            <span>
                                Incomplete code: missing definition of contour node group{' '}
                                <code>{id.name}</code>.
                            </span>
                        )
                    );
                }
                if (cng.members.length <= id.index) {
                    throw new ParseError(
                        (
                            <>
                                Failed reference to a member with index {id.index} of contour node group{' '}
                                <code>{id.name}</code>, which has only {cng.members.length} members.
                            </>
                        )
                    );
                }
                node = cng.members[id.index];
            } else {
                node = eMap.get(id.name);
                if (!node) {
                    throw new ParseError(
                        (
                            <span>
                                Incomplete code: missing definition of entity node <code>{id.name}</code>.
                            </span>
                        )
                    );
                }
            }
            return node;
        });
        sn.init(involutes[0], involutes[1]);
    });

    // last line
    if (lines[lines.length - 1] !== Texdraw.end) {
        throw new ParseError(
            (
                <span>
                    The last line should read <code>{Texdraw.end}</code>. Incomplete code?
                </span>
            )
        );
    }

    return [list, loadedunitScale, eCounter, cngCounter, sgCounter];
};
