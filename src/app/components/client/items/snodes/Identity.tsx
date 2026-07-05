import SNode from '@/app/components/client/items/SNode';
import { Entry } from '@/app/components/client/ItemEditor';
import { Circle, ParseError, StrokedShape } from '@/app/codec/Texdraw';

export const DEFAULT_W0 = 8;
export const DEFAULT_W1 = 8;
export const DEFAULT_WC = 8;

/**
 * Identities are SNodes that are originally supposed to represent instantiations of the identity relation. On the canvas
 * they appear as simple lines.
 */
export default class Identity extends SNode {
    constructor(i: number, closest: boolean) {
        super(i, closest);
        this.editHandler = {
            ...this.nodeEditHandler,
            ...this.connectorEditHandler,
            ...this.commonArrowheadEditHandler,
        };
    }

    getDefaultW0() {
        return DEFAULT_W0;
    }

    getDefaultW1() {
        return DEFAULT_W1;
    }

    getDefaultWC() {
        return DEFAULT_WC;
    }

    override getArrowheadInfo(): Entry[] {
        return [];
    }

    parseArrowhead(
        stShapes: StrokedShape[],
        _cpx: number,
        _cpy: number,
        _dimRatio: number,
        nodeName: string
    ): StrokedShape[] {
        // Since an Identity has no arrowhead, the only shapes that may legitimately remain after the connector are
        // the Circles that represent the SNode itself (in case it is drawn).
        if (stShapes.length > 0 && !(stShapes[0].shape instanceof Circle)) {
            throw new ParseError(
                <span>
                    Failed parsing information for entity node <code>{nodeName}</code>: unexpected shapes.
                </span>
            );
        }
        return stShapes;
    }
}
