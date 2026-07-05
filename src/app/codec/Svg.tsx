import ENode from '@/app/components/client/items/ENode';
import GNode from '@/app/components/client/items/GNode';
import CNodeGroup from '@/app/components/client/CNodeGroup';
import Ornament from '@/app/components/client/items/Ornament';
import { HSL } from '@/app/components/client/items/Item';
import { Bounds, fSvg, mergeBounds } from '@/app/util/SvgTools';

export const SVG_MARGIN = 5; // the margin (in pixels) around the diagram's contents

/**
 * @return the SVG code representing the supplied list of ENodes and CNodeGroups, mirroring how they are displayed on the canvas.
 * GNodes ('ghost nodes') are excluded, but their Ornaments are not. The coordinates of the generated SVG elements are obtained by
 * translating the canvas coordinates of the individual items into the coordinate system of the generated SVG element, whose bounds
 * are computed so as to cover (with a small margin) exactly the visible items.
 */
export const getSvgCode = (
    list: (ENode | CNodeGroup)[],
    primaryColor: HSL,
    bg: HSL,
    unitScale: number,
    displayFontFactor: number
): string => {
    // First, we collect the nodes and ornaments to be drawn, in the same Z-order in which they appear on the canvas
    // (GNode ornaments float above everything else):

    const drawn: (ENode | CNodeGroup | Ornament)[] = [];
    const gNodeOrnaments: Ornament[] = [];
    for (const it of list) {
        if (it instanceof GNode) {
            gNodeOrnaments.push(...it.ornaments);
        } else if (it instanceof ENode) {
            drawn.push(it, ...it.ornaments);
        } else {
            drawn.push(it);
            it.members.forEach((m) => drawn.push(...m.ornaments));
        }
    }
    drawn.push(...gNodeOrnaments);

    // Next, we compute the bounds (in canvas coordinates) of the diagram's visible contents:

    const bounds = drawn.reduce((acc: Bounds | null, it) => mergeBounds(acc, it.getSvgBounds()), null);
    if (!bounds) return '';

    // Finally, we generate the SVG code, translating all coordinates into the coordinate system of the generated SVG element:

    const transX = (x: number) => x - bounds.minX + SVG_MARGIN;
    const transY = (y: number) => bounds.maxY - y + SVG_MARGIN;
    const width = fSvg(bounds.maxX - bounds.minX + 2 * SVG_MARGIN);
    const height = fSvg(bounds.maxY - bounds.minY + 2 * SVG_MARGIN);

    const elements = drawn
        .map((it) =>
            it instanceof Ornament
                ? it.getSvg(transX, transY, primaryColor, unitScale, displayFontFactor)
                : it.getSvg(transX, transY, primaryColor, bg)
        )
        .filter((s) => s.length > 0)
        .join('\n')
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n');

    return [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
        elements,
        '</svg>',
    ].join('\n');
};
