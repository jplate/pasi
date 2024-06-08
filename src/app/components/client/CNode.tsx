import Item from './Item.tsx'
import Riv from './Riv.tsx'
import Group from './Group.tsx'

export default class CNode extends Item {
    constructor(i: number, x: number, y: number, public group: NodeGroup) {
        super(`C${i}`, x, y);
    }
}

export class NodeGroup implements Group<CNode> {
    constructor(
        public members: CNode[], 
        public group: Group<CNode>,
        public isActiveMember: boolean
    ) {}

    public getString = () => `NG[${this.members.join(', ')}]`
}

export class Contour implements Riv {
    constructor(public base: CNode[]) {}
}