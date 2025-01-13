import Item from './items/Item'
import Node, { DEFAULT_DISTANCE, addDependents } from './items/Node'
import ENode from './items/ENode'
import GNode, { DEFAULT_RADIUS } from './items/GNode'
import CNodeGroup from './CNodeGroup'
import CNode from './items/CNode'
import Group, { StandardGroup, getGroups, getLeafMembers } from './Group'
import Ornament from './items/Ornament'
import SNode from './items/SNode'


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
    gnodes: Map<string, GNode>
): [Ornament, number] => {    
    let gnode = gnodes.get(o.node.id);
    if (!gnode) { // Create a new ghost node:
        const a = o.angle / 180 * Math.PI;
        const radius = o.node.radius - DEFAULT_RADIUS;
        const x = o.node.x + Math.cos(a) * radius;
        const y = o.node.y + Math.sin(a) * radius;
        gnode = new GNode(enCounter++, x + hDisplacement, y + vDisplacement);
        gnodes.set(o.node.id, gnode);
    }
    const copy = o.clone(gnode);
    copies.set(o.id, copy);
    return [copy, enCounter];
}

/** 
 * Copies the isActiveMember property from one Node to another, and also adds to the latter clones of the former's Ornaments. These clones are newly created 
 * and then added to the supplied map. Where the original Ornament is included in topTbc, its clone is also added to the original Ornament's group. Otherwise, and
 * if the map contains a copy of the original Ornament's group, we add the clone to that group instead.
 * 
 * This function is designed to be applicable both to ENodes and to CNodes.
 */
const copyNodeValues = (
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
export const copyENode = (node: ENode, enCounter: number, hDisplacement: number, vDisplacement: number,
    topTbc: (Item | Group<any>)[],
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>
): ENode => {
    const con = node.constructor as new (i: number, x: number, y: number) => ENode;
    const copy = new con(enCounter, node.x + hDisplacement, node.y + vDisplacement);
    copyNodeValues(node, copy, topTbc, copies);
    node.copyValuesTo(copy);
    return copy;
}

/**
 * Returns a copy of the supplied ENode.
 */
export const copySNode = (node: SNode, enCounter: number, 
    topTbc: (Item | Group<any>)[],
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>,
): SNode => {
    const con = node.constructor as new (i: number) => SNode;
    const copy = new con(enCounter);
    copyNodeValues(node, copy, topTbc, copies);
    node.copyValuesTo(copy);
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
        copyNodeValues(node, copy, topTbc, copies);
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
    gnodes: Map<string, GNode>,
    snodes: SNode[]
): [StandardGroup<Item | Group<any>>, number, number, number] => {

    const copiedGroup = new StandardGroup<Item | Group<any>>(sgCounter, []);    
    sgCounter++;
    copies.set(group.id, copiedGroup);

    for (let m of group.members) {
        //console.log(`M: ${m.getString()}`);
        let mCopy: Item | CNodeGroup | StandardGroup<Item | Group<any>> | undefined = undefined;
        switch (true) {
            case m instanceof SNode: {
                snodes.push(m);
                mCopy = copySNode(m, enCounter, topTbc, copies); // Note that this may push Ornaments onto copiedGroup.members.
                copies.set(m.id, mCopy);
                break;
            }
            case m instanceof ENode: {
                mCopy = copyENode(m, enCounter++, hDisplacement, vDisplacement, topTbc, copies); // Note that this may push Ornaments onto copiedGroup.members.
                copies.set(m.id, mCopy);
                break;
            }
            case m instanceof CNodeGroup: {
                mCopy = copyCNodeGroup(m, cngCounter++, hDisplacement, vDisplacement, topTbc, copies); // Ditto.
                copies.set(m.id.toString(), mCopy);
                break;
            }
            case m instanceof StandardGroup: {
                [mCopy, enCounter, cngCounter, sgCounter] = 
                    copyStandardGroup(m, enCounter, cngCounter, sgCounter, hDisplacement, vDisplacement, topTbc, selection, copies, gnodes, snodes); // Ditto.
                break;
            }
            case m instanceof Ornament: {
                const nodeShouldBeCopied = selection.includes(m.node);
                if (!nodeShouldBeCopied) { 
                    [mCopy, enCounter] = copyOrnament(m, enCounter, hDisplacement, vDisplacement, copies, gnodes);
                } 
                else if (copies.has(m.id)) { // This will be the case if previously a Node has been copied to which m is attached.
                    const oCopy = copies.get(m.id)
                    if (oCopy instanceof Ornament) {
                        if (oCopy.group===group) { // In this case the copy's group still needs to be updated to copiedGroup.
                            mCopy = oCopy;
                        }
                    }
                    else {
                        console.warn(`ID ${m.id} is mapped to an object that is not an Ornament.`);
                    }
                } // Otherwise we rely on copy[CES]Node to make sure that the copied Ornament is made a member of the appropriate group.
                break;
            }
            default: return null as never;
        }
        if (mCopy) {
            //console.log(`Setting group for ${copy.getString()}: ${copiedGroup.getString()}`);
            mCopy.group = copiedGroup;
            copiedGroup.members.push(mCopy);
        }
    }
    copiedGroup.isActiveMember = group.isActiveMember;

    return [copiedGroup, enCounter, cngCounter, sgCounter];
}

/**
 * @return a triple consisting of an updated ENode counter, ContourGroup counter, and StandardGroup counter.
 * @param gnodes maps non-copied nodes (in particular, ones to which to-be-copied ornaments or connectors are attached) to their respective 'ghost copies'
 */
export const copy = (
    topTbc: (Item | Group<any>)[],
    selection: Item[],
    hDisplacement: number,
    vDisplacement: number, 
    copies: Map<string, Item | CNodeGroup | StandardGroup<Item | Group<any>>>, 
    gnodes: Map<string, GNode>,
    enCounter: number, 
    cngCounter: number,
    sgCounter: number
): [number, number, number] => {
    // console.log(`topTbc: ${topTbc.map(m => m.getString()).join('; ')}`);
    const snodes: SNode[] = []; // This will contain all the SNodes that we're going to copy.
    topTbc.forEach(m => {
        switch (true) {
            case m instanceof Ornament: {
                //console.log(`O: ${m.id}`);
                const nodeShouldBeCopied = selection.includes(m.node);
                if (!nodeShouldBeCopied) {
                    let copy;
                    [copy, enCounter] = copyOrnament(m, enCounter, hDisplacement, vDisplacement, copies, gnodes);
                    if (m.group) {
                        m.group.members.push(copy);
                    }                
                }
                break;
            }
            case m instanceof SNode: {
                //console.log(`S: ${m.id}`);
                snodes.push(m);
                const copy = copySNode(m, enCounter++, topTbc, copies);
                if (m.group) {
                    copy.group = m.group;
                    copy.group.members.push(copy);
                }
                copies.set(m.id, copy);            
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
                        enCounter, cngCounter, sgCounter, hDisplacement, vDisplacement, topTbc, selection, copies, gnodes, snodes);
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
    snodes.forEach(item => { // We go through the selected SNodes and initialize their copies with the appropriate involutes. If both of the original
            // involutes have been copied, then the involutes of the SNode copy will be those copies; if none of the original involutes have been copied,
            // then the SNode copy's involutes will be newly created GNodes; and if exactly one of the original involutes has been copied, then the 
            // corresponding involute of the SNode copy will be that copy, while the other involute will be the original SNode's uncopied involute. The 
            // reason for this is that in this last case there is just no need to create another GNode for the uncopied involute, and this behavior also
            // makes sense from a UX perspective.
        if (item instanceof SNode) {
            const nodeCopy = copies.get(item.id) as SNode;
            const origInv = item.involutes;
            const involutes: Node[] = origInv.map((inv, i) => {
                const invCopy = copies.get(inv.id) as Node;
                if (!invCopy) {                          // If inv hasn't been copied 
                    if (copies.has(origInv[1 - i].id)) { // but the other involute has,
                        return inv;                      // then there's no need to create a GNode.
                    }
                    else {
                        const angles = item.findExitAngles();
                        const a = angles[i] / 180 * Math.PI;
                        const [x0, y0] = inv.getLocation();
                        const radius = inv.radius - DEFAULT_RADIUS;
                        const x1 = x0 + Math.cos(a) * radius;
                        const y1 = y0 + Math.sin(a) * radius;
                        const gn = new GNode(enCounter++, x1 + hDisplacement, y1 + vDisplacement);
                        gnodes.set(inv.id, gn);
                        return gn;
                    }
                }
                else {
                    return invCopy;
                }
            });
            nodeCopy.init(involutes);
        }
    });
    return [enCounter, cngCounter, sgCounter];
}


/** 
 * Returns an array of the highest-level Groups (or Items) that would need to be copied, based on the supplied selection.
 */
export const getTopToBeCopied = (selection: Item[]) => {
    const toBeCopied: Set<Item> = addDependents(selection);
    const result: (Item | Group<any>)[] = [];
    const ntbcContaining = new Set<Group<any>>(); // already-visited groups containing not-to-be copied items
    const nonNtbcContaining = new Set<Group<any>>(); // already-visited groups that do NOT contain any not-to-be-copied items
    toBeCopied.forEach(item => {
        const [groups, actIndex] = getGroups(item);
        let j = -1, // The index of that group, if some such group exists; -1 otherwise.
            visited = false;
        for (let i = 0; i<=actIndex; i++) { // We are looking for the lowest active group that has both item and a not-to-be-copied node among its leaf members.
            if (ntbcContaining.has(groups[i]) || nonNtbcContaining.has(groups[i])) {
                visited = true;
                break;
            }
            const lm = getLeafMembers(groups[i]) as Set<Item>;
            let containsNtbc = false;
            for (const m of lm) {
                if (!toBeCopied.has(m)) {
                    containsNtbc = true;
                    break;
                }
            }
            if (containsNtbc) {
                j = i;
                ntbcContaining.add(groups[i]);
                break;
            }
            nonNtbcContaining.add(groups[i]);
        }
        if (j<0 && !visited && actIndex>=0) { 
            // item has an active group, and no active group in its hierarchy contains not-to-be-copied items.
            result.push(groups[actIndex]);
        }
        else if (actIndex<0 || (j<1 && ntbcContaining.has(groups[0]))) {
            // Either item has no active group, or the group of which it is a direct member also contains a not-to-be-copied node.
            result.push(item); 
        }
        else if (!visited && j>0) {
            // groups[j-1] is one level below the lowest active group in item's hierarchy that contains not-to-be-copied items.
            result.push(groups[j-1]);
        }
    });
    return result;
}
