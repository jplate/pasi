export const H = 650; // the height of the canvas; needed to convert screen coordinates to Tex coordinates
export const CANVAS_WIDTH_BASE = 850; // the 'standard' width of the canvas
export const CANVAS_WIDTH_LARGE = 1000; // the width of the canvas for larger screens
export const CANVAS_WIDTH_THRESHOLD = 1536; // the minimum screen size for using the wider canvas width
export const MAX_X = 32 * CANVAS_WIDTH_BASE - 1; // the highest possible X coordinate for an Item
export const MIN_X = 0; // the lowest possible X coordinate for an Item
export const MIN_Y = -16 * H + 1; // the lowest possible Y coordinate for an Item
export const MAX_Y = 16 * H - 1; // the highest possible Y coordinate for an Item
export const MARGIN = 0; // the width of the 'margin' at right and bottom edges of the canvas
export const MARK_LINEWIDTH = 1.0; // the linewidth of the border drawn around selected Items

export const MIN_ROTATION = -180;
export const MIN_ROTATION_LOG_INCREMENT = -3;
export const MAX_ROTATION_LOG_INCREMENT = 2;
export const MIN_SCALING_LOG_INCREMENT = -3;
export const MAX_SCALING_LOG_INCREMENT = 3;
export const MAX_ROTATION_INPUT = 360 + 10 ** MAX_ROTATION_LOG_INCREMENT;
export const MIN_TRANSLATION_LOG_INCREMENT = -3;
export const MAX_TRANSLATION_LOG_INCREMENT = 2;
export const DEFAULT_TRANSLATION_LOG_INCREMENT = 0;
export const DEFAULT_ROTATION_LOG_INCREMENT = 1;
export const DEFAULT_SCALING_LOG_INCREMENT = 1;

export const MAX_HISTORY = 100; // maximum length of history
export const ROUNDING_DIGITS = 3; // used for rounding values resulting from rotations of points, etc.
