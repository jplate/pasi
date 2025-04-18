export interface GroupMember {
    group: Group<any> | null;
    isActiveMember: boolean;
    getString: () => string;
}

export const isGroupMember = (obj: any, g: any): obj is GroupMember => {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.group === 'object' && // this includes the case where obj.group===null
        ((g === undefined && isGroup(obj.group)) || obj.group === g) && // If g is undefined (i.e., no second parameter has been specified), we
        // go and check whether obj.group is a Group. Otherwise, we assume that g is supposed to be the Group of obj.
        typeof obj.isActiveMember === 'boolean' &&
        typeof obj.getString === 'function'
    );
};

export default interface Group<T extends GroupMember> extends GroupMember {
    members: T[];
}

export const isGroup = <T extends GroupMember>(obj: any): obj is Group<T> => {
    const g = obj.group;
    return (
        isGroupMember(obj, g) &&
        Array.isArray((obj as Group<T>).members) &&
        (obj as Group<T>).members.every((m) => isGroupMember(m, obj))
    );
};

/**
 * Returns the depth (measured in levels of group-membership) of a group or other object.
 */
export const depth = (x: any, d: number = 0): number =>
    !isGroup(x)
        ? d
        : x.members.reduce((acc, m) => {
              const dm = depth(m, d + 1);
              return acc > dm ? acc : dm;
          }, 0);

/**
 * @return an array whose first element is an array representing the list of groups of which the first argument is a direct or indirect member, and
 * whose second element indicates the first group whose predecessor (which, in the case of the first element of the list, is the first argument)
 * satisfies the supplied test condition.
 * The default test condition is (m => !m.isActiveMember). Hence, in the default case, the returned index indicates the 'highest active' group of the first argument.
 */
export const getGroups = (
    member: GroupMember,
    test: (m: GroupMember) => boolean = (m) => !m.isActiveMember
): [g: Group<any>[], index: number] => {
    const groups: Group<any>[] = [];
    let group = member.group,
        i = -1,
        reached = false;

    if (group)
        while (true) {
            groups.push(group);

            if (!reached && !test(member)) i++;
            else reached = true;

            if (!group.group) break;
            member = group;
            group = group.group;
        }

    return [groups, i];
};

export const getLeafMembers = (group: Group<any>, onlyActiveMembers: boolean = false): Set<GroupMember> => {
    const members = group.members,
        result = new Set<GroupMember>();
    for (const m of members) {
        if (m.isActiveMember || !onlyActiveMembers) {
            if (isGroup(m)) {
                const leaves = getLeafMembers(m, onlyActiveMembers);
                for (const l of leaves) {
                    result.add(l);
                }
            } else {
                result.add(m);
            }
        }
    }
    return result;
};

export class StandardGroup<T extends GroupMember> implements GroupMember, Group<T> {
    id: string;
    members: T[];
    group: Group<T> | null;
    isActiveMember: boolean;

    constructor(id: number, members: T[], group: Group<T> | null = null, isActiveMember: boolean = false) {
        this.id = `SG${id}`;
        this.members = members;
        this.group = group;
        this.isActiveMember = isActiveMember;
    }

    public getString = () =>
        `${this.id}[${this.members.map((member) => member.getString() + (member.isActiveMember ? '(A)' : '')).join(', ')}]`;

    /**
     * Returns true iff this group directly or indirectly (via a chain of membership-relationships involving StandardGroups) contains the supplied object.
     */
    public contains = (obj: any): boolean =>
        this.members.some((m) => m === obj || (m instanceof StandardGroup && m.contains(obj)));
}
