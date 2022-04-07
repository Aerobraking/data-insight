import _ from "underscore";

export const classPreventInput = "prevent-input";

export interface ElementDimension {
    x: number,
    y: number,
    w: number,
    h: number,
    x2: number,
    y2: number,
}

export class ElementDimensionInstance implements ElementDimension {

    constructor(x: number = 0,
        y: number = 0,
        w: number = 0,
        h: number = 0,
        x2: number = 0,
        y2: number = 0,
    ) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.x2 = x2;
        this.y2 = y2;
    }
    x: number;
    y: number;
    w: number;
    h: number;
    x2: number;
    y2: number;

    public calculateSize(minSize: number = 1) {
        this.w = this.x2 - this.x;
        this.h = this.y2 - this.y;

    }

    public scaleFromCenter(s: number = 1) {
        if (s == 1) return;
        const oldW = this.w;
        const oldH = this.h;
        this.w *= s;
        this.h *= s;
        this.x -= ((this.w - oldW) / 2);
        this.y -= ((this.h - oldH) / 2);
        this.x2 += ((this.w - oldW) / 2);
        this.y2 += ((this.h - oldH) / 2);
    }
    public addPadding(p: number = 1): this {
        if (p == 1) return this;
        this.w += p * 2;
        this.h += p * 2;
        this.x -= p;
        this.y -= p;
        this.x2 += p;
        this.y2 += p;
        return this;
    }
}
 
export function getCoordinatesFromElement(e: HTMLElement): ElementDimensionInstance {
    let results: string = e.style.transform;
    results = results
        .replace("translate3d(", "")
        .replace(")", "")
        .replaceAll("px", "")
        .replaceAll(" ", "");
    let values: number[] = results.split(",").map(Number);

    let w: number = parseInt(String(e.style.width).replaceAll("px", "").trim()),
        h: number = parseInt(String(e.style.height).replaceAll("px", "").trim());

    if (isNaN(w) || !isFinite(w)) w = e.clientWidth;
    if (isNaN(h) || !isFinite(h)) h = e.clientHeight;

    w = w == NaN ? 0 : w;
    h = h == NaN ? 0 : h;

    return new ElementDimensionInstance(
        Math.round(values[0]),
        Math.round(values[1]),
        Math.round(w),
        Math.round(h),
        Math.round(values[0] + w),
        Math.round(values[1] + h),
    );
}

export function set3DPosition(e: any, x: number, y: number): void {
    e.style.transform = `translate3d(${x}px, ${y}px,0px)`;
}

export function setSize(e: any, w: number, h: number): void {
    e.style.width = Math.abs(w) + "px";
    e.style.height = Math.abs(h) + "px";
}

export interface ResizerComplexOwner {
    getCurrentTransform(): { scale: number; x: number; y: number };
}

const maxSize: number = 30000;

export class ResizerComplex {

    startX: number = 0;
    startY: number = 0;
    startWidth: number = 0;
    startHeight: number = 0;
    originalWidth: number = 0;
    originalHeight: number = 0;
    owner: ResizerComplexOwner | null = null;
    elementSizeStart: ElementDimension;
    element: HTMLElement;

    listChildrenDimensions: ElementDimension[] = [];
    listChildren: HTMLElement[] = [];
    resizeStart: Function;
    resizeEnd: Function;
    resizeStep: Function;

    public setChildren(listChildren: HTMLElement[]): void {
        this.listChildren = [];
        this.listChildren.push(...listChildren);
    }

    constructor(element: HTMLElement, resizeElement: HTMLElement | undefined = undefined, owner: ResizerComplexOwner, resizeStart: Function = () => { }, resizeStep: Function = () => { }, resizeEnd: Function = () => { }) {
        this.elementSizeStart = getCoordinatesFromElement(element);

        this.resizeStep = resizeStep;
        this.resizeEnd = resizeEnd;
        this.resizeStart = resizeStart;
        this.owner = owner;
        this.element = element;
        this.listChildrenDimensions = [];

        /**
         * Add resize handler divs
         */
        var resizer;
        //   resizer = document.createElement('div');
        // resizer.className = 'resizer-top-right';
        // resizer.classList.add('ws-zoom-fixed');
        // element.appendChild(resizer);
        // resizer.addEventListener('mousedown', ev => this.initDrag(ev), false);

        if (resizeElement != undefined) {
            resizeElement.addEventListener('mousedown', ev => this.initDrag(ev), { capture: true });
        } else {
            resizer = document.createElement('div');
            resizer.className = 'resizer-bottom-right';
            resizer.classList.add('ws-zoom-fixed');
            element.appendChild(resizer);
            resizer.addEventListener('mousedown', ev => this.initDrag(ev), false);
        }
    }

    shiftDown(e: KeyboardEvent): void {
        if (["Shift", "Alt"].includes(e.key) && this.lastMouseEvent != undefined)
            this.doDrag({
                clientX: this.lastMouseEvent.clientX, clientY: this.lastMouseEvent.clientY,
                shiftKey: e.shiftKey, altKey: e.altKey, preventDefault: () => { }, stopPropagation: () => { }
            });
    }

    mousemoveFunc: any;
    mouseupFunc: any;
    keydownFunc: any;
    keyupFunc: any;
    lastMouseEvent: any;

    initDrag(e: MouseEvent) {

        this.startX = e.clientX;
        this.startY = e.clientY;
        this.startWidth = parseInt(this.element.style.width.replace("px", ""));
        this.startHeight = parseInt(this.element.style.height.replace("px", ""));

        this.elementSizeStart = getCoordinatesFromElement(this.element);
        this.listChildrenDimensions = [];
        this.listChildren.forEach(c => {
            this.listChildrenDimensions.push(getCoordinatesFromElement(c));
        });

        document.documentElement.addEventListener('mousemove', this.mousemoveFunc = this.doDrag.bind(this), false);
        document.documentElement.addEventListener('keydown', this.keydownFunc = this.shiftDown.bind(this), false);
        document.documentElement.addEventListener('keyup', this.keyupFunc = this.shiftDown.bind(this), false);
        document.documentElement.addEventListener('mouseup', this.mouseupFunc = this.stopDrag.bind(this), false);

        this.element.classList.add(classPreventInput);

        this.resizeStart();
        e.preventDefault();
        e.stopPropagation();
    }

    doDrag: Function = _.throttle((e: { clientX: number, clientY: number, shiftKey: boolean, altKey: boolean, preventDefault: Function, stopPropagation: Function }) => {

        this.lastMouseEvent = e;
        /**
         * set the new dimensions for the resize element according to the mouse position
         */
        let scale = this.owner ? this.owner.getCurrentTransform().scale : 0;
        let newWidth = (this.startWidth + (e.clientX - this.startX) / scale),
            newHeight = (this.startHeight + (e.clientY - this.startY) / scale);

        function toDegrees(radians: number) {
            return radians * (180 / Math.PI);
        }

        function calculateAngle(
            oneX: number,
            oneY: number,
            twoX: number,
            twoY: number
        ): number {
            var deltaX = twoX - oneX
            var deltaY = twoY - oneY
            return toDegrees(Math.atan2(deltaY, deltaX));
        }

        if (e.shiftKey) {

            function rotatePoint(cx: number, cy: number, angle: number, p: { x: number, y: number }) {
                let s = Math.sin(angle);
                let c = Math.cos(angle);

                // translate point back to origin:
                p.x -= cx;
                p.y -= cy;

                // rotate point
                let xnew = p.x * c - p.y * s;
                let ynew = p.x * s + p.y * c;

                // translate point back:
                p.x = xnew + cx;
                p.y = ynew + cy;
                return p;
            }

            let dist = Math.sqrt(Math.pow((e.clientX - this.startX) / scale, 2) + Math.pow((e.clientY - this.startY) / scale, 2));

            let rotatedPoint = rotatePoint(this.startX, this.startY, 45, { x: e.clientX, y: e.clientY })

            const angle = calculateAngle((rotatedPoint.x), (rotatedPoint.y), this.startX, this.startY);
            const angleNorm = angle + 180;
            const direction = (angleNorm <= 180 ? Math.abs((90 - Math.abs(angleNorm - 90)) / 90) : -Math.abs((90 - Math.abs(angleNorm - 180 - 90)) / 90));

            // let direction = this.startX < e.clientX && this.startY < e.clientY ? 1 : -1;
            let ratio = this.startHeight / this.startWidth;
            newWidth = this.startWidth + dist * direction;
            newHeight = this.startHeight + dist * direction * ratio;
        }

        if (newWidth > 250 || newHeight > 250) {

            newWidth > 250 ? this.element.style.width = newWidth + 'px' : undefined;
            newHeight > 250 ? this.element.style.height = newHeight + 'px' : undefined;


            /**
             * Calculate the scale factor
             */
            let elementSizeCurrent = getCoordinatesFromElement(this.element);
            let scaleW = elementSizeCurrent.w / this.elementSizeStart.w;
            let scaleH = elementSizeCurrent.h / this.elementSizeStart.h;


            let maxSizeReached = false;
            for (let i = 0; i < this.listChildren.length && !maxSizeReached; i++) {
                const element: HTMLElement = this.listChildren[i];
                const dimE = this.listChildrenDimensions[i];

                /**
                 * ignore not selected elements in frame elements when alt key is pressed.
                 */
                if (e.altKey && !element.classList.contains("workspace-is-selected")) {
                    continue;
                }

                const eW = dimE.w * scaleW;
                const eH = dimE.h * scaleH;

                maxSizeReached = eW > maxSize || eH > maxSize;
            }

            // resize the children
            for (let i = 0; i < this.listChildren.length && !maxSizeReached; i++) {

                const element: HTMLElement = this.listChildren[i];
                const dimE = this.listChildrenDimensions[i];

                /**
                 * ignore not selected elements in frame elements when alt key is pressed.
                 */
                if (e.altKey && !element.classList.contains("workspace-is-selected")) {
                    continue;
                }

                const eW = dimE.w * scaleW;
                const eH = dimE.h * scaleH;

                if (eW > maxSize || eH > maxSize) {
                    break;
                }

                /**
                 * Based on the distance to the origin of the resize rectangle, we calculate the new position
                 */
                set3DPosition(element,
                    this.elementSizeStart.x + ((dimE.x - this.elementSizeStart.x) * scaleW),
                    this.elementSizeStart.y + ((dimE.y - this.elementSizeStart.y) * scaleH)
                );

                if (!element.classList.contains("sizefixed")) {
                    /**
                     * the width/height act as vectors that can be scaled directly
                     */
                    setSize(element, eW, eH);

                }


            }
        }

        this.resizeStep();
        e.preventDefault();
        e.stopPropagation();

    }, 16);

    stopDrag(e: MouseEvent) {
        document.documentElement.removeEventListener('mousemove', this.mousemoveFunc, false);
        document.documentElement.removeEventListener('mouseup', this.mouseupFunc, false);
        document.documentElement.removeEventListener('keydown', this.keydownFunc, false);
        document.documentElement.removeEventListener('keyup', this.keyupFunc, false);
        this.resizeEnd();

        /**
         * Todo: Das muss bei allen ws entries passieren!
         */
        this.element.classList.remove(classPreventInput);

        e.preventDefault();
        e.stopPropagation();
    }

}



