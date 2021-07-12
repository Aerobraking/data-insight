import * as WSUtils from "@/components/workspace/WorkspaceUtils";

export let resizeClasseName = "resizable";
export const classPreventInput = "resizable-prevent-input";


export function resize(element: HTMLElement) {


    let startX: number, startY: number, startWidth: number, startHeight: number, originalWidth: number, originalHeight: number;


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

        element.classList.remove(classPreventInput);
    }


}

