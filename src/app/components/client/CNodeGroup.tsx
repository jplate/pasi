import React, { useRef } from 'react'
//import assert from 'assert'
import Item, { HSL } from './items/Item.tsx'
import Node, { DEFAULT_LINEWIDTH, DEFAULT_DASH, DEFAULT_SHADING, LINECAP_STYLE, LINEJOIN_STYLE, MAX_LINEWIDTH, MAX_DASH_LENGTH, MAX_DASH_VALUE } from './items/Node.tsx'
import Group from './Group.tsx'
import { H, MARK_LINEWIDTH, MAX_X, MIN_X, MAX_Y, MIN_Y, ROUNDING_DIGITS } from './MainPanel.tsx'
import { DashValidator } from './EditorComponents.tsx'
import CNode, { MIN_DISTANCE_TO_NEXT_NODE_FOR_ARROW, CNodeComp } from './items/CNode.tsx'
import { MIN_ROTATION } from './ItemEditor'
import { CubicCurve, round, toBase64, fromBase64, getCyclicValue } from '../../util/MathTools.tsx'
import * as Texdraw from '../../codec/Texdraw.tsx'
import { ParseError, makeParseError } from '../../codec/Texdraw.tsx'
import { encode, decode } from '../../codec/Codec1.tsx'

const STANDARD_CONTOUR_HEIGHT = 80
const STANDARD_CONTOUR_WIDTH = 120
const STANDARD_CONTOUR_CORNER_RADIUS = 18
const CONTOUR_CENTER_DIV_WIDTH_RATIO = 0.2
const CONTOUR_CENTER_DIV_HEIGHT_RATIO = 0.2
const CONTOUR_CENTER_DIV_MIN_WIDTH = 7
const CONTOUR_CENTER_DIV_MIN_HEIGHT = 7
export const CONTOUR_CENTER_DIV_MAX_WIDTH = 40
export const CONTOUR_CENTER_DIV_MAX_HEIGHT = 40
const CONTOUR_CENTER_DIV_MARGIN = 4

export const DEFAULT_DISTANCE = 10
const BUMP_DISTANCE = 5 // the minimal distance that the CNodes of a NodeGroup can be brought together through dragging while fixedAngles is true
export const MAX_CNODEGROUP_SIZE = 500


export const angle = (x1: number, y1: number, x2: number, y2: number, inRadians: boolean = false): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const radians = Math.atan2(dy, dx);
    return inRadians? radians: radians * (180 / Math.PI);
}


export default class CNodeGroup implements Group<CNode> {

    members: CNode[];
    group: Group<Node | Group<any>> | null;
    isActiveMember: boolean;
    linewidth: number = DEFAULT_LINEWIDTH;
    linewidth100: number = DEFAULT_LINEWIDTH;
    shading: number = DEFAULT_SHADING;
    dash: number[] = DEFAULT_DASH;
    dash100: number[] = DEFAULT_DASH;

    dashValidator = new DashValidator(MAX_DASH_VALUE, MAX_DASH_LENGTH);

    readonly id: number;
    
    constructor(i: number, x?: number, y?: number) {
        this.id = i;
        this.group = null;
        this.isActiveMember = false;
        if (x!==undefined && y!==undefined) {
            const w = STANDARD_CONTOUR_WIDTH,
                h = STANDARD_CONTOUR_HEIGHT,
                r = STANDARD_CONTOUR_CORNER_RADIUS;
            this.members = [
                new CNode(`CN${i}/0`, x, y, 0, -45, this),
                new CNode(`CN${i}/1`, x+r, y-r, 45, 0, this),
                new CNode(`CN${i}/2`, x+w-r, y-r, 0, -45, this),
                new CNode(`CN${i}/3`, x+w, y, 45, 0, this),
                new CNode(`CN${i}/4`, x+w, y+h-2*r, 0, -45, this),
                new CNode(`CN${i}/5`, x+w-r, y+h-r, 45, 0, this),
                new CNode(`CN${i}/6`, x+r, y+h-r, 0, -45, this),
                new CNode(`CN${i}/7`, x, y+h-2*r, 45, 0, this)
            ];
        } else {
            this.members = [];
        }
    }

    /**
     * Copies values (excluding the members array and the group field) from the supplied sources, for those fields among 'linewidth', 'shading', 
     * 'dash', and 'isActiveMember' on which they all agree. The fields 'linewidth100' and 'dash100' are set to the resulting values of 
     * 'linewidth' and 'dash', respectively.
     */
    copyNonMemberValuesFrom(...sources: CNodeGroup[]) {
        if (sources.length > 0) {
            const keys: (keyof CNodeGroup)[] = ['linewidth', 'shading', 'dash', 'isActiveMember'];
            keys.forEach(<T extends keyof CNodeGroup>(key: T) => {
                const src0 = sources[0];
                if (sources.every(src => src[key]===src0[key])) {
                    (this as CNodeGroup)[key] = src0[key];
                } 
            });
        }
        this.linewidth100 = this.linewidth;
        this.dash100 = this.dash;
    }

    
    getLines = (): CubicCurve[] => {
        const n = this.members.length;
        return this.members.map((node, i) => getLine(node, this.members[i + 1 < n? i + 1: 0]));
    }

    /** Returns the bounds of this NodeGroup, taking into account also the control points of the various (non-omitted) lines connecting the nodes.
     */
    getBounds = (
        lines: CubicCurve[] = this.getLines(), 
    ): { minX: number, maxX: number, minY: number, maxY: number } => {
        const n = this.members.length;
        let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
        for (let i = 0; i < n; i++) {
            const line = lines[i];
            if (this.shading > 0 || !this.members[i].omitLine) {
                const mx = Math.min(line.x0, line.x1, line.x2, line.x3);
                const mX = Math.max(line.x0, line.x1, line.x2, line.x3);
                const my = Math.min(line.y0, line.y1, line.y2, line.y3);
                const mY = Math.max(line.y0, line.y1, line.y2, line.y3);
                if (mx < minX) minX = mx;
                if (mX > maxX) maxX = mX;
                if (my < minY) minY = my;
                if (mY > maxY) maxY = mY;
            }
        }
        return { minX, maxX, minY, maxY }
    }

    /** Returns the bounds of this NodeGroup, taking into account only the coordinates of its members.
     */
    getNodalBounds = () => {
        let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
        for (const m of this.members) {
            if (m.x < minX) minX = m.x;
            if (m.x > maxX) maxX = m.x;
            if (m.y < minY) minY = m.y;
            if (m.y > maxY) maxY = m.y;
        }
        return { minX, maxX, minY, maxY };
    }

    /** Returns the geometric center of this NodeGroup, i.e., the average of the locations of its members nodes.
     */
    getNodalCenter = () => {
        const n = this.members.length;
        let xSum = 0,
            ySum = 0;
        this.members.forEach(m => {
            xSum += m.x;
            ySum += m.y;
        });        
        return { x: xSum/n, y: ySum/n };
    }

    /**
     * Returns an array [w, h], with w and h being the width and height of the 'center div' for this group. The center div acts in part as an
     * alternative handle by which the group's nodes can be selected and moved around the canvas.
     */
    centerDivDimensions = () => {
        const { minX: nodalMinX, maxX: nodalMaxX, minY: nodalMinY, maxY: nodalMaxY } = this.getNodalBounds();
        const cdW = Math.min((nodalMaxX - nodalMinX) * CONTOUR_CENTER_DIV_WIDTH_RATIO, CONTOUR_CENTER_DIV_MAX_WIDTH);
        const cdH = Math.min((nodalMaxY - nodalMinY) * CONTOUR_CENTER_DIV_HEIGHT_RATIO, CONTOUR_CENTER_DIV_MAX_HEIGHT);
        return [cdW, cdH];
    }

    getString = () => `CNG${this.id}[${this.members.map(member => member.getString()+(member.isActiveMember? '(A)': '')).join(', ')}]`;

    /**
     * A function called in order to change the locations of one or more members. Member nodes that have the 'fixed Angles' property propagate their movement
     * to neighboring nodes.
     */
    groupMove = (nodes: CNode[], dx: number, dy: number) => {
        const members = this.members;
        const n = members.length;
        const bd = BUMP_DISTANCE;
        const dxs: number[] = new Array(n).fill(0);
        const dys: number[] = new Array(n).fill(0);
        nodes.forEach(node => {
            const index = members.indexOf(node);
            dxs[index] = dx;
            dys[index] = dy;
            if (node.fixedAngles) {
                let current: CNode,
                    x0, y0, cdx, cdy;
                for (const s of [-1, 1]) { 
                    // Starting from the current node, we propagate changes in both directions, as far as necessary. The changes are stored in the arrays dxs and dys.
                    current = node;
                    cdx = dx;
                    cdy = dy;

                    for (let i = 1; i<n && (cdx!==0 || cdy!==0); i++) { 
                        if (!current.fixedAngles) break;
                        x0 = current.x;
                        y0 = current.y;
                        const j = index + s*i;
                        const k = j<0? j+n: j>=n? j-n: j;
                        const next = members[k];
                        if (nodes.includes(next)) break;

                        if (x0==next.x) {
                            if ((y0<next.y && y0+cdy<next.y-bd) || (y0>next.y && y0+cdy>next.y+bd)) {
                                cdy = 0;
                            }
                            else if (y0<next.y) {
                                cdy = y0 + cdy - next.y + bd;
                            }
                            else if (y0>next.y) {
                                cdy = y0 + cdy - next.y - bd;
                            }
                        }
                        if (y0==next.y) {
                            if ((x0<next.x && x0+cdx<next.x-bd) || (x0>next.x && x0+cdx>next.x+bd)) {
                                cdx = 0;
                            }
                            else if (x0<next.x) {
                                cdx = x0 + cdx - next.x + bd;
                            }
                            else if (x0>next.x) {
                                cdx = x0 + cdx - next.x - bd;
                            }
                        }
                        dxs[k] = Math.abs(dxs[k])>Math.abs(cdx)? dxs[k]: cdx;
                        dys[k] = Math.abs(dys[k])>Math.abs(cdy)? dys[k]: cdy;
                        current = next;
                    }
                }
            }
        });
        // Apply the changes:
        if (members.every((m, i) => {
                const x = m.x + dxs[i];
                return x>=0 && x<=MAX_X
            })) {
            for (let i = 0; i<n; i++) {
                const m = members[i];
                m.x = m.x100 = m.x + dxs[i];
            }
        }
        if (members.every((m, i) => {
                const y = m.y + dys[i];
                return y>=MIN_Y && y<=MAX_Y
            })) {
            for (let i = 0; i<n; i++) {
                const m = members[i];
                m.y = m.y100 = m.y + dys[i];
            }
        }
    }


    equalizeCentralAngles = (node: CNode) => {
        const n = this.members.length;
        if (n<3) return; // Nothing to do if n is less than 3.
        const index = this.members.indexOf(node);
        if (index<0) {
            console.log('Illegal argument');
            return; 
        }

        const e = 10 ** -(ROUNDING_DIGITS+1);       
        const inc = 2*Math.PI/n;
        let newC = this.getNodalCenter(),
            c = newC;
        // Starting from focus, record the first two consecutive nodes that straddle the vertical center line. If n is even, then these two nodes will be placed symmetrically 
        // (as far as their central angles are concerned) with respect to this line, either above the center or below it, depending on where a straight line between the two nodes 
        // would cross the center line. If n is odd, then the first node will be placed directly above or below the center point.
        let p0 = node,
            p1 = p0, 
            i0 = index, 
            i1;
        for (let i = 1; i<n; i++) {
            const j = index + i;
            const k = j>=n? j-n: j;
            p1 = this.members[k];
            i1 = k;
            if ((p0.x<=c.x && p1.x>=c.x) || (p1.x<=c.x && p0.x>=c.x)) break;
            p0 = p1;
            i0 = i1;
        }
        // Compute the y-value of where a straight line from p0 to p1 would cross the center line:
        const dx = p0.x - p1.x;
        let crossing;
        if (dx !== 0) {
            const slope = (p0.y - p1.y) / dx;
            const yIntercept = p0.y - slope * p0.x;
            crossing = slope * c.x + yIntercept;
        }
        else {
            crossing = (p0.y + p1.y) / 2;
        }

        const dir = ((p0.x>c.x && crossing<c.y) || (p0.x<c.x && crossing>c.y))? -1: 1; // -1 means we're proceeding in a clockwise direction when arranging the nodes.
        const a0 = ((crossing>c.y? 1: -1) * Math.PI - (n%2!==0? 0: dir*inc)) / 2; // the starting angle

        do { // Adjusting angles can move the center. We'll repeat the process until the center stops moving by more than e.
            c = newC;
            for (let i = 0, angle = a0;
                i < n;
                i++, angle += dir*inc
            ) {
                const j = i0 + i;
                const k = j>=n? j-n: j;
                const m = this.members[k];
                const d = Math.sqrt((m.x - c.x) ** 2 + (m.y - c.y) ** 2);
                m.x = c.x + Math.cos(angle) * d;
                m.y = c.y + Math.sin(angle) * d;
            }

            newC = this.getNodalCenter();
        }
        while (Math.abs(newC.x-c.x)>e || Math.abs(newC.y-c.y)>e);

        // Finally, we round all coordinates to the nearest (e/10)th.
        const factor = 10 ** ROUNDING_DIGITS;
        this.members.forEach(m => {
            // We apply extra rounding because the division by factor can yield numbers that differ from the intended values by a tiny amount.
            m.x = m.x100 = round(Math.round(m.x * factor) / factor, ROUNDING_DIGITS);
            m.y = m.y100 = round(Math.round(m.y * factor) / factor, ROUNDING_DIGITS);
        });
    }


    equalizeDistancesFromCenter = (node: CNode) => {
        const n = this.members.length;
        if (n<3) return; // Nothing to do if n is less than 3.
       
        let c = this.getNodalCenter();
        const d = Math.sqrt((node.x - c.x) ** 2 + (node.y - c.y) ** 2);
        const factor = 10 ** ROUNDING_DIGITS;
        
        this.members.forEach(m => {
            const a = angle(c.x, c.y, m.x, m.y, true);
            m.x = m.x100 = round(Math.round((c.x + Math.cos(a) * d) * factor) / factor, ROUNDING_DIGITS);
            m.y = m.y100 = round(Math.round((c.y + Math.sin(a) * d) * factor) / factor, ROUNDING_DIGITS);
        });
    }


    getInfoString(): string {
        // The info string contains the following items, separated by semicolons and whitespace:
        // - A number (the 'index') indicating the first node from which a line is drawn, if any. If there is none, this will be zero.
        // - EITHER three strings, each of which is either (i) '*' or (ii) '~' or (iii) a base64-string, encoding the omitLine, fixedAngles, and isActiveMember properties, 
        //      respectively, of the contour nodes (where '*' represents an array of trues and '~' an array of falses),
        //   OR a string representing a number between 0 and 7 (inclusive), where each bit represents either an array of trues or an array of falses.
        // - And finally one or more comma-delimited lists containing geometrical information about the individual nodes.

        // We start by computing the index:
        let index = 0;
        if (this.linewidth > 0) { // If linewidth is zero, there will be no drawn lines, so index can be left at zero.
            let foundGap = false;
            for (let i = 0; i < this.members.length; i++) {
                const cn = this.members[i];
                if (!foundGap && cn.omitLine) {
                    foundGap = true;
                }
                if (foundGap && !cn.omitLine) {
                    index = i;
                    break;
                }
            }
        }
        const result: string[] = [];
        result.push(`${encode(index)}`);

        // Next, we construct and encode the three arrays of booleans:
        const keys: (keyof CNode)[] = ['omitLine', 'fixedAngles', 'isActiveMember'];
        const encodeArray = (array: boolean[]): boolean | string => 
            array.every(b => b)? true: 
            array.every(b => !b)? false: 
            toBase64(array);
        const flagReps: (boolean | string)[] = keys.map(key => encodeArray(this.members.map(m => m[key]) as boolean[]));
        if (flagReps.every(f => typeof f === 'boolean')) {
            let byte = 0;
            for (let i = 0; i < keys.length; i++) {
                byte <<= 1;
                if (flagReps[i]) {
                    byte |= 1;
                }
            }
            result.push(byte.toString());
        }
        else {
            result.push(...flagReps.map(f => typeof f === 'boolean'? (f? '*': '~'): f));
        }

        // Finally, we add the info strings for the individual members:
        const n = this.members.length;
        if (n > 0) {
            let prev = this.members[n - 1];
            for (let cn of this.members) {
                // We add information regarding the two angles angle0 and angle1, and the distances dist0 and dist1.
                // In two cases, we also have to add information regarding the node's coordinate: namely, if the shading and linewidth are both zero, and if 
                // the shading is zero and the lines both to and from this node are omitted.
                const info = [cn.angle0, cn.angle1, cn.dist0, cn.dist1];
                if (this.shading===0 && (this.linewidth===0 || (prev.omitLine && cn.omitLine))) {
                    info.push(cn.x, cn.y);
                }
                result.push(`${info.map(encode)}`);
                prev = cn;
            }
        }

        return result.join('; ');
    }

    getTexdrawCode(): string {
        const drawnLines: Texdraw.CubicCurve[] = [];
        const filledLines: Texdraw.CubicCurve[] = [];
        let foundGap = false;
        if (this.members.length > 0) {
            const initialSegment: Texdraw.CubicCurve[] = []; // This serves to optimize the output (a little bit) by making sure that, if any lines are omitted,
                // we start the path at the beginning (rather than the middle) of a run of non-omitted lines.
            let cn1 = this.members[0],
                cn2: CNode | undefined;
            foundGap = cn1.omitLine;
            for (let i = 1; i < this.members.length || cn2!==this.members[0]; i++) {
                cn2 = this.members[i < this.members.length? i: 0];
                const line = getLine(cn1, cn2);
                const curve = new Texdraw.CubicCurve(
                    new Texdraw.Point2D(line.x0, line.y0),
                    new Texdraw.Point2D(line.x1, line.y1),
                    new Texdraw.Point2D(line.x2, line.y2),
                    new Texdraw.Point2D(line.x3, line.y3)
                );
                if (!cn1.omitLine) {
                    if (!foundGap) {
                        initialSegment.push(curve);
                    }
                    else {
                        drawnLines.push(curve);
                    }                    
                }
                else {
                    foundGap = true;
                }
                filledLines.push(curve); // We always add the line to the 'filledLines' so as to get a complete filled shape (for the case that it does get filled).
                cn1 = cn2;
            }
            drawnLines.push(...initialSegment);
        }
        const shapeCommands = Texdraw.getCommandSequence(filledLines, drawnLines, foundGap, this.linewidth, this.dash, this.shading); 
        // If there are no drawnLines, then shapeCommands won't contain any information about linewidth and dash array. Similarly if the linewidth is zero. So, in these cases, 
        // we'll supply that information upfront:
        const result: string[] = []
        if (drawnLines.length===0 || this.linewidth===0) {
            result.push(Texdraw.linewd(this.linewidth));
            if (this.dash.length>0) {
                result.push(Texdraw.lpatt(this.dash), Texdraw.lpatt([]));
            }
        }
        result.push(shapeCommands);
        return result.join('');
    }


    parse(tex: string, info: string | null, dimRatio: number): void {
        if(info===null) {	        	
            throw new ParseError(<span>Incomplete definition of contour node group: info string required.</span>);
        }
        const stShapes = Texdraw.getStrokedShapes(tex, DEFAULT_LINEWIDTH);
        
        //console.log(`stroked shapes: ${stShapes.map(sh => sh.toString()).join(', ')}`);

        const paths: (Texdraw.CubicCurve | Texdraw.Path)[] = [];
        for(let i = 0; i<stShapes.length; i++) {
		    if(!(stShapes[i].shape instanceof Texdraw.CubicCurve) && !(stShapes[i].shape instanceof Texdraw.Path)) {
		        throw makeParseError(`Expected a curve/line sequence, not ${stShapes[i].shape.genericDescription}`, tex);
		    }
            paths.push(stShapes[i].shape as Texdraw.Path);
	    }
        
        const split = info.split(/\s*;\s*/);
        // The length of split should be at least 3: two numbers and at least one string representing a node.
        if (split.length < 3) {
            throw makeParseError(`Info string should contain at least 3 elements, found ${split.length}`, info);
        }
        // check if the second element represents a number between 0 and 7 (in which case this element will be taken to represent three bits representing boolean arrays):
        const arraysAsNum = split[1].match(/^[0-7]$/)!==null;
        const firstNodeIndex = arraysAsNum? 2: 4;
        const n = split.length - firstNodeIndex; // What we'll take to be the number of nodes.
 
        // Extract the boolean arrays:
        const m = 3; // the number of arrays encoded in the second element, if they are in fact encoded in this way
        const arraysFromNum = new Array<boolean[]>(m);
        if (arraysAsNum) {
            const num = parseInt(split[1]);
            for (let i = 0; i < m; i++) {
                const bit = (num & (1 << (m - i - 1))) !== 0;
                arraysFromNum[i] = Array(n).fill(bit);
            }            
        }        
        const [omitLine, fixedAngles, activeMember] = arraysAsNum? arraysFromNum: 
            split.slice(1, firstNodeIndex).map(s => {
                let result: boolean[];
                switch (s) {
                    case '*': result = Array(n).fill(true); break;
                    case '~': result = Array(n).fill(false); break;
                    default: result = fromBase64(s);
                }
                if (result.length < n) {
                    throw new ParseError(<span>Corrupt data in definition of contour node group: array length does not match number of nodes ({n}).</span>);
                }
                return result;
            });
        
        // Extract information about the fill level and the start index for decoding node information:
        const fillLevel = stShapes.length>0? (stShapes[0].shape as Texdraw.CubicCurve | Texdraw.Path).fillLevel: 0;
        if (fillLevel < 0) {
            throw new ParseError(<span>Illegal data in definition of contour node group: shading value should not be negative.</span>);
        }
        else if (fillLevel > 1) {
            throw new ParseError(<span>Illegal data in definition of contour node group: shading value {fillLevel} exceeds 1.</span>);
        }
        this.shading = fillLevel;
        const index = fillLevel===0? decode(split[0]): 0; // If fillLevel is non-zero, we'll use the curves of the filled-in Path rather than those (if any) that
            // are used for drawing the outline, and those curves start with the first node. (I.e., the information given by the first one of those curves,
            // and more particularly its starting point, is relevant to the first node rather than any later ones.) So, in that case, we'll use an index of zero.
        if (isNaN(index)) {
            throw makeParseError('Unexpected token in configuration data for contour node group', split[0]);
        }
        else if (index >= n) {
            throw new ParseError(`Specified index out of bounds: ${index}.`);
        }

        // Extract information about linewidth and dash pattern:
        if (stShapes.length==0) {
            this.linewidth = this.linewidth100 = dimRatio * Texdraw.extractLinewidth(tex);
            this.dash = this.dash100 = Texdraw.extractDashArray(tex) || [];
        }
        else {
            const stroke = stShapes[stShapes.length - 1].stroke;
            this.linewidth = this.linewidth100 = dimRatio * stroke.linewidth;
            this.dash = this.dash100 = stroke.pattern.map(v => dimRatio * v);
        }
        if (this.linewidth < 0) {
            throw new ParseError(<span>Illegal data in definition of contour node group: line width should not be negative.</span>);
        }
        else if (this.linewidth > MAX_LINEWIDTH) {
            throw new ParseError(<span>Illegal data in definition of contour node group: line width {this.linewidth} exceeds maximum value.</span>);
        }
        if (this.dash.length > MAX_DASH_LENGTH) {
            throw new ParseError(<span>Illegal data in definition of contour node group: dash array length {this.dash.length} exceeds maximum value.</span>); 
        }
        if (this.dash.some(v => v < 0)) {
            throw new ParseError(<span>Illegal data in definition of contour node group: dash value should not be negative.</span>); 
        }        
        let val;
        if (this.dash.some(v => (val = v) > MAX_DASH_VALUE)) {
            throw new ParseError(<span>Illegal data in definition of contour node group: dash value {val} exceeds  maximum value.</span>); 
        }

        // We now have to create and configure the individual nodes, and add them as members, to replace any old ones:
        this.members = new Array<CNode>(n);
        const coordinateIndex = 4; // This indicates where to find the x-coordinate info in the config array for an individual node.
        const curves = (fillLevel > 0? // Construct the array of curves from which we'll get information about the coordinates of our nodes:
            (stShapes[0].shape instanceof Texdraw.Path? stShapes[0].shape.shapes: [stShapes[0].shape]):
            stShapes.flatMap(sh => sh.shape instanceof Texdraw.Path? sh.shape.shapes: [sh.shape])) as Texdraw.CubicCurve[];
        let curveIndex = 0,
            lookingAtEndPoint = false,
            prevOmit = omitLine[index===0? n - 1: index - 1];
        for (let i = 0; i < n; i++) {
            const j = index + i;
            const k = j >= n? j - n: j;
            
            const nodeInfoString = split[firstNodeIndex + k];
            const nodeInfo = nodeInfoString.split(/\s*,\s*/); // the info array for the current node
            
            let x, 
                y;
            // If either (i) fillLevel and linewidth are both zero or (ii) fillLevel is zero and and the lines from the previous node and to the next are 
            // both omitted, then we try to get the coordinates from the info array:
            if (fillLevel===0 && (this.linewidth===0 || (prevOmit && omitLine[k]))) {
                if (nodeInfo.length < coordinateIndex + 2) {
                    throw makeParseError('Incomplete configuration string for contour node', nodeInfoString);
                }
                [x, y] = nodeInfo.slice(coordinateIndex).map(s => {
                    const val = decode(s);
                    if (!isFinite(val)) {
                        throw makeParseError('Unexpected token in contour node configuration string', s);
                    }
                    return round(dimRatio * decode(s), Texdraw.ROUNDING_DIGITS);
                });
            }
            else {
                const curve = curves[curveIndex];
                const { x: rawX, y: rawY } = lookingAtEndPoint? curve.getEndPoint(): curve.getStartingPoint();
                [x, y] = [rawX, rawY].map(v => round(dimRatio * v, Texdraw.ROUNDING_DIGITS));
                if (lookingAtEndPoint || fillLevel > 0) {
                    curveIndex++;
                }
            }
            if (fillLevel===0) { /* If fillLevel is not zero, then all the curves should be present in the texdraw code (whether or not they are 
                    'omitted'), and so we should keep looking at their starting points, rather than to switch back and forth between start and end points.
                    On the other hand, if fillLevel *is* zero, then we *do* have to switch back and forth, because the information in the code may
                    not be redundant. So we have to start by looking at the starting point of whatever curve curveIndex points to, and then switch to 
                    looking at its end point, since there may not be a next curve. And having looked at the end point of one curve, we then have to switch back 
                    to looking at the starting point of the next (if there is one), and this next curve may not come up for a while. (For even though
                    curveIndex has already advanced and points to the next curve, we won't look at it until we know from our data that its turn has come.) 
                    However, if this next curve is the one *immediately* after the present one -- which will be the case if the line to the next node is 
                    not 'omitted' -- then we won't look at its starting point but again only at its end point, because then there will be redundancy after all. */
                lookingAtEndPoint = !omitLine[k];
            }
            prevOmit = omitLine[k];

            if (x < MIN_X) {
                throw new ParseError(<span>Illegal configuration data for contour node: X-coordinate {x} below minimum value.</span>); 
            }
            else if (x > MAX_X) {
                throw new ParseError(<span>Illegal configuration data for contour node: X-coordinate {x} exceeds maximum value.</span>); 
            }            
            if (y < MIN_Y) {
                throw new ParseError(<span>Illegal configuration data for contour node: Y-coordinate {y} below minimum value.</span>); 
            }
            else if (y > MAX_Y) {
                throw new ParseError(<span>Illegal configuration data for contour node: Y-coordinate {y} exceeds maximum value.</span>); 
            }
    
            let [a0, a1, d0, d1] = nodeInfo.slice(0, coordinateIndex).map(s => {
                const val = decode(s);
                if (!isFinite(val)) {
                    throw makeParseError('Unexpected token in contour node configuration string', s);
                }
                return val;
            });
            a0 = getCyclicValue(a0, MIN_ROTATION, 360, Texdraw.ROUNDING_DIGITS);
            a1 = getCyclicValue(a1, MIN_ROTATION, 360, Texdraw.ROUNDING_DIGITS);
            d0 = round(dimRatio * d0, Texdraw.ROUNDING_DIGITS);
            d1 = round(dimRatio * d1, Texdraw.ROUNDING_DIGITS);

            // We could try to 'validate' d0 and d1, too, but there is no real point in doing so, since very high or low values wouldn't break anything in this case.

            const cn = new CNode(`CN${this.id}/${k}`, x, y, a0, a1, this);
            cn.dist0 = cn.dist0_100 = d0;
            cn.dist1 = cn.dist1_100 = d1;

            cn.fixedAngles = fixedAngles[k];
            cn.omitLine = omitLine[k];
            cn.isActiveMember = activeMember[k];

            this.members[k] = cn;
        }
    }
}


export const getLine = (node0: CNode, node1: CNode): CubicCurve => {
    const a0 = (angle(node0.x, node0.y, node1.x, node1.y) + node0.angle1) * Math.PI / 180;
    const a1 = (angle(node1.x, node1.y, node0.x, node0.y) + node1.angle0) * Math.PI / 180;
    return {
        x0: node0.x, y0: node0.y, 
        x1: node0.x + Math.cos(a0)*node0.dist1, y1: node0.y + Math.sin(a0)*node0.dist1, 
        x2: node1.x + Math.cos(a1)*node1.dist0, y2: node1.y + Math.sin(a1)*node1.dist0,
        x3: node1.x, y3: node1.y
    }
}


export interface ContourProps {
    id: string
    group: CNodeGroup
    yOffset: number
    bg: HSL
    primaryColor: HSL
    markColor: string
    centerDivClickable: boolean
    showCenterDiv: boolean
    onMouseDown: (group: CNodeGroup, e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onMouseEnter: (group: CNodeGroup, e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onMouseLeave: (group: CNodeGroup, e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>) => void
}

export const Contour = ({ id, group, yOffset, bg, primaryColor, markColor, centerDivClickable, showCenterDiv,
        onMouseDown, onMouseEnter, onMouseLeave 
    }: ContourProps
) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const linewidth = group.linewidth;
    const shading = group.shading;
    const dash = group.dash;
    const lines = group.getLines();
    if (lines.length>0) {
        const { minX, maxX, minY, maxY } = group.getBounds();
        if (!isFinite(minX)) return null;
        const h = maxY-minY;
        const lwc = linewidth / 2; // linewidth correction
        const mlw = MARK_LINEWIDTH;
        const mlw2 = mlw / 2;

        const linePath = `M ${lines[0].x0-minX+lwc} ${h-lines[0].y0+minY+lwc} ` + 
            lines.map((line, i) => 
                group.members[i].omitLine?
                `M ${line.x3-minX+lwc} ${h-line.y3+minY+lwc} `:
                `C ${line.x1-minX+lwc} ${h-line.y1+minY+lwc}, ${line.x2-minX+lwc} ${h-line.y2+minY+lwc}, ${line.x3-minX+lwc} ${h-line.y3+minY+lwc}`).join(' ');

        const fillPath = `M ${lines[0].x0-minX+lwc} ${h-lines[0].y0+minY+lwc} ` + 
            lines.map((line, i) => 
                `C ${line.x1-minX+lwc} ${h-line.y1+minY+lwc}, ${line.x2-minX+lwc} ${h-line.y2+minY+lwc}, ${line.x3-minX+lwc} ${h-line.y3+minY+lwc}`).join(' ');
        
        const [cdW, cdH] = group.centerDivDimensions();
        const c = group.getNodalCenter();

        return (
            <>
                <div id={id} style={{
                        position: 'absolute',
                        left: `${minX - lwc}px`,
                        top: `${H + yOffset - maxY - lwc}px`,
                        pointerEvents: 'none'
                    }}>
                    <svg ref={svgRef} width={maxX - minX + 2*linewidth + 1} height={maxY - minY + 2*linewidth + 1} xmlns="http://www.w3.org/2000/svg" 
                            pointerEvents={shading>0? 'fill': 'none'}>
                        {shading > 0 && 
                            <path d={fillPath}  
                                onMouseDown={(e) => onMouseDown(group, e)}
                                onMouseEnter={(e) => onMouseEnter(group, e)}
                                onMouseLeave={(e) => onMouseLeave(group, e)}
                                fill={shading==0? 'hsla(0,0%,0%,0)': // Otherwise we assmilate the background color to the primary color, to the extent that shading approximates 1.
                                    `hsla(${bg.hue - Math.floor((bg.hue - primaryColor.hue) * shading)},` +
                                    `${bg.sat - Math.floor((bg.sat - primaryColor.sat) * shading)}%,` +
                                    `${bg.lgt - Math.floor((bg.lgt - primaryColor.lgt) * shading)}%,1)`}
                                stroke='none' />
                        }
                        {linewidth > 0 &&
                            <path d={linePath}  
                                fill='none'
                                stroke={`hsl(${primaryColor.hue},${primaryColor.sat}%,${primaryColor.lgt}%)`}
                                strokeWidth={linewidth}
                                strokeDasharray={dash.join(' ')} 
                                strokeLinecap={LINECAP_STYLE}
                                strokeLinejoin={LINEJOIN_STYLE} />
                        }
                    </svg>
                </div>
                {cdW >= CONTOUR_CENTER_DIV_MIN_WIDTH && cdH >= CONTOUR_CENTER_DIV_MIN_HEIGHT && 
                    <div className={showCenterDiv? 'selected': 'unselected'}
                            onMouseDown={(e) => onMouseDown(group, e)}
                            onMouseEnter={(e) => onMouseEnter(group, e)}
                            onMouseLeave={(e) => onMouseLeave(group, e)}
                            style={{                
                                position: 'absolute',
                                left: `${c.x - cdW/2 - mlw2}px`,
                                top: `${H + yOffset - c.y - cdH/2 - mlw2}px`,
                                cursor: centerDivClickable? 'pointer': 'auto',
                                pointerEvents: centerDivClickable? 'auto': 'none'
                        }}>
                        <svg width={cdW + mlw + 1} height={cdH + mlw + 1} opacity={0.5}> {/* The '+ 1' provides a bit of safety.*/}
                            <polyline points={`${mlw2},${mlw2} ${cdW+mlw2},${mlw2} ${cdW+mlw2},${cdH+mlw2} ${mlw2},${cdH+mlw2} ${mlw2},${mlw2} ${3},${mlw2}`}  
                                stroke={markColor} fill='none' />
                        </svg>
                    </div>
                }
            </>
        );
    }
    else return null
}

interface CNodeGroupCompProps {
    id: number
    nodeGroup: CNodeGroup
    focusItem: Item | null
    preselection: Item[]
    selection: Item[]
    allItems: Item[]
    yOffset: number
    unitscale: number
    displayFontFactor: number
    bg: HSL
    primaryColor: HSL
    markColor: string
    itemMouseDown: (
        item: Item, 
        e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>, 
        clearPreselection?: boolean
    ) => void
    itemMouseEnter: (item: Item, e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
    groupMouseDown: (group: CNodeGroup, e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>) => void
    groupMouseEnter: (group: CNodeGroup, e: React.MouseEvent<HTMLDivElement, MouseEvent> | React.MouseEvent<SVGPathElement, MouseEvent>) => void
    mouseLeft: () => void
}

export const CNodeGroupComp = ({ nodeGroup, focusItem, preselection, selection, allItems, yOffset, unitscale, displayFontFactor, bg, primaryColor, markColor, 
        itemMouseDown, itemMouseEnter, groupMouseDown, groupMouseEnter, mouseLeft }: CNodeGroupCompProps) => {
    const centerDivClickable = !allItems.some(item => {
        const c = nodeGroup.getNodalCenter(); // the location of the center div
        const [cdW, cdH] = nodeGroup.centerDivDimensions();
        const w2 = item.getWidth() / 2;
        const h2 = item.getHeight() / 2;
        const { bottom, left } = item.getBottomLeftCorner();
        const icx = left + w2;
        const icy = bottom + h2;
        // Return true iff the item is just about covered by the center div:
        return Math.abs(c.x - icx) + w2 < cdW/2 + CONTOUR_CENTER_DIV_MARGIN && 
            Math.abs(c.y - icy) + h2 < cdH/2 + CONTOUR_CENTER_DIV_MARGIN;
    });
    // Space permitting, we arrange for one or more of the CNodeComps to be decorated by an arrow that will give the user an idea of what is meant by 
    // 'next node' and 'previous node' in the tooltips and elsewhere in the UI. But, to avoid clutter, only one CNodeComp per run of selected or preselected 
    // nodes should be decorated in this way.
    let allSelected = true,
        someSelected = false,
        allPreselected = true;
    const selectedNodes = nodeGroup.members.map(m => {
        if (selection.includes(m)) return someSelected = true;
        else return allSelected = false;
    });
    const preselectedNodes = nodeGroup.members.map(m => {
        if (preselection.includes(m)) return true;
        else return allPreselected = false
    });
    const last = nodeGroup.members.length-1;
    const arrowNodes: boolean[] = new Array(last+1).fill(false);
    let defer = false;
    for (let i = 0; i<=1 && (i==0 || defer); i++) {
        for (let j = 0; j<=last && (i==0 || defer); j++) {
            const node = nodeGroup.members[j];
            const selected = selectedNodes[j];
            const preselected = preselectedNodes[j];
            const next = nodeGroup.members[j==last? 0: j+1];
            const d = Math.sqrt((node.x - next.x) ** 2 + (node.y - next.y) ** 2);                            
            const arrow = (selected && (defer || (allSelected && j==0) || (!allSelected && !selectedNodes[j==0? last: j-1]))) ||
                (preselected && (defer || (!someSelected && allPreselected && j==0) || (!allPreselected && !preselectedNodes[j==0? last: j-1])));
            if (arrow && d<MIN_DISTANCE_TO_NEXT_NODE_FOR_ARROW) {
                defer = true;
            }
            else {
                defer = false;
            }
            arrowNodes[j] = arrow && !defer;
        }
    }
    return (
        <React.Fragment key={nodeGroup.id}>
            <Contour id={nodeGroup.id+'Contour'} group={nodeGroup} yOffset={yOffset} 
                bg={bg} 
                primaryColor={primaryColor} 
                markColor={markColor} 
                centerDivClickable={centerDivClickable}
                showCenterDiv={focusItem instanceof CNode && focusItem.fixedAngles && nodeGroup.members.includes(focusItem)}
                onMouseDown={groupMouseDown}
                onMouseEnter={groupMouseEnter} 
                onMouseLeave={(group, e) => mouseLeft()} />
            {nodeGroup.members.map((node, i) => {
                return <CNodeComp key={node.id} id={node.id} cnode={node} 
                    yOffset={yOffset} 
                    unitscale={unitscale}
                    displayFontFactor={displayFontFactor}
                    primaryColor={primaryColor}
                    markColor={markColor}
                    focusItem={focusItem}
                    selected={selectedNodes[i]}
                    preselected={preselectedNodes[i]}
                    selection={selection}
                    preselection={preselection}
                    arrow={arrowNodes[i]}
                    onMouseDown={itemMouseDown}
                    onMouseEnter={itemMouseEnter} 
                    onMouseLeave={(item, e) => mouseLeft()} />
            })}
        </React.Fragment>
    );
}
