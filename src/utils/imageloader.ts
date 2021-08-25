/*
 * image-loader.worker.js
 */

addEventListener('message', async event => {
  const imageURL = event.data

  const response = await fetch(imageURL)
  const blob = await response.blob()

  // Send the image data to the UI thread!
  // @ts-ignore: Unreachable code error
  postMessage({ 
    blob: blob
  });

});
 

/*



Die Bild Componente wird erstellt. Wir nehmen den Pfad und schicken ihn zum Handler mit nem callback.

Der Handler hat nen Worker gestartet und schickt ihm das Bild zum bearbeitetn.

der Worker erstellt ein Image Objekt und lädt es.

Zeichne das Bild als kleine Thumbnail auf den Canvas.

Mache aus dem Canvas ein Blob und schicke es zurück zum Handler:
Dabei muss das Bild per Pfad und größe "small, medium, large" in einer Map gespeichert werden.

# const bitmap = canvas.transferToImageBitmap();
# self.postMessage({msg: 'render', bitmap}); 

Wir speichern dann zu jedem Pfad die verschiedenen thumbnails (blobs oder data urls?) in der Map

"small" wird zu erst erstellt und zurückgeschickt, der Handler schickt für jede größe eine callback nachricht zurück an alle Bild Componenten die sich angemeldet haben.

Jedes Bild muss dann passend zu seiner Zoomstufe die Background URL entsprechend anpassen url



*/