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


/**
 * Returns a copy of the supplied Ornament, added to the latter's node.
 */
const copyOrnament = (
    o: Ornament, 
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>
): Ornament => {    
    const copy = o.clone(o.node);
    copy.angle = getCyclicValue(o.angle + ANGULAR_COPY_DISPLACEMENT, MIN_ROTATION, 360, ROUNDING_DIGITS);
    if (o.group) {
        o.group.members.push(o);
    }
    copies.set(o.id, copy);
    return copy;
}

/** 
 * Copies the isActiveMember property from one Node to another, and also adds to the latter clones of the former's Ornaments. These clones are newly created 
 * and then added to the supplied map. Where the original Ornament is included in topTbc, its clone is also added to the original Ornament's group. Otherwise, and
 * if the map contains a copy of the original Ornament's group, we add the clone to that group instead.
 */
const copyNodeValuesTo = (
    source: Node, 
    target: Node,
    topTbc: (Item | Group<any>)[],
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>
): void => {

    target.isActiveMember = source.isActiveMember;

    const n = source.ornaments.length;
    target.ornaments = [];
    for (let i = 0; i < n; i++) {
        const o = source.ornaments[i];

        const copy = o.clone(target); // Note: cloning o on target pushes the clone onto target.ornaments!
        
        if (o.group instanceof StandardGroup) {
            if (topTbc.includes(o)) {
                o.group.members.push(copy);
            }
            else if (copies.has(o.group.id)) {
                const copiedGroup = copies.get(o.group.id);
                if (copiedGroup instanceof StandardGroup) {
                    copy.group = copiedGroup;
                    copiedGroup.members.push(copy);
                }
            }
        }
        copies.set(o.id, copy);
    }
}

/**
 * Returns a copy of the supplied ENode.
 */
export const copyENode = (node: ENode, i: number, hDisplacement: number, vDisplacement: number,
    topTbc: (Item | Group<any>)[],
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>
): ENode => {

    const copy = new ENode(i, node.x + hDisplacement, node.y + vDisplacement);
    copyNodeValuesTo(node, copy, topTbc, copies);
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
 * Returns a copy of the supplied CNode. If ngCounter is zero, we assume that node is included in topTbc, and so we use an id that is based on the copied node's id; 
 * otherwise the copy's id will be composed out of ngCounter and nodeCoutner.
 */
export const copyCNode = (node: CNode, hDisplacement: number, vDisplacement: number, cngCounter: number, nodeCounter: number,
    topTbc: (Item | Group<any>)[],
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>
): CNode => {

    if (node.group) {
        const copy = new CNode(cngCounter===0? `${node.id}c${node.numberOfCopies++}`: `CN${cngCounter}/${nodeCounter}`, 
            node.x + hDisplacement, node.y + vDisplacement, node.angle0, node.angle1, node.group as CNodeGroup);
        copyNodeValuesTo(node, copy, topTbc, copies);
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
    cngCounter: number, 
    hDisplacement: number, vDisplacement: number, 
    topTbc: (Item | Group<any>)[],
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>
): CNodeGroup => {

    const copiedGroup = new CNodeGroup(cngCounter);

    copiedGroup.members  = group.members.map((m: CNode, i: number) => {
        const copy = copyCNode(m, hDisplacement, vDisplacement, cngCounter, i, topTbc, copies);
        copy.group = copiedGroup;
        copies.set(m.id, copy);
        return copy
    });    

    copiedGroup.linewidth = group.linewidth;
    copiedGroup.linewidth100 = group.linewidth100;
    copiedGroup.shading = group.shading;
    copiedGroup.dash = group.dash;
    copiedGroup.dash100 = group.dash100;
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
    enCounter: number, cngCounter: number, sgCounter: number,
    hDisplacement: number, vDisplacement: number, 
    topTbc: (Item | Group<any>)[],
    selection: Item[],
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>
): [StandardGroup<Item | Group<any>>, number, number, number] => {

    const copiedGroup = new StandardGroup<Item | Group<any>>(sgCounter, []);    
    sgCounter++;

    const members = group.members.reduce((acc: (Item | Group<any>)[], m) => {
        let copy: Item | CNodeGroup | StandardGroup<Item | Group<any>> | undefined;
        switch (true) {
            case m instanceof ENode:                
                copy = copyENode(m, enCounter++, hDisplacement, vDisplacement, topTbc, copies);
                copies.set(m.id, copy);
                break;
            case m instanceof CNodeGroup: 
                copy = copyCNodeGroup(m, cngCounter++, hDisplacement, vDisplacement, topTbc, copies);
                copies.set(m.id.toString(), copy);
                break;
            case m instanceof StandardGroup: 
                [copy, enCounter, cngCounter, sgCounter] = copyStandardGroup(m, enCounter, cngCounter, sgCounter, hDisplacement, vDisplacement, topTbc, selection, copies);
                break;
            case m instanceof Ornament: {
                const nodeShouldBeCopied = selection.includes(m.node);
                if (!nodeShouldBeCopied) { 
                    copy = copyOrnament(m, copies);
                } 
                else if (copies.has(m.id)) { 
                    const c = copies.get(m.id);
                    if (c instanceof Ornament) {
                        copy = copies.get(m.id);
                    }
                    else {
                        console.warn(`ID ${m.id} mapped to an object that is not an Ornament.`);
                    }
                } // Otherwise we rely on copyENode/copyCNode to make sure that the copied Ornament is made a member of the appropriate group.
                break;
            }
            default: return null as never;
        }
        if (copy) {
            copy.group = copiedGroup;
            return [...acc, copy];
        } else {
            return acc;
        }
    }, []);
    copiedGroup.members = members;
    copiedGroup.group = group.group;
    copiedGroup.isActiveMember = group.isActiveMember;

    copies.set(group.id, copiedGroup);

    return [copiedGroup, enCounter, cngCounter, sgCounter];
}


export const copy = (
    topTbc: (Item | Group<any>)[],
    selection: Item[],
    hDisplacement: number,
    vDisplacement: number, 
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>, 
    enCounter: number, 
    cngCounter: number,
    sgCounter: number
): [number, number, number] => {

    topTbc.forEach(m => {
        switch (true) {
            case m instanceof Ornament: {
                const nodeShouldBeCopied = selection.includes(m.node);
                if (!nodeShouldBeCopied) {
                    copyOrnament(m, copies);
                }
                break;
            }
            case m instanceof ENode: {
                const copy = copyENode(m, enCounter++, hDisplacement, vDisplacement, topTbc, copies);
                if (m.group) {
                    m.group.members.push(copy);
                }
                copies.set(m.id, copy);            
                break;
            }
            case m instanceof CNode: {
                const copy = copyCNode(m, hDisplacement, vDisplacement, 0, 0, topTbc, copies);
                if (m.group) {
                    m.group.members.splice(m.group.members.indexOf(m) + 1, 0, copy);
                }
                m.angle1 = copy.angle0 = 0;
                m.dist1 = copy.dist0 = DEFAULT_DISTANCE;
                copies.set(m.id, copy);
                break;
            }
            case m instanceof CNodeGroup: {
                const cng = copyCNodeGroup(m, cngCounter++, hDisplacement, vDisplacement, topTbc, copies);
                if (cng.group) {
                    cng.group.members.push(cng);
                }
                copies.set(m.id.toString(), cng);
                break;
            }
            case m instanceof StandardGroup: {
                let sg: StandardGroup<Item | Group<any>>;
                [sg, enCounter, cngCounter, sgCounter] = copyStandardGroup(m as StandardGroup<Item | Group<any>>, 
                        enCounter, cngCounter, sgCounter, hDisplacement, vDisplacement, topTbc, selection, copies);
                if (sg.group) {
                    sg.group.members.push(sg);
                }
                break;
            }
            default:
                console.warn(`Unexpected list member: ${m}`);
        }
    });
    return [enCounter, cngCounter, sgCounter];
}

export default copy;
