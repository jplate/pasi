import React from 'react';

import Item from './Item.tsx'
import { getGroups, MAX_GROUP_LEVEL } from './Group.tsx'
import { BasicColoredButton } from './Button.tsx'


export interface GroupTabProps {
    item: Item
    adding: boolean
    dissolveAdding: boolean
    create: () => void
    leave: () => void
    rejoin: () => void
    dissolve: () => void
    restore: () => void
    changeAdding: () => void
    changeDissolveAdding: () => void
}

const GroupTab = ({item, adding, dissolveAdding, create, leave, rejoin, dissolve, restore, 
        changeAdding, changeDissolveAdding}: GroupTabProps) => {

    const groups = getGroups(item);
    const highestActive = groups[1]>-1? groups[0][groups[1]]: item;
    const canLeave = item.group!==null && item.isActiveMember;
    const canRejoin = highestActive.group!==null && !highestActive.isActiveMember;
    const canRestore = !(highestActive instanceof Item) && highestActive.members.some(m => !m.isActiveMember);
    const canAdd = !(highestActive instanceof Item);

    return (
        <div className='flex flex-col h-full'>
            <BasicColoredButton id='create-button' label='Create group' style='px-2 mx-2 mt-1 rounded-lg' disabled={groups[1]+1>=MAX_GROUP_LEVEL} onClick={create} 
                tooltip={'Creates a new group that has all elements of the current selection (or their highest active groups, where applicable) as members, and removes these '+
                    'elements from their current lowest inactive groups.'}
                tooltipPlacement='left' />
            <div className='text-center mt-3'>
                Group level:&nbsp;&nbsp;{groups[1]+1} / {groups[0].length}
            </div>
            <BasicColoredButton id='leave-button' label='Leave group' style='px-2 mx-2 mt-3 rounded-lg' disabled={!canLeave} onClick={leave} 
                tooltip='Deactives the membership the currently focused node (or the membership of its second-highest active group, where applicable) in its highest active group.'
                tooltipPlacement='left' />
            <BasicColoredButton id='rejoin-button' label='Rejoin' style='px-2 mx-2 mt-2 rounded-lg' disabled={!canRejoin} onClick={rejoin} 
                tooltip='Reactivates the membership of the currently focused node (or its highest active group, where applicable) in the next-highest group.'
                tooltipPlacement='left' />
            <BasicColoredButton id='dissolve-button' label='Dissolve' style='px-2 mx-2 mt-3.5 rounded-lg' disabled={!canLeave} onClick={dissolve} 
                tooltip='‘Dissolves’ the highest active group of the currently focused node by deactivating the membership of each member.'
                tooltipPlacement='left' />
            <BasicColoredButton id='restore-button' label='Restore' style='px-2 mx-2 mt-2 rounded-lg' disabled={!canRestore} onClick={restore} 
                tooltip='Reactivates the membership of each member of the currently focused node’s highest active group.'
                tooltipPlacement='left' />
            <BasicColoredButton id='restore-button' label='Add...' style='px-2 mx-2 mt-3.5 rounded-lg' pressed={adding} disabled={!canAdd} onClick={changeAdding} 
                tooltip='Selecting nodes (while not holding CTRL pressed) adds their highest active groups to the present group. Selecting nodes while holding CTRL pressed adds only the individual nodes.'
                tooltipPlacement='left' />
            <BasicColoredButton id='restore-button' label='Dissolve-add...' style='px-2 mx-2 mt-2 rounded-lg' pressed={dissolveAdding} disabled={!canAdd} onClick={changeDissolveAdding} 
                tooltip='Selecting nodes adds either the members of their highest active groups (where applicable) or the nodes themselves to the present group. Selecting nodes while holding CTRL pressed adds only the individual nodes.'
                tooltipPlacement='left' />
        </div>
    )
}

export default GroupTab;