export function remove(list: any[], value: any) {
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

export function add(arr: any[], value: any) {
    if (!arr.includes(value)) {
        arr.push(value);
    }
}
export function toggle(arr: any[], value: any) {
    if (!arr.includes(value)) {
        arr.push(value);
    } else {
        remove(arr, value);
    }
}


