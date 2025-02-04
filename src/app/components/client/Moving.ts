import type { Info, Handler } from './items/Item';
import Node, { getDependents } from './items/Node';
import CNodeGroup from './CNodeGroup';
import { MAX_X, MIN_Y, MAX_Y, MIN_TRANSLATION_LOG_INCREMENT } from '@/app/Constants';
import { parseInputValue } from './EditorComponents';

/**
 * Moves the nodes in the specified array (but only those whose locations do not depend on those of any others in the array) by the specified amounts.
 */
export const move = (nodes: Node[], dx: number, dy: number) => {
    const dependents = new Set<Node>();
    for (const node of nodes) {
        getDependents(node, false, dependents);
    }
    // Filter out the nodes that are dependent on any others that have to be moved, to avoid unnecessary computation:
    const toMove = nodes.filter((n) => !dependents.has(n));
    const nodeGroups: CNodeGroup[] = []; // To keep track of the node groups whose members we've already moved.
    toMove.forEach((node) => {
        // console.log(`moving: ${item.id}`);
        if (node.group instanceof CNodeGroup) {
            if (!nodeGroups.includes(node.group)) {
                nodeGroups.push(node.group);
                const members = node.group.members;
                (node.group as CNodeGroup).groupMove(
                    members.filter((m) => toMove.includes(m)),
                    dx,
                    dy
                );
            }
        } else if (node instanceof Node) {
            node.move(dx, dy);
        }
    });
};

export const getCoordinateHandler = (node: Node): Handler => ({
    x: ({ e, logIncrement, selection }: Info) => {
        if (e) {
            const dmin = -(selection.filter((item) => item instanceof Node) as Node[]).reduce(
                (min, item) => (min < item.x ? min : item.x),
                node.x
            );
            const delta =
                parseInputValue(
                    e.target.value,
                    0,
                    MAX_X,
                    node.x,
                    logIncrement,
                    Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)
                ) - node.x;
            const dx = delta > dmin ? delta : 0; // this is to avoid items from being moved beyond the left border of the canvas
            return [
                (_item, array) => {
                    if (dx !== 0) {
                        move(
                            selection.filter((it) => it instanceof Node),
                            dx,
                            0
                        );
                    }
                    return array;
                },
                'onlyThis',
            ];
        }
    },
    y: ({ e, logIncrement, selection }: Info) => {
        if (e) {
            const dy =
                parseInputValue(
                    e.target.value,
                    MIN_Y,
                    MAX_Y,
                    node.y,
                    logIncrement,
                    Math.max(0, -MIN_TRANSLATION_LOG_INCREMENT)
                ) - node.y;
            return [
                (_item, array) => {
                    if (!isNaN(dy) && dy !== 0) {
                        move(
                            selection.filter((it) => it instanceof Node),
                            0,
                            dy
                        );
                    }
                    return array;
                },
                'onlyThis',
            ];
        }
    },
});
