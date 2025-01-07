import SNode from './SNode'
import { Entry } from '../ItemEditor'
import { Info, Handler } from './ENode'
import { Shape, angle, travel } from '../../../util/MathTools'

export const DEFAULT_W0 = 8;
export const DEFAULT_W1 = 8;
export const DEFAULT_WC = 8;

export const DEFAULT_HOOK_ANGLE = .39;
export const DEFAULT_HOOK_LENGTH = 10;

const EPSILON = 1e-4;


export default class Adjunction extends SNode {

	angle = DEFAULT_HOOK_ANGLE; // the angle of the 'harpoonhead's' hook
	length = DEFAULT_HOOK_LENGTH; // the length of that hook

    arrowheadEditHandler = {
        ...this.commonArrowheadEditHandler
    };

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
        return super.getArrowheadInfo();
    }

    override getArrowheadEditHandler(): Handler {
        return this.arrowheadEditHandler;
    }

    override getArrowheadShapes(): Shape[] {
        const adjustedLine = this.getAdjustedLine();
        const len = this.length;
        const a = this.angle;
        const { x3: p1x, y3: p1y } = adjustedLine;
        const [p2x, p2y] = travel([1], len, adjustedLine, -EPSILON, 1/EPSILON);
        let gamma: number;
        if (this.rigidPoint) {
            const [_, psi1] = this.findIncidenceAngles();
            gamma = psi1;
        }
        else {
            gamma = -angle(p1x, p1y, p2x, p2y, true);
        }
        const bx0 = len * Math.cos(gamma - a);
        const by0 = len * Math.sin(gamma - a);
        const bx1 = len * Math.cos(gamma + a);
        const by1 = len * Math.sin(gamma + a);
        
        return [
            {x0: p1x, y0: p1y, x1: p1x + bx0, y1: p1y - by0},
            {x0: p1x, y0: p1y, x1: p1x + bx1, y1: p1y - by1}
        ];
	}	

}