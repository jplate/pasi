import React from 'react';

import Item from './Item.tsx'
import { getGroups } from './Group.tsx'
import { BasicColoredButton } from './Button.tsx'
import { HotkeyComp } from './MainPanel.tsx'


export interface GroupTabProps {
    item: Item
    adding: boolean
    dissolveAdding: boolean
    create: () => void
    leave: () => void
    rejoin: () => void
    restore: () => void
    changeAdding: () => void
    changeDissolveAdding: () => void
}

const GroupTab = ({item, adding, dissolveAdding, create, leave, rejoin, restore, 
        changeAdding, changeDissolveAdding}: GroupTabProps) => {

    const groups = getGroups(item);
    const highestActive = groups[1]>-1? groups[0][groups[1]]: item;
    const canLeave = item.group!==null && item.isActiveMember;
    const canRejoin = highestActive.group!==null && !highestActive.isActiveMember;
    const canRestore = !(highestActive instanceof Item) && highestActive.members.some(m => !m.isActiveMember);
    const canAdd = !(highestActive instanceof Item);

    return (
        <div className='flex flex-col h-full'>
            <BasicColoredButton id='create-button' label='Create group' style='px-2 mx-2 mt-1 rounded-lg text-sm'
                disabled={false} 
                onClick={create} 
                tooltip={<>Creates a new group that contains all selected nodes (or, where applicable, the highest among their respective &lsquo;active&rsquo; {' '}
                     groups that are also such that all their leaf members are selected), and removes these from their current groups.<HotkeyComp mapKey='create group' /></>}
                tooltipPlacement='right' />
            <div className='text-center mt-3 text-sm'>
                Group level:&nbsp;&nbsp;{groups[1]+1} / {groups[0].length}
            </div>
            <BasicColoredButton id='leave-button' label='Leave group' style='px-2 mx-2 mt-3 rounded-lg text-sm' 
                disabled={!canLeave} 
                onClick={leave} 
                tooltip={<>Deactivates the membership of each selected node (or of its second-highest active group, where applicable) in its currently highest active {' '}
                    group. Contour nodes will still be members of their contour node groups, but selecting them will no longer select the other members {' '}
                    as well.<HotkeyComp mapKey='leave' /></>}
                tooltipPlacement='right' />
            <BasicColoredButton id='rejoin-button' label='Rejoin' style='px-2 mx-2 mt-2 rounded-lg text-sm' 
                disabled={!canRejoin} 
                onClick={rejoin} 
                tooltip={<>Reactivates the membership of the each selected node (or its highest active group, where applicable) in the next-lowest group. {' '}
                    <HotkeyComp mapKey='rejoin' /></>}
                tooltipPlacement='right' />
            <BasicColoredButton id='restore-button' label='Restore' style='px-2 mx-2 mt-2 rounded-lg text-sm' 
                disabled={!canRestore} 
                onClick={restore} 
                tooltip={<>Reactivates the membership of each member of each selected node&apos;s highest active group.<HotkeyComp mapKey='restore' /></>}
                tooltipPlacement='right' />
            <BasicColoredButton id='add-button' label='Add...' style='px-2 mx-2 mt-3.5 rounded-lg text-sm' 
                pressed={adding} 
                disabled={!canAdd} 
                onClick={changeAdding} 
                tooltip={<>Selecting nodes (while not holding <kbd>Ctrl</kbd> pressed) adds their highest active groups to the present group. Selecting nodes while holding {' '}
                    <kbd>Ctrl</kbd> pressed adds only the individual nodes.<HotkeyComp mapKey='adding' /></>}
                tooltipPlacement='right' />
            <BasicColoredButton id='dissolve-add-button' label='Dissolve-add...' style='px-2 mx-2 mt-2 rounded-lg text-sm' 
                pressed={dissolveAdding} 
                disabled={!canAdd} 
                onClick={changeDissolveAdding} 
                tooltip={<>Selecting nodes adds either the members of their highest active groups (where applicable) or the nodes themselves to the present group. {' '}
                    Selecting nodes while holding <kbd>Ctrl</kbd> pressed adds only the individual nodes.<HotkeyComp mapKey='dissolve-adding' /></>}
                tooltipPlacement='right' />
        </div>
    )
}

export default GroupTab;