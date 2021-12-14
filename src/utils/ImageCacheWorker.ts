var canvasSmall: OffscreenCanvas;
var ctxSmall: OffscreenCanvasRenderingContext2D | null = null;
var canvasMedium: OffscreenCanvas;
var ctxMedium: OffscreenCanvasRenderingContext2D | null = null;

const small = 32;
const medium = 1024;
// const medium = 128;

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
function calculateAspectRatioFit(srcWidth: number, srcHeight: number, maxWidth: number, maxHeight: number = maxWidth): { width: number, height: number, ratio: number } {

    maxWidth = Math.min(maxWidth, srcWidth);
    maxHeight = Math.min(maxHeight, srcHeight);

    var ratio: number = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);

    return { width: srcWidth * ratio, height: srcHeight * ratio, ratio: srcHeight / srcWidth };
}

addEventListener('message', async function (e: MessageEvent) {

    if (e.data.msg == "create") {
  
        /**
         * Making sure we have a url to a file.
         */
        const response = await fetch(e.data.path.startsWith("file://") ? e.data.path : "file://" + e.data.path)

        const blob = await response.blob()

        await createImageBitmap(blob).then(bitmap => {

            let smallSize = calculateAspectRatioFit(bitmap.width, bitmap.height, small);
            let mediumSize = calculateAspectRatioFit(bitmap.width, bitmap.height, medium);

            // @ts-ignore: Unreachable code error
            postMessage({
                type: "size",
                path: e.data.path,
                width: bitmap.width,
                height: bitmap.height,
                ratio: smallSize.ratio
            });

            canvasSmall = new OffscreenCanvas(smallSize.width, smallSize.height);
            ctxSmall = canvasSmall.getContext("2d");
            ctxSmall?.drawImage(bitmap, 0, 0, smallSize.width, smallSize.height);
            // Once the file has been fetched, we'll convert it to a `Blob`
            canvasSmall.convertToBlob().then((blob) => {
                // @ts-ignore: Unreachable code error
                postMessage({
                    path: e.data.path,
                    type: "small",
                    blob: blob
                });
            });

            canvasMedium = new OffscreenCanvas(mediumSize.width, mediumSize.height);
            ctxMedium = canvasMedium.getContext("2d");
            ctxMedium?.drawImage(bitmap, 0, 0, mediumSize.width, mediumSize.height);
            canvasMedium.convertToBlob().then((blob) => {
                // @ts-ignore: Unreachable code error
                postMessage({
                    path: e.data.path,
                    type: "medium",
                    blob: blob
                });
            });


        });


    }


}, false);
