import React from 'react';

import Item from './items/Item';
import { getGroups } from './Group';
import { BasicColoredButton } from './Button';
import { HotkeyComp } from './Hotkeys';

const createTooltip = (
    <>
        Creates a new group that contains all selected items (or, where applicable, the highest among their
        respective &lsquo;active&rsquo; groups that are also such that all their leaf members are selected),
        and removes these from their current groups.
        <HotkeyComp mapKey='create group' />
    </>
);

const leaveTooltip = (
    <>
        Deactivates the membership of each selected item (or of its second-highest active group, where
        applicable) in its currently highest active group. Items will still be members of their respective
        groups, but selecting them will no longer select the other members as well.
        <HotkeyComp mapKey='leave' />
    </>
);

const rejoinTooltip = (
    <>
        Reactivates the membership of the each selected item (or its highest active group, where applicable)
        in the next-lowest group. <HotkeyComp mapKey='rejoin' />
    </>
);

const restoreTooltip = (
    <>
        Reactivates the membership of each member of each selected item&apos;s highest active group.
        <HotkeyComp mapKey='restore' />
    </>
);

const addTooltip = (
    <>
        Selecting items (while not holding <kbd>Ctrl</kbd> pressed) adds their highest active groups to the
        present group. Selecting items while holding <kbd>Ctrl</kbd> pressed adds only the individual items.
        <HotkeyComp mapKey='adding' />
    </>
);

const dissolveAddTooltip = (
    <>
        Selecting items adds either the members of their highest active groups (where applicable) or the items
        themselves to the present group. Selecting items while holding <kbd>Ctrl</kbd> pressed adds only the
        individual items.
        <HotkeyComp mapKey='dissolve-adding' />
    </>
);

export interface GroupTabProps {
    item: Item;
    adding: boolean;
    dissolveAdding: boolean;
    create: () => void;
    leave: () => void;
    rejoin: () => void;
    restore: () => void;
    changeAdding: () => void;
    changeDissolveAdding: () => void;
}

const GroupTab = React.memo(
    ({
        item,
        adding,
        dissolveAdding,
        create,
        leave,
        rejoin,
        restore,
        changeAdding,
        changeDissolveAdding,
    }: GroupTabProps) => {
        const groups = getGroups(item);
        const highestActive = groups[1] > -1 ? groups[0][groups[1]] : item;
        const canLeave = item.group !== null && item.isActiveMember;
        const canRejoin = highestActive.group !== null && !highestActive.isActiveMember;
        const canRestore =
            !(highestActive instanceof Item) && highestActive.members.some((m) => !m.isActiveMember);
        const canAdd = !(highestActive instanceof Item);

        return (
            <div className='flex flex-col h-full'>
                <div className='mx-2'>
                    <BasicColoredButton
                        id='create-button'
                        label='Create group'
                        style='px-2 mt-1 rounded-lg text-sm w-full'
                        disabled={false}
                        onClick={create}
                        tooltip={createTooltip}
                        tooltipPlacement='left'
                    />
                </div>
                <div className='text-center mt-3 text-sm'>
                    Group level:&nbsp;&nbsp;{groups[1] + 1} / {groups[0].length}
                </div>
                <BasicColoredButton
                    id='leave-button'
                    label='Leave group'
                    style='px-2 mx-2 mt-3 rounded-lg text-sm'
                    disabled={!canLeave}
                    onClick={leave}
                    tooltip={leaveTooltip}
                    tooltipPlacement='left'
                />
                <BasicColoredButton
                    id='rejoin-button'
                    label='Rejoin'
                    style='px-2 mx-2 mt-2 rounded-lg text-sm'
                    disabled={!canRejoin}
                    onClick={rejoin}
                    tooltip={rejoinTooltip}
                    tooltipPlacement='left'
                />
                <BasicColoredButton
                    id='restore-button'
                    label='Restore'
                    style='px-2 mx-2 mt-2 rounded-lg text-sm'
                    disabled={!canRestore}
                    onClick={restore}
                    tooltip={restoreTooltip}
                    tooltipPlacement='left'
                />
                <BasicColoredButton
                    id='add-button'
                    label='Add...'
                    style='px-2 mx-2 mt-3.5 rounded-lg text-sm'
                    pressed={adding}
                    disabled={!canAdd}
                    onClick={changeAdding}
                    tooltip={addTooltip}
                    tooltipPlacement='left'
                />
                <BasicColoredButton
                    id='dissolve-add-button'
                    label='Dissolve-add...'
                    style='px-2 mx-2 mt-2 rounded-lg text-sm'
                    pressed={dissolveAdding}
                    disabled={!canAdd}
                    onClick={changeDissolveAdding}
                    tooltip={dissolveAddTooltip}
                    tooltipPlacement='left'
                />
            </div>
        );
    }
);
GroupTab.displayName = 'GroupTab';

export default GroupTab;
