import Item from './Item'
import Node from './Node'
import ENode from './ENode'
import CNodeGroup from './CNodeGroup'
import CNode from './CNode'
import Group, { StandardGroup } from './Group'
import { DEFAULT_DISTANCE } from './CNode'
import Ornament, { ROUNDING_DIGITS } from './depItem/Ornament'
import { getCyclicValue } from '../../util/MathTools'
import { MIN_ROTATION } from './ItemEditor'

export const ANGULAR_COPY_DISPLACEMENT = 30;

const copyNodeValuesTo = (source: Node, target: Node, copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>) => {
    target.isActiveMember = source.isActiveMember;
    target.ornaments = source.ornaments.map(o => {
        const copy = o.clone(target);
        copies.set(o.id, copy);
        return copy;
    });
}

/**
 * Returns a copy of the supplied ENode.
 */
export const copyENode = (node: ENode, i: number, dx: number, dy: number,
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>
): ENode => {
    const copy = new ENode(i, node.x+dx, node.y+dy);
    copyNodeValuesTo(node, copy, copies);
    copy.group = node.group;
    copy.radius = node.radius;
    copy.radius100 = node.radius100;
    copy.linewidth = node.linewidth;
    copy.linewidth100 = node.linewidth100;
    copy.shading = node.shading;
    copy.dash = node.dash;
    copy.dash100 = node.dash100;
    return copy;
}

/**
 * Returns a copy of the supplied CNode. If ngCounter is zero, we use an id that is based on the copied node's id; otherwise the copy's id will be composed out of 
 * ngCounter and nodeCoutner.
 */
export const copyCNode = (node: CNode, dx: number, dy: number, ngCounter: number, nodeCounter: number,
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>
): CNode => {
    if (node.group) {
        const copy = new CNode(ngCounter===0? `${node.id}c${node.numberOfCopies++}`: `CN${ngCounter}/${nodeCounter}`, 
            node.x + dx, node.y + dy, node.angle0, node.angle1, node.group as CNodeGroup);
        copyNodeValuesTo(node, copy, copies);
        copy.omitLine = node.omitLine;
        copy.fixedAngles = node.fixedAngles;
        copy.dist0 = node.dist0;
        copy.dist1 = node.dist1;
        return copy;
    }
    else return null as never;
}

/**
 * Returns a copy of the supplied NodeGroup.
 */
export const copyCNodeGroup = (
        group: CNodeGroup, 
        i: number, dx: number, dy: number, 
        copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>): CNodeGroup => {
    const copiedGroup = new CNodeGroup(i);
    const members = group.members.map((m: CNode, j: number) => {
        const copy = copyCNode(m, dx, dy, i, j, copies);
        copy.group = copiedGroup;
        copies.set(m.id, copy);
        return copy
    });
    copiedGroup.linewidth = group.linewidth;
    copiedGroup.linewidth100 = group.linewidth100;
    copiedGroup.shading = group.shading;
    copiedGroup.dash = group.dash;
    copiedGroup.dash100 = group.dash100;
    copiedGroup.members = members;
    copiedGroup.group = group.group;
    copiedGroup.isActiveMember = group.isActiveMember;
    return copiedGroup;
}


/**
 * Returns a copy of the supplied StandardGroup together with an updated ENode-counter that is used for the creation of the copied group's leaf members (at least those
 * that are ENodes). 
 */
export const copyStandardGroup = (
        group: StandardGroup<Item | Group<any>>, 
        eNodeCounter: number, cngCounter: number, sgCounter: number,
        dx: number, dy: number, 
        copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>
): [StandardGroup<Item | Group<any>>, number, number, number] => {
    const copiedGroup = new StandardGroup<Item | Group<any>>(sgCounter.toString(), []);
    sgCounter++;

    const members: (Item | Group<any>)[] = group.members.map(m => {
        let copy;
        switch (true) {
            case m instanceof ENode:                
                copy = copyENode(m, eNodeCounter++, dx, dy, copies);
                copies.set(m.id, copy);
                break;
            case m instanceof CNodeGroup: 
                copy = copyCNodeGroup(m, cngCounter++, dx, dy, copies);
                copies.set(m.id.toString(), copy);
                break;
            case m instanceof StandardGroup: 
                [copy, eNodeCounter, cngCounter, sgCounter] = copyStandardGroup(m, eNodeCounter, cngCounter, sgCounter, dx, dy, copies);
                break;
            default: return null as never;
        }
        copy.group = copiedGroup;

        return copy;
    });
    copiedGroup.members = members;
    copiedGroup.group = group.group;
    copiedGroup.isActiveMember = group.isActiveMember;
    return [copiedGroup, eNodeCounter, cngCounter, sgCounter];
}

const copyTopTbcENode = (node: ENode, enCounter: number, hDisplacement: number, vDisplacement: number, 
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>
) => {
    const copy = copyENode(node, enCounter, hDisplacement, vDisplacement, copies);
    if (node.group) {
        node.group.members.push(copy);
    }
    copies.set(node.id, copy);
    return copy;
}

const copyTopTbcCNode = (node: CNode, hDisplacement: number, vDisplacement: number, 
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>
) => {
    const copy = copyCNode(node, hDisplacement, vDisplacement, 0, 0, copies);
    if (node.group) {
        node.group.members.splice(node.group.members.indexOf(node)+1, 0, copy);
    }
    node.angle1 = copy.angle0 = 0;
    node.dist1 = copy.dist0 = DEFAULT_DISTANCE;
    copies.set(node.id, copy);
    return copy;
}

export const copy = (
    topTbc: (Item | Group<any>)[], 
    hDisplacement: number,
    vDisplacement: number, 
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>, 
    enCounter: number, 
    cngCounter: number,
    sgCounter: number
): [number, number, number] => {
    topTbc.forEach(m => {
        switch (true) {
            case m instanceof ENode: {
                copyTopTbcENode(m, enCounter++, hDisplacement, vDisplacement, copies);
                break;
            }
            case m instanceof CNode: {
                copyTopTbcCNode(m, hDisplacement, vDisplacement, copies);
                break;
            }
            case m instanceof CNodeGroup: {
                const cng = copyCNodeGroup(m, cngCounter++, hDisplacement, vDisplacement, copies);
                if (cng.group) {
                    cng.group.members.push(cng);
                }
                copies.set(m.id.toString(), cng);
                break;
            }
            case m instanceof StandardGroup: {
                let sg: StandardGroup<Item | Group<any>>;
                [sg, enCounter, cngCounter, sgCounter] = copyStandardGroup(m as StandardGroup<Item | Group<any>>, 
                        enCounter, cngCounter, sgCounter, hDisplacement, vDisplacement, copies);
                if (sg.group) {
                    sg.group.members.push(sg);
                }
                break;
            }
            case m instanceof Ornament: {
                const nodeShouldBeCopied = topTbc.includes(m.node);
                let node = nodeShouldBeCopied? copies.get(m.node.id): m.node;
                if (nodeShouldBeCopied && !node) { // In this case we first have to create the node.
                    node = m.node instanceof ENode? 
                        copyTopTbcENode(m.node, enCounter++, hDisplacement, vDisplacement, copies):
                        copyTopTbcCNode(m.node as CNode, hDisplacement, vDisplacement, copies);  
                }
                if (!(node instanceof Node)) {
                    console.warn(`Node id '${m.node.id}' mapped to non-node.`);
                    break;
                }
                if (!nodeShouldBeCopied) { // If the node itself should be copied, we let copyENode/copyCNode take care of copying its ornaments.
                    const o = m.clone(node);
                    o.angle = getCyclicValue(m.angle + ANGULAR_COPY_DISPLACEMENT, MIN_ROTATION, 360, ROUNDING_DIGITS);
                    copies.set(m.id, o);
                }
                break;
            }
            default:
                console.log(`Unexpected list member: ${m}`);
        }
    });
    return [enCounter, cngCounter, sgCounter];
}

export default copy;
