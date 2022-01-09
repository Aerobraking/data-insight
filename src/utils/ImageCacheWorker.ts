import { create } from "underscore"; 

var canvasPreview: OffscreenCanvas;
var ctxPreview: OffscreenCanvasRenderingContext2D | null = null;
var canvasSmall: OffscreenCanvas;
var ctxSmall: OffscreenCanvasRenderingContext2D | null = null;
var canvasMedium: OffscreenCanvas;
var ctxMedium: OffscreenCanvasRenderingContext2D | null = null;

const preview = 64;
const small = 128;
const medium = 1024 + 256;
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

        try {


            /**
             * Making sure we have a url to a file. This can differantiate between OS.
             */
            const response = await fetch(e.data.path.startsWith("file://") ? e.data.path : "file://" + e.data.path)

            const blob = await response.blob()

            await createImageBitmap(blob).then(bitmap => {

                let previewSize = calculateAspectRatioFit(bitmap.width, bitmap.height, preview);
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

                // const create = (id: string, size: { width: number, height: number, ratio: number }) => {
                //     const canvas = new OffscreenCanvas(size.width, size.height);
                //     const ctx = canvas.getContext("2d");
                //     ctx?.drawImage(bitmap, 0, 0, size.width, size.height);
                //     // Once the file has been fetched, we'll convert it to a `Blob`
                //     canvas.convertToBlob().then((blob) => {
                //         // @ts-ignore: Unreachable code error
                //         postMessage({
                //             path: e.data.path,
                //             type: id,
                //             blob: blob
                //         });
                //     });
                // };

                // create("preview", previewSize);
                // create("small", smallSize);
                // create("medium", mediumSize);

                canvasPreview = new OffscreenCanvas(previewSize.width, previewSize.height);
                ctxPreview = canvasPreview.getContext("2d");
                ctxPreview?.drawImage(bitmap, 0, 0, previewSize.width, previewSize.height);
                // Once the file has been fetched, we'll convert it to a `Blob`
                canvasPreview.convertToBlob().then((blob: any) => {
                    // @ts-ignore: Unreachable code error
                    postMessage({
                        path: e.data.path,
                        type: "preview",
                        blob: blob
                    });
                });

                canvasSmall = new OffscreenCanvas(smallSize.width, smallSize.height);
                ctxSmall = canvasSmall.getContext("2d");
                ctxSmall?.drawImage(bitmap, 0, 0, smallSize.width, smallSize.height);
                // Once the file has been fetched, we'll convert it to a `Blob`
                canvasSmall.convertToBlob().then((blob: any) => {
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
                canvasMedium.convertToBlob().then((blob: any) => {
                    // @ts-ignore: Unreachable code error
                    postMessage({
                        path: e.data.path,
                        type: "medium",
                        blob: blob
                    });
                });

            });
            // @ts-ignore: Unreachable code error
            postMessage({
                path: e.data.path,
                type: "finish"
            });

        } catch (error) {
            // @ts-ignore: Unreachable code error
            postMessage({
                path: e.data.path,
                type: "error"
            });

        }



    }


}, false);
