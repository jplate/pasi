import Item from './Item.tsx'

export const MAX_GROUP_LEVEL = 255

export interface GroupMember {
    group: Group<any> | null,
    isActiveMember: boolean,
    getString: () => string,
}

export const isGroupMember = (obj: any, g: any): obj is GroupMember => {
    return (
        typeof obj === 'object' && 
        obj !== null &&
        typeof obj.group === 'object' && // this includes the case where obj.group===null
        ((g===undefined && isGroup(obj.group)) || obj.group === g) && // If g is undefined (i.e., no second parameter has been specified), we 
            // go and check whether obj.group is a Group. Otherwise, we assume that g is supposed to be the Group of obj.
        typeof obj.isActiveMember === 'boolean' &&
        typeof obj.getString === 'function'
    );
}

export default interface Group<T extends GroupMember> extends GroupMember {
    members: T[]
}

export const isGroup = <T extends GroupMember>(obj: any): obj is Group<T> => {
    const g = obj.group;
    return (
        isGroupMember(obj, g) &&
        Array.isArray((obj as Group<T>).members) &&
        (obj as Group<T>).members.every(m => isGroupMember(m, obj))
    );
}

/**
 * Returns the depth (measured in levels of group-membership) of a group or other object.
 */
export const depth = (x: any, d: number = 0): number => 
    !isGroup(x)? d: 
    x.members.reduce((acc, m) => {
        const dm = depth(m, d+1);
        return acc>dm? acc: dm
    }, 0);

/**
 * Returns an array whose first element is an array representing the list of groups of which the first argument is a direct or indirect member, and
 * whose second element indicates the first group whose predecessor (which, in the case of the first element of the list, is the first argument)
 * satisfies the supplied test condition.
 * The default test condition is (m => !m.isActiveMember). Hence, in the default case, the returned index indicates the 'highest active' group of the first argument.
 */
export const getGroups = (
        member: GroupMember, 
        test: (m: GroupMember) => boolean = m => !m.isActiveMember
    ): [g: Group<any>[], index: number] => {
    let { group } = member,
        groups: Group<any>[] = [],
        i = -1, 
        reached = false;

    if (group) while (true) {
        groups = [...groups, group]

        if (!reached && !test(member)) i++;
        else reached = true;
        
        if (!group.group) break;
        member = group;
        group = group.group;
    }

    return [groups, i];
}

export const getLeafMembers = (group: Group<any>, onlyActiveMembers: boolean = false): Set<GroupMember> => {
    let members = group.members,
        result = new Set<GroupMember>();
    for (let m of members) {
        if(m.isActiveMember || !onlyActiveMembers) {
            if (isGroup(m)) {
                let leaves = getLeafMembers(m, onlyActiveMembers);
                for (let l of leaves) {
                    result.add(l);
                }
            }
            else {
                result.add(m);
            }
        }
    }
    return result;
}

export class StandardGroup<T extends GroupMember> implements GroupMember, Group<T> {
    constructor(
        public members: T[], 
        public group: Group<T> | null = null,
        public isActiveMember: boolean = false
    ) {}
    public getString = () => `SG[${this.members.map(member => member.getString()+(member.isActiveMember? '(A)': '')).join(', ')}]`;
}