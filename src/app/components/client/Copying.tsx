import Item from './items/Item'
import Node, { DEFAULT_DISTANCE } from './items/Node'
import ENode from './items/ENode'
import GNode, { DEFAULT_RADIUS } from './items/GNode'
import CNodeGroup from './CNodeGroup'
import CNode from './items/CNode'
import Group, { StandardGroup } from './Group'
import Ornament from './items/Ornament'


/**
 * Returns an array of 
 * (i) a copy of the supplied Ornament, added to a 'ghost node' that is either retrieved from the ghosts map or created, and 
 * (ii) an updated ENode counter (which is incremented if a new ghost node has been created).
 */
const copyOrnament = (
    o: Ornament, 
    enCounter: number,
    hDisplacement: number,
    vDisplacement: number,
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>,
    ghosts: Map<string, ENode>
): [Ornament, number] => {    
    let ghost = ghosts.get(o.node.id);
    if (!ghost) { // Create a new ghost node:
        const a = o.angle / 180 * Math.PI;
        const radius = o.node.radius - DEFAULT_RADIUS;
        const x = o.node.x + Math.cos(a) * radius;
        const y = o.node.y + Math.sin(a) * radius;
        ghost = new GNode(enCounter++, x + hDisplacement, y + vDisplacement);
        ghosts.set(o.node.id, ghost);
    }
    const copy = o.clone(ghost);
    copies.set(o.id, copy);
    return [copy, enCounter];
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
 * Returns a copy of the supplied CNode. If ngCounter is zero, we assume that node is included in topTbc, and so we use an id that is based on the copied node's ID; 
 * otherwise the copy's ID will be composed out of ngCounter and nodeCounter.
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

    copiedGroup.copyNonMemberValuesFrom(group);

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
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>,
    ghosts: Map<string, GNode>
): [StandardGroup<Item | Group<any>>, number, number, number] => {

    const copiedGroup = new StandardGroup<Item | Group<any>>(sgCounter, []);    
    sgCounter++;
    copies.set(group.id, copiedGroup);

    for (let m of group.members) {
        //console.log(`M: ${m.getString()}`);
        let copy: Item | CNodeGroup | StandardGroup<Item | Group<any>> | undefined = undefined;
        switch (true) {
            case m instanceof ENode: {
                copy = copyENode(m, enCounter++, hDisplacement, vDisplacement, topTbc, copies); // Note that this may push Ornaments onto copiedGroup.members.
                copies.set(m.id, copy);
                break;
            }
            case m instanceof CNodeGroup: {
                copy = copyCNodeGroup(m, cngCounter++, hDisplacement, vDisplacement, topTbc, copies); // Ditto.
                copies.set(m.id.toString(), copy);
                break;
            }
            case m instanceof StandardGroup: {
                [copy, enCounter, cngCounter, sgCounter] = 
                    copyStandardGroup(m, enCounter, cngCounter, sgCounter, hDisplacement, vDisplacement, topTbc, selection, copies, ghosts); // Ditto.
                break;
            }
            case m instanceof Ornament: {
                const nodeShouldBeCopied = selection.includes(m.node);
                if (!nodeShouldBeCopied) { 
                    [copy, enCounter] = copyOrnament(m, enCounter, hDisplacement, vDisplacement, copies, ghosts);
                } 
                else if (copies.has(m.id)) { // This will be the case if previously a Node has been copied to which m is attached.
                    const c = copies.get(m.id);
                    if (c instanceof Ornament) {
                        if (c.group===null) { // In this case the copy's group still needs to be updated.
                            copy = c;
                        }
                    }
                    else {
                        console.warn(`ID ${m.id} is mapped to an object that is not an Ornament.`);
                    }
                } // Otherwise we rely on copyENode/copyCNode to make sure that the copied Ornament is made a member of the appropriate group.
                break;
            }
            default: return null as never;
        }
        if (copy) {
            //console.log(`Setting group for ${copy.getString()}: ${copiedGroup.getString()}`);
            copy.group = copiedGroup;
            copiedGroup.members.push(copy);
        }
    }
    copiedGroup.isActiveMember = group.isActiveMember;

    return [copiedGroup, enCounter, cngCounter, sgCounter];
}


export const copy = (
    topTbc: (Item | Group<any>)[],
    selection: Item[],
    hDisplacement: number,
    vDisplacement: number, 
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>, 
    ghosts: Map<string, GNode>,
    enCounter: number, 
    cngCounter: number,
    sgCounter: number
): [number, number, number] => {

    topTbc.forEach(m => {
        switch (true) {
            case m instanceof Ornament: {
                //console.log(`O: ${m.id}`);
                const nodeShouldBeCopied = selection.includes(m.node);
                if (!nodeShouldBeCopied) {
                    let copy;
                    [copy, enCounter] = copyOrnament(m, enCounter, hDisplacement, vDisplacement, copies, ghosts);
                    if (m.group) {
                        m.group.members.push(copy);
                    }                
                }
                break;
            }
            case m instanceof ENode: {
                //console.log(`E: ${m.id}`);
                const copy = copyENode(m, enCounter++, hDisplacement, vDisplacement, topTbc, copies);
                if (m.group) {
                    copy.group = m.group;
                    copy.group.members.push(copy);
                }
                copies.set(m.id, copy);            
                break;
            }
            case m instanceof CNode: {
                //console.log(`C: ${m.id}`);
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
                //console.log(`CG: ${m.getString()}`);
                const copy = copyCNodeGroup(m, cngCounter++, hDisplacement, vDisplacement, topTbc, copies);
                if (m.group) {
                    copy.group = m.group;
                    copy.group.members.push(copy);
                }
                copies.set(m.id.toString(), copy);
                break;
            }
            case m instanceof StandardGroup: {
                //console.log(`SG: ${m.getString()}`);
                let copy: StandardGroup<Item | Group<any>>;
                [copy, enCounter, cngCounter, sgCounter] = copyStandardGroup(m as StandardGroup<Item | Group<any>>, 
                        enCounter, cngCounter, sgCounter, hDisplacement, vDisplacement, topTbc, selection, copies, ghosts);
                if (m.group) {
                    copy.group = m.group;
                    copy.group.members.push(copy);
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
