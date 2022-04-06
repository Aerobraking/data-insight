
/**
 * Tests if r2 intersects r1 in any way
 * @param r1 
 * @param r2 
 * @returns true if r1 intersects r2
 */
export function intersectRect(
    r1: { x: number; y: number; x2: number; y2: number },
    r2: { x: number; y: number; x2: number; y2: number }
) {
    let a: boolean = r2.x > r1.x2;
    let b: boolean = r2.x2 < r1.x;
    let c: boolean = r2.y > r1.y2;
    let d: boolean = r2.y2 < r1.y;

    return !(r2.x > r1.x2 || r2.x2 < r1.x || r2.y > r1.y2 || r2.y2 < r1.y);
}

/**
 * Tests if r2 is inside r1
 * @param r1 
 * @param r2 
 * @returns 
 */
export function insideRect(
    r1: { x: number; y: number; x2: number; y2: number }, // the outside one
    r2: { x: number; y: number; x2: number; y2: number } // the inside one
) {
    let a: boolean = r2.x > r1.x2;
    let b: boolean = r2.x2 < r1.x;
    let c: boolean = r2.y > r1.y2;
    let d: boolean = r2.y2 < r1.y;

    return r2.x2 < r1.x2 && r2.x > r1.x && r2.y > r1.y && r2.y2 < r1.y2;
}