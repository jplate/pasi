import { MIN_DISTANCE, MAX_DISTANCE } from './Node'
import { Info, Handler } from './ENode'
import SNode from './SNode'
import { Entry, MAX_ROTATION_INPUT, MIN_ROTATION } from '../ItemEditor'
import { Shape, angle, travel, getCyclicValue } from '../../../util/MathTools'
import { parseInputValue, parseCyclicInputValue } from '../EditorComponents'
import { MIN_TRANSLATION_LOG_INCREMENT, ROUNDING_DIGITS } from '../../../Constants'


export const DEFAULT_W0 = 8;
export const DEFAULT_W1 = 8;
export const DEFAULT_WC = 8;

export const DEFAULT_HOOK_ANGLE = 22.5;
export const DEFAULT_HOOK_LENGTH = 10;

const EPSILON = 1e-4;


export default class Adjunction extends SNode {

	hookAngle = DEFAULT_HOOK_ANGLE; // the angle (in degrees) of the 'harpoonhead's' hook
	hookLength = DEFAULT_HOOK_LENGTH; // the length of that hook

    arrowheadEditHandler: Handler = {
        ...this.commonArrowheadEditHandler,
        hookAngle: ({ e }: Info) => {
            if (e) {
                const delta = parseCyclicInputValue(e.target.value, this.hookAngle, 0)[1]; 
                return [(item, array) => {
                    if(!isNaN(delta) && delta!==0 && item instanceof Adjunction) {
                        item.hookAngle = getCyclicValue(item.hookAngle + delta, MIN_ROTATION, 360, 10 ** ROUNDING_DIGITS);
                    }
                    return array
                }, 'ENodesAndCNodeGroups']
        }},
        hookLength: ({ e }: Info) => {
            if (e) {
                const d = parseInputValue(e.target.value, MIN_DISTANCE, MAX_DISTANCE, this.hookLength, 
                    0, Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)) - this.hookLength;
                return [(item, array) => {
                    if (!isNaN(d) && d!==0 && item instanceof Adjunction) {
                        item.hookLength += d;   
                    }
                    return array
                }, 'ENodesAndCNodeGroups']
            }
        },
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
        return [
            ...super.getArrowheadInfo(),
            {type: 'number input', key: 'hookAngle', text: 'Hook angle', width: 'long', value: this.hookAngle, step: 0, 
                min: -MAX_ROTATION_INPUT, max: MAX_ROTATION_INPUT,
                tooltip: <>The angle (in degrees) by which the arrowhead&rsquo;s hook deviates from the center line.</>,
                tooltipPlacement: 'left'
            },
            {type: 'number input', key: 'hookLength', text: 'Hook length', width: 'long', value: this.hookLength, step: 0,
                tooltip: <>The length of the arrowhead&rsquo;s hook.</>,
                tooltipPlacement: 'left'
            },
        ];
    }

    override getArrowheadEditHandler(): Handler {
        return this.arrowheadEditHandler;
    }

    override getArrowheadShapes(): Shape[] {
        const adjustedLine = this.getAdjustedLine();
        const len = this.hookLength;
        const a = this.hookAngle / 180 * Math.PI;
        const { x3: p1x, y3: p1y } = adjustedLine;
        const [p2x, p2y] = travel([1], len, adjustedLine, -EPSILON, 1/EPSILON);
        let gamma: number;
        if (this.rigidPoint) {
            const [_, psi1] = this.findIncidenceAngles();
            gamma = psi1;
        }
        else {
            gamma = angle(p1x, p1y, p2x, p2y, true);
        }
        const bx0 = len * Math.cos(gamma - a);
        const by0 = len * Math.sin(gamma - a);
        const bx1 = len * Math.cos(gamma + a);
        const by1 = len * Math.sin(gamma + a);
        
        return [
            {x0: p1x, y0: p1y, x1: p1x + bx0, y1: p1y + by0},
            {x0: p1x, y0: p1y, x1: p1x + bx1, y1: p1y + by1}
        ];
	}	

}