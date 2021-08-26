 


var canvasSmall: OffscreenCanvas;
var ctxSmall: OffscreenCanvasRenderingContext2D | null = null;
var canvasMedium: OffscreenCanvas;
var ctxMedium: OffscreenCanvasRenderingContext2D | null = null;
var path: string;

const small = 64;
const medium = 256;


/**
 * Conserve aspect ratio of the original region. Useful when shrinking/enlarging
 * images to fit into a certain area.
 * From: https://stackoverflow.com/questions/3971841/how-to-resize-images-proportionally-keeping-the-aspect-ratio
 *
 * @param {Number} srcWidth width of source image
 * @param {Number} srcHeight height of source image
 * @param {Number} maxWidth maximum available width
 * @param {Number} maxHeight maximum available height
 * @return {Object} { width, height }
 */
function calculateAspectRatioFit(srcWidth: number, srcHeight: number, maxWidth: number, maxHeight: number = maxWidth): { width: number, height: number } {

    var ratio: number = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);

    return { width: srcWidth * ratio, height: srcHeight * ratio };
}

addEventListener('message', async function (e: MessageEvent) {

    if (e.data.msg == "init") {

    }

    if (e.data.msg == "create") {

        const response = await fetch(e.data.path)


        const blob = await response.blob()

        await createImageBitmap(blob).then(bitmap => {


            let smallSize = calculateAspectRatioFit(bitmap.width, bitmap.height, small);
            let mediumSize = calculateAspectRatioFit(bitmap.width, bitmap.height, medium);


            canvasSmall = new OffscreenCanvas(smallSize.width, smallSize.height);
            ctxSmall = canvasSmall.getContext("2d");
            canvasMedium = new OffscreenCanvas(mediumSize.width, mediumSize.height);
            ctxMedium = canvasMedium.getContext("2d");



            ctxSmall?.drawImage(bitmap, 0, 0, smallSize.width, smallSize.height);
            ctxMedium?.drawImage(bitmap, 0, 0, mediumSize.width, mediumSize.height);


            // Once the file has been fetched, we'll convert it to a `Blob`
            canvasSmall.convertToBlob().then((blob) => {


                // @ts-ignore: Unreachable code error
                postMessage({
                    path: path,
                    type: "small",
                    blob: blob
                });

            });
            canvasMedium.convertToBlob().then((blob) => {

                // @ts-ignore: Unreachable code error
                postMessage({
                    path: path,
                    type: "medium",
                    blob: blob
                });

            });
        });

        path = e.data.path;

    }


}, false);
