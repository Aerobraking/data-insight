/**
 * Code basis from:
 * https://github.com/d3/d3-force/blob/main/src/collide.js
 * Extended Typescript support 
 * 
 * */
import * as d3 from "d3";

function constant(x: any) {
    return function () {
        return x;
    };
}

export default function rectCollide(size: any) {
    var nodes: [], sizes: [], masses: number[];
    var strength: number = 1;
    var iterations: number = 1;
    var nodeCenterX: number;
    var nodeMass: number;
    var nodeCenterY: number;

    function force() {

        var node: any;
        var i = -1;
        while (++i < iterations) { iterate(); }
        function iterate() {
            var quadtree = d3.quadtree(nodes, xCenter, yCenter);
            var j = -1
            while (++j < nodes.length) {
                node = nodes[j];
                nodeMass = masses[j];
                nodeCenterX = xCenter(node);
                nodeCenterY = yCenter(node);
                quadtree.visit(collisionDetection);
            }
        }

        function collisionDetection(quad: any, x0: number, y0: number, x1: number, y1: number) {
            var updated = false;
            var data = quad.data;
            if (data) {
                if (data.index > node.index) {

                    let xSize = (node.width + data.width) / 2;
                    let ySize = (node.height + data.height) / 2;
                    let dataCenterX = xCenter(data);
                    let dataCenterY = yCenter(data);
                    let dx = nodeCenterX - dataCenterX;
                    let dy = nodeCenterY - dataCenterY;
                    let absX = Math.abs(dx);
                    let absY = Math.abs(dy);
                    let xDiff = absX - xSize;
                    let yDiff = absY - ySize;

                    if (xDiff < 0 && yDiff < 0) {
                        //collision has occurred

                        //separation vector
                        let sx = xSize - absX;
                        let sy = ySize - absY;
                        if (sx < sy) {
                            if (sx > 0) {
                                sy = 0;
                            }
                        } else {
                            if (sy > 0) {
                                sx = 0;
                            }
                        }
                        if (dx < 0) {
                            sx = -sx;
                        }
                        if (dy < 0) {
                            sy = -sy;
                        }

                        let distance = Math.sqrt(sx * sx + sy * sy);
                        let vCollisionNorm = { x: sx / distance, y: sy / distance };
                        let vRelativeVelocity = { x: data.vx - node.vx, y: data.vy - node.vy };
                        let speed = vRelativeVelocity.x * vCollisionNorm.x + vRelativeVelocity.y * vCollisionNorm.y;
                        if (speed < 0) {
                            //negative speed = rectangles moving away
                        } else {
                            var collisionImpulse = 2 * speed / (masses[data.index] + masses[node.index]);
                            if (Math.abs(xDiff) < Math.abs(yDiff)) {
                                //x overlap is less
                                data.vx -= (collisionImpulse * masses[node.index] * vCollisionNorm.x);
                                node.vx += (collisionImpulse * masses[data.index] * vCollisionNorm.x);
                            } else {
                                //y overlap is less
                                data.vy -= (collisionImpulse * masses[node.index] * vCollisionNorm.y);
                                node.vy += (collisionImpulse * masses[data.index] * vCollisionNorm.y);
                            }

                            updated = true;
                        }
                    }
                }
            }
            return updated
        }
    }//end force

    function xCenter(d: any) { return d.x + d.vx + sizes[d.index][0] / 2 }
    function yCenter(d: any) { return d.y + d.vy + sizes[d.index][1] / 2 }

    force.initialize = function (_: any) {
        // sizes = (nodes = _).map(function (d: any) { return [d.width, d.height] })
        sizes = (nodes = _).map(size)
        masses = sizes.map(function (d: any) { return d[0] * d[1] })
    }

    force.size = function (_: any) {
        return (arguments.length
            ? (size = typeof _ === 'function' ? _ : constant(_), force)
            : size)
    }

    force.strength = function (_: number):any {
        return (arguments.length ? (strength = +_, force) : strength)
    }

    force.iterations = function (_: number) {
        return (arguments.length ? (iterations = +_, force) : iterations)
    }

    return force
}

