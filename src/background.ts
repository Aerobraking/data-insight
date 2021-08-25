'use strict'

import { ipcMain, app, protocol, BrowserWindow, dialog, webContents, Menu, nativeImage } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
import { utcFormat } from 'd3'
import { InsightFile } from './store/state'
var fs = require("fs");
var path = require('path');

const isDevelopment = process.env.NODE_ENV !== 'production' 
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])


ipcMain.on('ondragstart', (event: any, filePaths: string[]) => {

  filePaths.forEach(function (e: string, index: number, theArray: string[]) {
    filePaths[index] = e.replaceAll("\\\\", "/");
    filePaths[index] = e.replaceAll("\\", "/");
  });

  console.log("start file drag: ");
  console.log(filePaths);

  event.sender.startDrag({
    files: filePaths,
    icon: "C:/OneDrive/Fotografie/Export/2015-05-02-18-26-01.jpg"
  })
})

ipcMain.on('open-insight-file', (event: any, arg: any) => {
  openFile();
})

function openFile() {
  const files = dialog.showOpenDialogSync({
    filters: [{ name: "Insight File Type", extensions: ["ins"] }],
    properties: ["openFile", "openFile"],
  });

  if (!files) { return; }

  webContents.getAllWebContents().forEach(wc => {
    wc.send('insight-file-selected', files[0]);
  })

  console.log(files);
}


ipcMain.on('save-insight-file', (event: any, arg: string) => {
  saveFile(arg);
})

function saveFile(arg: string) {
  dialog.showSaveDialog({}).then((result) => {

    if (result.canceled) { return; }

    let filepath = result.filePath;
    let ext = path.extname(filepath);

    if (ext !== ".ins") {
      filepath += ".ins";
    }

    fs.writeFile(filepath, arg, (err: any) => {
      console.log(err);
    });

  }).catch((err) => {
    console.log(err);
  });

  console.log("file saved");
}

function fireFileSaveEvent() {
  webContents.getAllWebContents().forEach(wc => {
    wc.send('fire-file-save', "");
  })
}
function fireNewFileEvent() {
  webContents.getAllWebContents().forEach(wc => {
    wc.send('fire-new-file', "");
  })
}

async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
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
          label: 'Save as',
          click() {
            fireFileSaveEvent();
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
          click() {
            win.reload()
          }
        },
        {
          label: 'Dev Tools',
          click() {
            win.webContents.openDevTools();
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
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }
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

// const fs = require('fs');
// const path = require('path');
// const { webContents } = require('electron')



// async function getFiles(dir: string, parent: OverviewNode) {
//   const files = fs.readdirSync(dir);
//   files.forEach((file: any) => {
//     const filePath = path.join(dir, file);
//     const fileStat = fs.lstatSync(filePath);

//     let child: OverviewNode = new OverviewNode(filePath);
//     child.isDirectory = fileStat.isDirectory();
//     child.name = file;
//     child.path = dir;
//     child.parent = parent
//     child.depthCalc();

//     var fileSizeInBytes = fileStat.size;
//     // Convert the file size to megabytes (optional)
//     parent.size = Math.sqrt(fileSizeInBytes / (1024 * 1024));
//     parent.children.push(child);
//     if (child.isDirectory) {
//       getFiles(filePath, child);
//     }
//   });
// }

// function createDummyTreeData(node: OverviewNode, depthMax: number, depth?: number) {
//   if (depth == undefined) {
//     depth = 0;
//   }
//   for (let i = 0; i < 13 + Math.random() * 13; i++) {
//     let name: string = Math.random().toString(36).substring(7);
//     let child = new OverviewNode(name);
//     child.name = name;
//     child.path = name;
//     node.children.push(child);
//     if (depth < depthMax) {
//       createDummyTreeData(child, depthMax, ++depth);
//     }
//   }
// }

// async function loadFiles(path: string) {
//   let rootFile: OverviewNode = new OverviewNode(path);
//   rootFile.name = "root";
//   rootFile.path = path;
//   getFiles(path, rootFile);
//   //createDummy(rootFile, 6);

//   console.log(rootFile);


//   webContents.getAllWebContents().forEach(wc => {
//     wc.send('files-added', rootFile)
//   })

// }

