export let resizeClasseName = "resizable";
export const classPreventInput = "prevent-input";

export function resize(element: HTMLElement) {

    let startX: number, startY: number, startWidth: number, startHeight: number, originalWidth: number, originalHeight: number;

    /**
     * Todo: Das muss bei allen ws entries passieren!
     */
    element.classList.toggle(resizeClasseName);

    var scaledChild: HTMLElement = element.firstChild as HTMLElement;

    originalWidth = parseInt(element.style.width.replace("px", ""));
    originalHeight = parseInt(element.style.height.replace("px", ""));

    scaledChild.style.width = (originalWidth) + 'px';
    scaledChild.style.height = (originalHeight) + 'px';
    scaledChild.style.position = "absolute";
    scaledChild.style.transformOrigin = "top left";

    var resizer = document.createElement('div');
    resizer.className = 'resizer';
    element.appendChild(resizer);
    resizer.addEventListener('mousedown', initDrag, false);

    function initDrag(e: MouseEvent) {
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(element.style.width.replace("px", ""));
        startHeight = parseInt(element.style.height.replace("px", ""));
        document.documentElement.addEventListener('mousemove', doDrag, false);
        document.documentElement.addEventListener('mouseup', stopDrag, false);

        element.classList.add(classPreventInput);
    }

    function doDrag(e: MouseEvent) {

        let newWidth = (startWidth + e.clientX - startX),
            newHeight = (startHeight + e.clientY - startY);


        scaledChild.style.transform = "scale(" + (newWidth / originalWidth) + "," + (newHeight / originalHeight) + ")";

        element.style.width = newWidth + 'px';
        element.style.height = (originalHeight * (newWidth / originalWidth)) + 'px';
    }

    function stopDrag(e: MouseEvent) {
        document.documentElement.removeEventListener('mousemove', doDrag, false); document.documentElement.removeEventListener('mouseup', stopDrag, false);

        /**
     * Todo: Das muss bei allen ws entries passieren!
     */
        element.classList.remove(classPreventInput);
    }


}

export interface ElementDimension {
    x: number,
    y: number,
    w: number,
    h: number,
    x2: number,
    y2: number,
}

export class ElementDimensionInstance implements ElementDimension {

    constructor(x: number,
        y: number,
        w: number,
        h: number) {
        this.x = x;
        this.y = y;
        this.w = h;
        this.h = h;
        this.x2 = 0;
        this.y2 = 0;
    }
    x: number;
    y: number;
    w: number;
    h: number;
    x2: number;
    y2: number;
}

export function editElementDimension(d: ElementDimension, coord: (n: number) => number, size: (n: number) => number): void {
    coord(d.x);
    coord(d.x2);
    coord(d.y);
    coord(d.y2);
    size(d.w);
    size(d.h);
}

export function getCoordinatesFromElement(e: any): ElementDimension {
    let results: string = e.style.transform;
    results = results
        .replace("translate3d(", "")
        .replace(")", "")
        .replaceAll("px", "")
        .replaceAll(" ", "");
    let values: number[] = results.split(",").map(Number);

    let w: number = parseInt(e.offsetWidth),
        h: number = parseInt(e.offsetHeight);

    w = w == NaN ? 0 : w;
    h = h == NaN ? 0 : h;

    return {
        x: Math.round(values[0]),
        y: Math.round(values[1]),
        w: Math.round(w),
        h: Math.round(h),
        x2: Math.round(values[0] + w),
        y2: Math.round(values[1] + h),
    };
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
            resizeElement.addEventListener('mousedown', ev => this.initDrag(ev), false);
        } else {
            resizer = document.createElement('div');
            resizer.className = 'resizer-bottom-right';
            resizer.classList.add('ws-zoom-fixed');
            element.appendChild(resizer);
            resizer.addEventListener('mousedown', ev => this.initDrag(ev), false);
        }




        // resizer = document.createElement('div');
        // resizer.className = 'resizer-bottom-left';
        // resizer.classList.add('ws-zoom-fixed');
        // element.appendChild(resizer);
        // resizer.addEventListener('mousedown', ev => this.initDrag(ev), false);

        // resizer = document.createElement('div');
        // resizer.className = 'resizer-top-left';
        // resizer.classList.add('ws-zoom-fixed');
        // element.appendChild(resizer);
        // resizer.addEventListener('mousedown', ev => this.initDrag(ev), false);
    }

    mousemoveFunc: any;
    mouseupFunc: any;

    initDrag(e: MouseEvent) {
        this.startX = e.clientX;
        this.startY = e.clientY;

        this.elementSizeStart = getCoordinatesFromElement(this.element);
        this.listChildrenDimensions = [];
        this.listChildren.forEach(c => {
            this.listChildrenDimensions.push(getCoordinatesFromElement(c));
        });

        this.startWidth = parseInt(this.element.style.width.replace("px", ""));
        this.startHeight = parseInt(this.element.style.height.replace("px", ""));
        document.documentElement.addEventListener('mousemove', this.mousemoveFunc = this.doDrag.bind(this), false);
        document.documentElement.addEventListener('mouseup', this.mouseupFunc = this.stopDrag.bind(this), false);

        this.element.classList.add(classPreventInput);

        this.resizeStart();
        e.preventDefault();
        e.stopPropagation();
    }

    doDrag(e: MouseEvent) {

        /**
         * set the new dimensions for the resize element according to the mouse position
         */
        let scale = this.owner ? this.owner.getCurrentTransform().scale : 0;
        let newWidth = (this.startWidth + (e.clientX - this.startX) / scale),
            newHeight = (this.startHeight + (e.clientY - this.startY) / scale);

        if (e.shiftKey) {
            let dist = Math.sqrt(Math.pow((e.clientX - this.startX) / scale, 2) + Math.pow((e.clientY - this.startY) / scale, 2));
            let direction = this.startX < e.clientX && this.startY < e.clientY ? 1 : -1;
            let ratio = this.startHeight / this.startWidth;
            newWidth = this.startWidth + dist * direction;
            newHeight = this.startHeight + dist * direction * ratio;
        }

        if (newWidth > 250 && newHeight > 250) {


            this.element.style.width = newWidth + 'px';
            this.element.style.height = newHeight + 'px';


            /**
             * Calculate the scale factor
             */
            let elementSizeCurrent = getCoordinatesFromElement(this.element);
            let scaleW = elementSizeCurrent.w / this.elementSizeStart.w;
            let scaleH = elementSizeCurrent.h / this.elementSizeStart.h;

            // resize the children
            for (let i = 0; i < this.listChildren.length; i++) {

                const element: HTMLElement = this.listChildren[i];
                const dimE = this.listChildrenDimensions[i];

                /**
                 * ignore not selected elements in frame elements when alt key is pressed.
                 */
                if (e.altKey && !element.classList.contains("workspace-is-selected")) {
                    continue;
                }

                /**
                 * Based on the distance to the origin of the resize rectangle, we calculate the new position
                 */
                set3DPosition(element,
                    this.elementSizeStart.x + ((dimE.x - this.elementSizeStart.x) * scaleW),
                    this.elementSizeStart.y + ((dimE.y - this.elementSizeStart.y) * scaleH)
                );

                const eW = dimE.w * scaleW;
                const eH = dimE.h * scaleH;

                if (!element.classList.contains("sizefixed") && eW < 14000 && eH < 14000) {
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

    }

    stopDrag(e: MouseEvent) {
        document.documentElement.removeEventListener('mousemove', this.mousemoveFunc, false);
        document.documentElement.removeEventListener('mouseup', this.mouseupFunc, false);
        this.resizeEnd();

        /**
         * Todo: Das muss bei allen ws entries passieren!
         */
        this.element.classList.remove(classPreventInput);

        e.preventDefault();
        e.stopPropagation();
    }

}



