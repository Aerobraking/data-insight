'use strict'

import { ipcMain, app, protocol, BrowserWindow, dialog, webContents, Menu, nativeImage } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import { utcFormat } from 'd3'
import { InsightFile } from './store/state'
import fs from "fs";
import path from "path";
const isDevelopment = process.env.NODE_ENV !== 'production'
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

const FileEnding: string = ".ins";

function getTempFilePath(): string {
  const userdata = app.getPath('userData');
  return userdata + path.sep + "temp-file" + FileEnding;
}

ipcMain.on('msg-worker', (event, arg) => {
  // win?.webContents.send("msg-worker", arg)


  webContents.getAllWebContents().forEach(wc => {
    wc.send('msg-worker', arg);
  })
});

ipcMain.on('msg-main', (event: any, arg: any) => {


  webContents.getAllWebContents().forEach(wc => {
    wc.send('msg-main', arg);
  })
})
   
ipcMain.on('ondragstart', (event: any, filePaths: string[]) => {

  filePaths.forEach(function (e: string, index: number, theArray: string[]) {
    filePaths[index] = e.replaceAll("\\\\", "/");
    filePaths[index] = e.replaceAll("\\", "/");
  });

  if (filePaths.length > 0) {

    console.log(filePaths);
 
    event.sender.startDrag({
      files: filePaths,
      icon: "E:/content-copy.png"
    })

  }

})

ipcMain.on('copy-files', (event: any, args: { filePaths: string[], targetDir: string }) => {

  for (let i = 0; i < args.filePaths.length; i++) {
    const abspath = args.filePaths[i];
    const filename = path.basename(abspath);
    fs.copyFile(abspath, path.join(args.targetDir, filename), fs.constants.COPYFILE_EXCL, (err: NodeJS.ErrnoException | null) => { });
  }


})

ipcMain.on('open-insight-file', (event: any, arg: any) => {
  openFile();
})

ipcMain.on('insight-file-loaded', (event: any, arg: { filePath: string }) => {

  if (win) {
    win.setTitle(arg.filePath && arg.filePath.length > 0 ? "Data Insight: " + path.parse(path.basename(arg.filePath)).name : "Data Insight: " + "New File");
  }
})

function openFile(filePath: string | undefined = undefined) {
  if (!filePath) {
    const files = dialog.showOpenDialogSync({
      filters: [{ name: "Insight File Type", extensions: ["ins"] }],
      properties: ["openFile", "openFile"],
    });

    if (!files) { return; }
    filePath = files[0];
  }


  webContents.getAllWebContents().forEach(wc => {
    wc.send('insight-file-selected', filePath);
  })


}

/**
 * 
 * Programm wird beendet
 * wir speichern die datei automatisch als temp Datei in AppData
 * 
 * Beim starten nach temp datei gucken und diese öffnen
 * 
 * 
 * 
 */

ipcMain.on('save-insight-file', (event: any, arg:
  { json: string, temp: boolean, path: string, chooseFile: boolean }) => {
  const userdata = app.getPath('userData');
  console.log(userdata);
  if (arg.temp) {
    saveFile(arg.json, getTempFilePath(), true);
  } else {
    if (!arg.chooseFile && arg.path && arg.path.length != 0 && fs.existsSync(arg.path)) {
      saveFile(arg.json, arg.path);
    } else {
      dialog.showSaveDialog({}).then((result) => {
        if (result.canceled) { return; }
        if (result.filePath) {
          saveFile(arg.json, result.filePath);
        }
      }).catch((err) => {
        console.log(err);
      });
    }

  }
})

ipcMain.on('closed', _ => {
  win = null;
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function saveFile(jsonData: string, filepath: string, isTemp: boolean = false) {

  console.log("save file: " + filepath);

  let ext = path.extname(filepath);

  if (ext !== ".ins") {
    filepath += ".ins";
  }

  fs.writeFile(filepath, jsonData, (err: any) => {
    console.log(err);
  });

  if (!isTemp) {
    webContents.getAllWebContents().forEach(wc => {
      wc.send('fire-file-saved', filepath);
    })
  }

  if (win) {
    if (isTemp
    ) {
      win.setTitle("Data Insight: " + " New File");
    } else {
      win.setTitle("Data Insight: " + path.parse(path.basename(filepath)).name);
    }
  }

  console.log("file saved");
}

function fireFileSaveEvent(chooseFile: boolean) {
  webContents.getAllWebContents().forEach(wc => {
    wc.send('fire-file-save', chooseFile);
  })
}
function fireNewFileEvent() {
  webContents.getAllWebContents().forEach(wc => {
    wc.send('fire-new-file', "");

  })
}

let win: BrowserWindow | null;
let windowWorker: BrowserWindow | null;


async function createWindow() {

  // Create the browser window.
  win = new BrowserWindow({
    title: "Data Insight",
    width: 1400,
    height: 800,
    x: 10,
    y: 10,
    webPreferences: {
      enableRemoteModule: true,
      webSecurity: false,
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegrationInWorker: true,
      nodeIntegration: (process.env
        .ELECTRON_NODE_INTEGRATION as unknown) as boolean,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION
    }
  })

  console.log("nodeingetragtion: ");
  console.log((process.env
    .ELECTRON_NODE_INTEGRATION as unknown) as boolean);
  console.log(!process.env.ELECTRON_NODE_INTEGRATION);


  // Create the worker window.
  windowWorker = new BrowserWindow({
    title: "worker",
    show: false,
    webPreferences: {
      enableRemoteModule: true,
      webSecurity: false,
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegrationInWorker: true,
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.on('close', (e) => {
    if (win) {
      e.preventDefault();
      win.webContents.send('app-close');
    }
  });
  // win.setMenuBarVisibility(false)
  var menu = Menu.buildFromTemplate([
    {
      label: 'Menu',
      submenu: [
        {
          role: "togglefullscreen",
          accelerator: process.platform === 'darwin' ? 'Alt+F' : 'Alt+F',
          label: 'Fullscreen'
        },
        {
          accelerator: process.platform === 'darwin' ? 'Ctrl+N' : 'Ctrl+N',
          label: 'New File',
          click() {
            fireNewFileEvent();
          }
        },
        {
          accelerator: process.platform === 'darwin' ? 'Ctrl+S' : 'Ctrl+S',
          label: 'Save',
          click() {
            fireFileSaveEvent(false);
          }
        },
        {
          accelerator: process.platform === 'darwin' ? 'Ctrl+Shift+S' : 'Ctrl+Shift+S',
          label: 'Save as',
          click() {
            fireFileSaveEvent(true);
          }
        },
        {
          accelerator: process.platform === 'darwin' ? 'Ctrl+O' : 'Ctrl+O',
          label: 'Open',
          click() {
            openFile();
          }
        },
        {
          label: 'Reload Page',
          accelerator: 'Ctrl+R',
          click() {
            if (win) {
              win.reload()
            }
          }
        },
        {
          label: 'Dev Tools',
          click() {
            if (win && windowWorker) {
              win.webContents.openDevTools();
              windowWorker.webContents.openDevTools();
            }
          }
        },
        {
          label: 'Exit',
          click() {
            app.quit()
          }
        }
      ]
    }
  ])
  Menu.setApplicationMenu(menu);

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    windowWorker.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string + 'subpage')
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    windowWorker.loadURL('app://./worker.html')
    win.loadURL('app://./index.html')
  }

  openFile(getTempFilePath());
}


// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    // try {
    //   await installExtension(VUEJS3_DEVTOOLS)
    // } catch (e) {
    //   console.error('Vue Devtools failed to install:', e.toString())
    // }
  }
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
