export function remove(arr: any[], value: any) {
    if (value instanceof Array) {
        var i = 0;
        while (i < arr.length) {
            if (arr[i] === value) {
                arr.splice(i, 1);
            } else {
                ++i;
            }
        }
    } else {
        var index = arr.indexOf(value);
        if (index > -1) {
            arr.splice(index, 1);
        }
    }
    return arr;
}

export function add(arr: any[], value: any) {
    if (!arr.includes(value)) {
        arr.push(value);
    }
}
export function toggle(arr: any[], value: any) {
    if (!arr.includes(value)) {
        arr.push(value);
    }else{
        remove(arr,value);
    }
}


