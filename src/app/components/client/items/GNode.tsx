import ENode, { DEFAULT_RADIUS as ENODE_DEFAULT_RADIUS } from './ENode'
import CNodeGroup from '../CNodeGroup';
import { Entry } from '../ItemEditor';

export const DEFAULT_RADIUS = ENODE_DEFAULT_RADIUS;
export const DEFAULT_LINEWIDTH = 0.1;
export const DEFAULT_DASH = [1];
export const DEFAULT_SHADING = 0.02;

 /**
  * GNodes are 'ghost nodes', nodes that will transfer their ornaments and connector end points to non-ghost nodes when dragged onto the latter.
  */
export default class GNode extends ENode {

    constructor(i: number, x: number, y: number) {
        super(i, x, y); 
        this.radius = this.radius100 = DEFAULT_RADIUS;
        this.linewidth = this.linewidth100 = DEFAULT_LINEWIDTH;
        this.dash = this.dash100 = DEFAULT_DASH;
        this.shading = DEFAULT_SHADING;
    }

    override getString() {
        return `${this.id}(G)`;
    }

    override getInfo(list: (ENode | CNodeGroup)[]): Entry[] {
        return [
            ...this.getCoordinateInfo(list),
            {
                type: 'gloss', 
                text: <>This is a &lsquo;ghost node&rsquo;: when dragged (via the snapping mechanism) onto a non-ghost node, it will transfer its {' '}
                    ornaments and connector end points to that other node and disappear.</>,
                style: 'max-w-64 pl-8 text-sm'
            },
        ]
    }

}