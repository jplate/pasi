import SNode from '../SNode';
import { Entry } from '../../ItemEditor';
import { ParseError, StrokedShape } from '@/app/codec/Texdraw';

export const DEFAULT_W0 = 8;
export const DEFAULT_W1 = 8;
export const DEFAULT_WC = 8;

/**
 * Identities are SNodes that are originally supposed to represent instantiations of the identity relation. On the canvas
 * they appear as simple lines.
 */
export default class Identity extends SNode {
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
        if (stShapes.length > 0) {
            throw new ParseError(
                (
                    <span>
                        Failed parsing information for entity node <code>{nodeName}</code>: unexpected shapes.
                    </span>
                )
            );
        }
        return stShapes;
    }
}
