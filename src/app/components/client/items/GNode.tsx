import ENode, { ENodeCompProps, DEFAULT_RADIUS as ENODE_DEFAULT_RADIUS } from './ENode'
import CNodeGroup from '../CNodeGroup';
import { Entry } from '../ItemEditor';

export const DEFAULT_RADIUS = ENODE_DEFAULT_RADIUS;
export const DEFAULT_LINEWIDTH = 0;
export const DEFAULT_DASH = [1];
export const DEFAULT_SHADING = 0.02;

 /**
  * GNodes are 'ghost nodes', which transfer their own group membership, ornaments, and connector end points to other nodes when dragged onto the latter.
  */
export default class GNode extends ENode {

    constructor(i: number, x: number, y: number) {
        super(i, x, y); 
        this.radius = this.radius100 = DEFAULT_RADIUS;
        this.linewidth = this.linewidth100 = DEFAULT_LINEWIDTH;
    }

    override getString() {
        return `${this.id}(G)`;
    }

    override getInfo(list: (ENode | CNodeGroup)[]): Entry[] {
        return [
            ...this.getCoordinateInfo(list),
            {
                type: 'gloss', 
                text: <>This is a &lsquo;ghost node&rsquo;: when dragged onto another node, it will transfer its {' '}
                    group membership, ornaments, and connector end points to that other node and disappear.</>,
                style: 'max-w-64 pl-8 text-sm'
            },
            {
                type: 'gloss',
                text: <>Exception: no group membership will be transferred to <i>contour</i> nodes.</>,
                style: 'max-w-64 pl-8 text-xs'
            },
        ]
    }

    /**
     * We're overriding ENode.getComponent() purely in order to get the GNodes displayed with a gradient.
     */
    override getComponent({ id, yOffset, unitScale, displayFontFactor, bg, primaryColor, markColor0, markColor1, 
        titleColor, focusItem, selection, preselection, onMouseDown, onMouseEnter, onMouseLeave 
    }: ENodeCompProps) {        
        return super.getComponent({
                id, yOffset, unitScale, displayFontFactor, bg, primaryColor, markColor0, markColor1, titleColor, gradient: true, 
                focusItem, selection, preselection, onMouseDown, onMouseEnter, onMouseLeave
        });
    }

}