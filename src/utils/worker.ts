 

var canvasSmall: OffscreenCanvas;
var ctxSmall: OffscreenCanvasRenderingContext2D | null = null;
var canvasMedium: OffscreenCanvas;
var ctxMedium: OffscreenCanvasRenderingContext2D | null = null;
var path: string;

const small=32;
const medium=32;

addEventListener('message', async function (e: MessageEvent) {
   
    if (e.data.msg == "init") {
        canvasSmall = e.data.cSmall;
        ctxSmall = canvasSmall.getContext("2d");

        canvasMedium = e.data.cMedium;
        ctxMedium = canvasMedium.getContext("2d");
    }

    if (e.data.msg == "create") {

        const response = await fetch(e.data.path)


        const blob = await response.blob()

        await createImageBitmap(blob).then(bitmap => {



            ctxSmall?.drawImage(bitmap, 0, 0, small, small);
            ctxMedium?.drawImage(bitmap, 0, 0, medium, medium);


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
