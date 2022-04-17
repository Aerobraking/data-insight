/**
 * Removes an Object from a List.
 * @param list The list where you want to remove an object from.
 * @param value The Object you want to remove from the list.
 * @returns the given list object.
 */
export function removeFromList(list: any[], value: any) {
    if (value instanceof Array) {
        var i = 0;
        while (i < list.length) {
            if (list[i] === value) {
                list.splice(i, 1);
            } else {
                ++i;
            }
        }
    } else {
        var index = list.indexOf(value);
        if (index > -1) {
            list.splice(index, 1);
        }
    }
    return list;
}

/**
 * Adds an Object to a list when it's not part of it already.
 * @param list The list where you want to add the object to.
 * @param value the Object you want to add.
 */
export function add(list: any[], value: any) {
    if (!list.includes(value)) {
        list.push(value);
    }
}
/**
 * Toggles the existince of an Object in a List.
 * @param list The list that should (not) contain the object.
 * @param value The object whoose existince you want to toggle.
 */
export function toggle(list: any[], value: any) {
    if (!list.includes(value)) {
        list.push(value);
    } else {
        removeFromList(list, value);
    }
}


