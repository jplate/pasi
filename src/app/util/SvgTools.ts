import { HSL } from '@/app/components/client/items/Item';

export type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

export const SVG_ROUNDING_DIGITS = 3;

/**
 * Rounds to the nearest (10^-digits)th. (Unlike MathTools.round(), this function rounds unconditionally, which keeps the
 * generated SVG code compact.)
 */
export const roundSvg = (n: number, digits: number = SVG_ROUNDING_DIGITS): number => {
    const factor = 10 ** digits;
    return Math.round(n * factor) / factor;
};

/**
 * Formats a number for inclusion in SVG code.
 */
export const fSvg = (n: number): string => String(roundSvg(n));

export const svgHsl = (color: HSL): string => `hsl(${color.hue},${color.sat}%,${color.lgt}%)`;

/**
 * Returns the fill color for a shaded Node or CNodeGroup: the background color assimilated to the primary color to the extent that
 * shading approaches 1. This mirrors how shading is displayed on the canvas.
 */
export const svgShadingFill = (bg: HSL, primaryColor: HSL, shading: number): string =>
    `hsla(${bg.hue - Math.floor((bg.hue - primaryColor.hue) * shading)},` +
    `${bg.sat - Math.floor((bg.sat - primaryColor.sat) * shading)}%,` +
    `${bg.lgt - Math.floor((bg.lgt - primaryColor.lgt) * shading)}%,1)`;

/**
 * Returns the fill color for a shaded element in *exported* SVG code: an opaque blend of currentColor into the background color,
 * to the extent that shading approaches 1. Since an SVG element cannot see the background it is drawn on, the background color is
 * taken from the CSS custom property --pasi-background, which the embedding document may set; it defaults to the Canvas system
 * color (the document's default background, respecting color-scheme).
 */
export const svgShadingBlend = (shading: number): string =>
    `color-mix(in hsl, currentColor ${fSvg(shading * 100)}%, var(--pasi-background, Canvas))`;

export const escapeSvgText = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const mergeBounds = (b0: Bounds | null, b1: Bounds | null): Bounds | null => {
    if (!b0) return b1;
    if (!b1) return b0;
    return {
        minX: Math.min(b0.minX, b1.minX),
        maxX: Math.max(b0.maxX, b1.maxX),
        minY: Math.min(b0.minY, b1.minY),
        maxY: Math.max(b0.maxY, b1.maxY),
    };
};

export const isValidBounds = (b: Bounds): boolean =>
    isFinite(b.minX) && isFinite(b.maxX) && isFinite(b.minY) && isFinite(b.maxY);
