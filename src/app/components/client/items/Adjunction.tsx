import SNode from './SNode'

export const DEFAULT_W0 = 8;
export const DEFAULT_W1 = 8;
export const DEFAULT_WC = 8;


export default class Adjunction extends SNode {

    getDefaultW0() {
		return DEFAULT_W0;
	}

	getDefaultW1() {
		return DEFAULT_W1;
	}
    
	getDefaultWC() {
		return DEFAULT_WC;
	}    

}