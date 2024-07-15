import ENode from './ENode'
import CNodeGroup from './CNodeGroup'
import CNode from './CNode'
import Group, { StandardGroup } from './Group'
import Item from './Item'
import { DEFAULT_DISTANCE } from './CNode'


/**
 * Returns a copy of the supplied ENode.
 */
export const copyENode = (node: ENode, i: number, dx: number, dy: number): ENode => {
    const copy = new ENode(i, node.x+dx, node.y+dy);
    copy.radius = node.radius;
    copy.radius100 = node.radius100;
    copy.linewidth = node.linewidth;
    copy.linewidth100 = node.linewidth100;
    copy.shading = node.shading;
    copy.dash = node.dash;
    copy.dash100 = node.dash100;
    copy.isActiveMember = node.isActiveMember;
    copy.group = node.group;
    return copy;
}

/**
 * Returns a copy of the supplied CNode. If ngCounter is zero, we use an id that is based on the copied node's id; otherwise the copy's id will be composed out of 
 * ngCounter and nodeCoutner.
 */
export const copyCNode = (node: CNode, dx: number, dy: number, ngCounter: number, nodeCounter: number): CNode => {
    if (node.group) {
        const copy = new CNode(ngCounter===0? `${node.id}c${node.numberOfCopies++}`: `CN${ngCounter}/${nodeCounter}`, 
            node.x+dx, node.y+dy, node.angle0, node.angle1, node.group as CNodeGroup);
        copy.omitLine = node.omitLine;
        copy.fixedAngles = node.fixedAngles;
        copy.isActiveMember = node.isActiveMember;
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
        cNodeCopies: Record<string, CNode>): CNodeGroup => {
    const copiedGroup = new CNodeGroup(i);
    const members = group.members.map((m: CNode, j: number) => {
        const copy = copyCNode(m, dx, dy, i, j);
        copy.group = copiedGroup;
        cNodeCopies[m.id] = copy;
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
        eNodeCounter: number, nGCounter: number,
        dx: number, dy: number, 
        copies: Record<string, ENode | CNodeGroup>,
        cNodeCopies: Record<string, CNode>): [StandardGroup<Item | Group<any>>, newENodeCounter: number, newNGCounter: number] => {
    const copiedGroup = new StandardGroup<Item | Group<any>>([]);
    const members: (Item | Group<any>)[] = group.members.map(m => {
        let copy;
        if (m instanceof ENode) {                
            copy = copyENode(m, eNodeCounter++, dx, dy);
            copies[m.id] = copy;
        }
        else if (m instanceof CNodeGroup) {
            copy = copyCNodeGroup(m, nGCounter++, dx, dy, cNodeCopies);
            copies[m.id] = copy;
        }
        else if (m instanceof StandardGroup) { 
            [copy, eNodeCounter, nGCounter] = copyStandardGroup(m, eNodeCounter, nGCounter, dx, dy, copies, cNodeCopies);
        }
        else return null as never;
        copy.group = copiedGroup;
        return copy;
    });
    copiedGroup.members = members;
    copiedGroup.group = group.group;
    copiedGroup.isActiveMember = group.isActiveMember;
    return [copiedGroup, eNodeCounter, nGCounter];
}



export const copy = (topTbc: (Item | Group<any>)[], hDisplacement: number, vDisplacement: number, 
    copies: Record<string, ENode | CNodeGroup>, 
    cNodeCopies: Record<string, CNode>, 
    enCounter: number, 
    ngCounter: number
): [newENodeCounter: number, newNGCounter: number] => {
    topTbc.forEach(m => {
        if (m instanceof ENode) {
            const node = copyENode(m, enCounter++, hDisplacement, vDisplacement);
            if (node.group) {
                node.group.members.push(node);
            }
            copies[m.id] = node;
        }
        else if(m instanceof CNode) {
            const node = copyCNode(m, hDisplacement, vDisplacement, 0, 0);
            if (node.group) {
                node.group.members.splice(node.group.members.indexOf(m)+1, 0, node);
            }
            m.angle1 = node.angle0 = 0;
            m.dist1 = node.dist0 = DEFAULT_DISTANCE;
            cNodeCopies[m.id] = node;
        }
        else if(m instanceof CNodeGroup) {
            const group = copyCNodeGroup(m, ngCounter++, hDisplacement, vDisplacement, cNodeCopies);
            if (group.group) {
                group.group.members.push(group);
            }
            copies[m.id] = group;
        }
        else if(m instanceof StandardGroup) { 
            const [group, newCounter, newNGCounter] = copyStandardGroup(m as StandardGroup<Item | Group<any>>, 
                    enCounter, ngCounter, hDisplacement, vDisplacement, copies, cNodeCopies);
            if (group.group) {
                group.group.members.push(group);
            }
            enCounter = newCounter;
            ngCounter = newNGCounter;
        }
        else {
            console.log(`Unexpected list member: ${m}`);
        }
    });
    return [enCounter, ngCounter];
}

export default copy;
