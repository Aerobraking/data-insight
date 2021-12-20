 
import { OverviewEngine } from "@/components/app/OverviewEngine";
import { AbstractNode } from "@/store/model/OverviewData";
import * as d3 from "d3";

function constant(x: any) {
    return function () {
        return x;
    };
}

function jiggle(random: any) {
    return (random() - 0.5) * 1e-6;
}


function x(d: any) {
    return d.x + d.vx;
}

function y(d: any) {
    return d.y + d.vy;
}

export default function CollideExtend(radius: any | null = null) {
    var nodes: AbstractNode[],
        radii: any[],
        random: any,
        strength: number = 1,
        iterations: number = 1;

    if (typeof radius !== "function") radius = constant(radius == null ? 1 : +radius);

    function force() {


        for (let i = 0; i < nodes.length; i++) {
            const n: AbstractNode = nodes[i];
            n.vy = n.vy ? Math.sign(n.vy) * Math.min(10, Math.abs(n.vy)) : 0;

            if (n.parent && !n.parent.isRoot()) {
                const vectorToParent: number = n.parent.getY() - n.getY();
                if (Math.abs(vectorToParent) > n.parent.forceRadius) {
                    n.flag = 1;
                    n.vy += Math.sign(vectorToParent) *Math.sqrt( Math.min(30, ((Math.abs(vectorToParent) - n.parent.forceRadius))*0.1));
                } else {
                    n.flag = 0;
                }
            }

        }

        const map: Map<number, AbstractNode[]> = new Map()

        for (let i = 1, depth = i + 1; i < 256; i++, depth++) {
            const listNodes = nodes.filter(n => n.depth == i);
            if (listNodes != undefined && listNodes.length > 0) {

                if (OverviewEngine.framecounter % 400 == 0) {
                    // console.log("column: " + i + " nodes: " + listNodes.length);
                    // console.log(" ");
                }



                let list = map.get(depth);
                if (!list) {
                    list = [];
                    map.set(depth, list);
                }

                list.push(...listNodes);

                /** sort after Y coordinates */
                listNodes.sort((a, b) => a.getY() - b.getY());

                for (let i = 0; i < listNodes.length; i++) {
                    const node: AbstractNode = listNodes[i];
                    const nodeParent: AbstractNode | undefined = node.parent;
                    //  node.flag = 0;
                    /**
                     * nicht nur den abstand von Y sondern auch den force radius dabei einbeziehen!
                     */

                    const top: AbstractNode | undefined = i > 0 ? listNodes[i - 1] : undefined;
                    const bottom: AbstractNode | undefined = i < listNodes.length - 1 ? listNodes[i + 1] : undefined;

                    if (top && top.parent && nodeParent && top.parent != nodeParent) {

                        let dToParent = Math.abs(node.getY() - nodeParent.getY()) + node.forceRadius > nodeParent.forceRadius * 1;
                        const topParent: AbstractNode | undefined = top.parent;
                        dToParent = true;

                        const isCrossing: boolean = (
                            (nodeParent.getY() < topParent.getY() && node.getY() + node.forceRadius > top.getY())
                            ||
                            (nodeParent.getY() > topParent.getY() && node.getY() - node.forceRadius < top.getY())
                        );

                        if (isCrossing && node.vy && dToParent) {
                            const vectorToNeighb: number = top.getY() - node.getY();
                            const d = Math.pow(Math.abs((node.getY() + Math.sign(vectorToNeighb) * node.forceRadius) - top.getY()), 1);
                            const vectorToParent: number = nodeParent.getY() - node.getY();
                            // node.flag = 1;
                            // node.vy += Math.sign(vectorToParent) * d;
                        }

                    }

                    if (bottom && bottom.parent && nodeParent && bottom.parent != nodeParent) {

                        let dToParent = Math.abs(node.getY() - nodeParent.getY()) + node.forceRadius > nodeParent.forceRadius * 1;
                        const bottomParent: AbstractNode | undefined = bottom.parent;
                        dToParent = true;

                        const isCrossing: boolean = (
                            (bottomParent.getY() < bottomParent.getY() && node.getY() + node.forceRadius > bottom.getY())
                            ||
                            (nodeParent.getY() > bottomParent.getY() && node.getY() - node.forceRadius < bottom.getY())
                        );

                        if (isCrossing && node.vy && dToParent) {

                            const vectorToNeighb: number = bottom.getY() - node.getY();
                            const d = Math.pow(Math.abs((node.getY() + Math.sign(vectorToNeighb) * node.forceRadius) - bottom.getY()), 1);
                            const vectorToParent: number = nodeParent.getY() - node.getY();
                            // node.flag = 1;
                            // node.vy += Math.sign(vectorToParent) * d;
                        }
                    }


                }



            } else {
                // when no nodes are found, the maximum depth is reached.
                break;
            }

        }




























        var i, n = nodes.length,
            tree: any,
            node: any,
            xi: number,
            yi: number,
            ri: number,
            ri2: number;





        for (var k = 0; k < 0 /*iterations*/; ++k) {
            tree = d3.quadtree(nodes, x, y).visitAfter(prepare);
            for (i = 0; i < n; ++i) {
                node = nodes[i];
                ri = radii[node.index], ri2 = ri * ri;
                xi = node.x + node.vx;
                yi = node.y + node.vy;
                tree.visit(apply);
            }
        }

        function apply(quad: any, x0: number, y0: number, x1: number, y1: number) {
            var data = quad.data, rj = quad.r, r = ri + rj;
            if (data) {
                if (data.index > node.index) {
                    var x: number = xi - data.x - data.vx,
                        y: number = yi - data.y - data.vy,
                        // we ignore the sqrt and just use the pow(2) of sum of the two radii
                        l = x * x + y * y;
                    if (l < r * r && node.depth == data.depth) {
                        if (x === 0) x = jiggle(random), l += x * x;
                        if (y === 0) y = jiggle(random), l += y * y;
                        // l is distance squared, we take the root
                        l = (r - (l = Math.sqrt(l))) / l * strength;

                        if (node.parent != undefined && data.parent != undefined && node.parent != data.parent) {

                            const vectorToParent: number = node.parent.y - node.y;
                            const vectorToNeigbour: number = data.y - node.y;

                            let rjTemp = rj;
                            const rTemp = (rjTemp *= rjTemp) / (ri2 + rjTemp);
                            const yVel = (y * l) * rTemp;

                            const crossYTemp = node.y + 0 * Math.sign(vectorToNeigbour);


                            const isCrossing: boolean = (node.parent.y < data.parent.y && crossYTemp > data.y) || (node.parent.y > data.parent.y && crossYTemp < data.y);



                            if (OverviewEngine.framecounter % 400 == 0) {
                                console.log(yVel);
                                console.log(vectorToParent);
                                console.log(" ");
                            }

                            if (isCrossing) {

                                const d = Math.pow(Math.abs(node.y - data.y), 1);


                                // node.vy += Math.sign(vectorToParent) * 20;
                                node.vy += Math.sign(vectorToParent) * d;
                            }


                            const vectorToNeigbourParent: number = node.y - data.parent.y;
                            const radiusOfNeighParent: number = data.parent.forceRadius;

                            if (Math.abs(vectorToNeigbourParent) < radiusOfNeighParent) {

                                // const d = 

                                // node.vy += Math.sign(vectorToParent) * 20;

                            }


                            /**
                             * create a force when a neighbour is between the node and the Y position of the parent.
                             */
                            if (Math.sign(vectorToParent) != Math.sign(vectorToNeigbour)
                                && Math.abs(vectorToNeigbour) < Math.abs(vectorToParent)
                            ) {
                                // node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
                                // node.vy += (y *= l) * r;


                                if (OverviewEngine.framecounter % 150 == 0) {
                                    console.log((y *= l) * r);
                                    console.log(" ");
                                }

                                // node.vy += Math.sign(vectorToParent) * 120;

                                // data.vx -= x * (r = 1 - r);
                                // data.vy -= y * r;

                            }

                            // if (Math.sign(yVel) == Math.sign(vectorToParent)) {

                            //     if (OverviewEngine.framecounter % 400 == 0) {
                            //         console.log("Force is in the parent direction!");
                            //         console.log(yVel);
                            //         console.log(vectorToParent); console.log(" ");
                            //     }
                            //     /**
                            //      * Force is in the direction to the parent node, in this case the force is applied normally
                            //      */       //node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
                            //     node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
                            //     node.vy += (y *= l) * r;
                            //     data.vx -= x * (r = 1 - r);
                            //     data.vy -= y * r;


                            // } else {

                            //     if (OverviewEngine.framecounter % 400 == 0) {
                            //         console.log("Force is NOT in the parent direction");
                            //         console.log((y * l) * r);
                            //         console.log(vectorToParent); console.log(" ");

                            //     }

                            //     // node.vx += ((x *= l) * (r = (rj *= rj) / (ri2 + rj))) * 0.01;;
                            //     // node.vy += ((y *= l) * r) * 0.01;;
                            //     // data.vx -= (x * (r = 1 - r)) * 0.01;
                            //     // data.vy -= (y * r) * 0.01;
                            // }
                            /*
                            node = 10
                            parent = 40; 
                            
                            */



                        } else {
                            /**
                             * Normal collision handling between children
                             */
                            // node.vx += (x *= l) * (r = (rj *= rj) / (ri2 + rj));
                            // node.vy += (y *= l) * r;
                            // data.vx -= x * (r = 1 - r);
                            // data.vy -= y * r;
                        }


                    }
                }
                return;
            }
            return x0 > xi + r || x1 < xi - r || y0 > yi + r || y1 < yi - r;
        }
    }

    function prepare(quad: any) {
        if (quad.data) return quad.r = radii[quad.data.index];
        for (var i = quad.r = 0; i < 4; ++i) {
            if (quad[i] && quad[i].r > quad.r) {
                quad.r = quad[i].r;
            }
        }
    }

    function initialize() {
        if (!nodes) return;
        var i, n = nodes.length, node;
        radii = new Array(n);
        for (i = 0; i < n; ++i) node = nodes[i], radii[node.index ? node.index : 0] = +radius(node, i, nodes);
    }

    force.initialize = function (_nodes: [], _random: []) {
        nodes = _nodes;
        random = _random;
        initialize();
    };

    force.iterations = function (_: any) {
        return arguments.length ? (iterations = +_, force) : iterations;
    };

    force.strength = function (_: any) {
        return arguments.length ? (strength = +_, force) : strength;
    };

    force.radius = function (_: any) {
        return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), initialize(), force) : radius;
    };

    return force;
}
