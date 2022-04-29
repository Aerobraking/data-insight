/**
 * This file handles the creation of images for using them in the HTML UI.
 * It loads the image data from the given image file paths and creates various previews of them.
 */
var canvasPreview: OffscreenCanvas;
var ctxPreview: OffscreenCanvasRenderingContext2D | null = null;
var canvasSmall: OffscreenCanvas;
var ctxSmall: OffscreenCanvasRenderingContext2D | null = null;
var canvasMedium: OffscreenCanvas;
var ctxMedium: OffscreenCanvasRenderingContext2D | null = null;
var canvasOrig: OffscreenCanvas;
var ctxOrig: OffscreenCanvasRenderingContext2D | null = null;

const preview = 64;
const small = 256;
const medium = 1024 + 512;

const mapBlobs: Map<string, any> = new Map();
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

            if (e.data.type == "step0") {

                const response = await fetch(e.data.path.startsWith("file://") ? e.data.path : "file://" + e.data.path)

                const blob = await response.blob()

                await createImageBitmap(blob).then(bitmap => {

                    let previewSize = calculateAspectRatioFit(bitmap.width, bitmap.height, preview);

                    // @ts-ignore: Unreachable code error
                    postMessage({
                        type: "size",
                        path: e.data.path,
                        width: bitmap.width,
                        height: bitmap.height,
                        ratio: previewSize.ratio
                    });

                    canvasPreview = new OffscreenCanvas(previewSize.width, previewSize.height);
                    ctxPreview = canvasPreview.getContext("2d");
                    ctxPreview?.drawImage(bitmap, 0, 0, previewSize.width, previewSize.height);
                    // Once the file has been fetched, we'll convert it to a `Blob`
                    canvasPreview.convertToBlob().then((blob: any) => {
                        mapBlobs.set(e.data.path, bitmap);

                        // @ts-ignore: Unreachable code error
                        postMessage({
                            path: e.data.path,
                            type: "preview",
                            blob: blob,
                            index: e.data.index
                        });
                    });

                });
            }

            if (e.data.type == "step1") {

                let bitmap = mapBlobs.get(e.data.path);

                if (bitmap) {
                    code(bitmap);
                } else {
                    /** 
                     * Making sure we have a url to a file. This can differantiate between OS.
                     */
                    const response = await fetch(e.data.path.startsWith("file://") ? e.data.path : "file://" + e.data.path)
                    const blob = await response.blob()
                    await createImageBitmap(blob).then(bitmapLoaded => {
                        code(bitmapLoaded);
                    });
                }

                function code(bitmap: any) {

                    let smallSize = calculateAspectRatioFit(bitmap.width, bitmap.height, small);
                    let mediumSize = calculateAspectRatioFit(bitmap.width, bitmap.height, medium);

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

                            canvasOrig = new OffscreenCanvas(bitmap.width, bitmap.height);
                            ctxOrig = canvasOrig.getContext("2d");
                            ctxOrig?.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
                            canvasOrig.convertToBlob().then((blob: any) => {
                                // @ts-ignore: Unreachable code error
                                postMessage({
                                    path: e.data.path,
                                    type: "original",
                                    blob: blob
                                });

                                // @ts-ignore: Unreachable code error
                                postMessage({
                                    path: e.data.path,
                                    type: "finish"
                                });

                                // remove the bitmap afer finishing creating the images
                                mapBlobs.delete(e.data.path);
                            });

                        });
                    });






                }

            }





            // /**
            //  * Making sure we have a url to a file. This can differantiate between OS.
            //  */
            // const response = await fetch(e.data.path.startsWith("file://") ? e.data.path : "file://" + e.data.path)

            // const blob = await response.blob()

            // await createImageBitmap(blob).then(bitmap => {

            //     let previewSize = calculateAspectRatioFit(bitmap.width, bitmap.height, preview);


            //     // @ts-ignore: Unreachable code error
            //     postMessage({
            //         type: "size",
            //         path: e.data.path,
            //         width: bitmap.width,
            //         height: bitmap.height,
            //         ratio: smallSize.ratio
            //     });

            //     canvasPreview = new OffscreenCanvas(previewSize.width, previewSize.height);
            //     ctxPreview = canvasPreview.getContext("2d");
            //     ctxPreview?.drawImage(bitmap, 0, 0, previewSize.width, previewSize.height);
            //     // Once the file has been fetched, we'll convert it to a `Blob`
            //     canvasPreview.convertToBlob().then((blob: any) => {
            //         // @ts-ignore: Unreachable code error
            //         postMessage({
            //             path: e.data.path,
            //             type: "preview",
            //             blob: blob,
            //             index: e.data.index
            //         });
            //     });

            //     // }

            //     // if (e.data.type == "step1") {

            //     let smallSize = calculateAspectRatioFit(bitmap.width, bitmap.height, small);
            //     let mediumSize = calculateAspectRatioFit(bitmap.width, bitmap.height, medium);

            //     canvasSmall = new OffscreenCanvas(smallSize.width, smallSize.height);
            //     ctxSmall = canvasSmall.getContext("2d");
            //     ctxSmall?.drawImage(bitmap, 0, 0, smallSize.width, smallSize.height);
            //     // Once the file has been fetched, we'll convert it to a `Blob`
            //     canvasSmall.convertToBlob().then((blob: any) => {
            //         // @ts-ignore: Unreachable code error
            //         postMessage({
            //             path: e.data.path,
            //             type: "small",
            //             blob: blob
            //         });
            //     });

            //     canvasMedium = new OffscreenCanvas(mediumSize.width, mediumSize.height);
            //     ctxMedium = canvasMedium.getContext("2d");
            //     ctxMedium?.drawImage(bitmap, 0, 0, mediumSize.width, mediumSize.height);
            //     canvasMedium.convertToBlob().then((blob: any) => {
            //         // @ts-ignore: Unreachable code error
            //         postMessage({
            //             path: e.data.path,
            //             type: "medium",
            //             blob: blob
            //         });
            //     });

            //     canvasOrig = new OffscreenCanvas(bitmap.width, bitmap.height);
            //     ctxOrig = canvasOrig.getContext("2d");
            //     ctxOrig?.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
            //     canvasOrig.convertToBlob().then((blob: any) => {
            //         // @ts-ignore: Unreachable code error
            //         postMessage({
            //             path: e.data.path,
            //             type: "original",
            //             blob: blob
            //         });
            //     });

            // });


        } catch (error) {
            // @ts-ignore: Unreachable code error
            postMessage({
                path: e.data.path,
                type: "error"
            });

        }



    }


}, false);
