'use strict'

import { ipcMain, app, protocol, BrowserWindow, dialog, webContents, Menu } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import fs from "fs";
import path from "path";
const trash = require('trash');
var usbDetect = require('usb-detection');

let win: BrowserWindow | null;
let windowWorker: BrowserWindow | null;
const FileEnding: string = ".ins";
/**
 * Error launching app
 * 
 * Unable to find Electron app at /Users/krecker/Documents/code/ma-data-insight/dist_electron

Cannot find module '/Users/krecker/Documents/code/ma-data-insight/dist_electron'
Require stack:
- /Users/krecker/Documents/code/ma-data-insight/node_modules/electron/dist/Electron.app/Contents/Resources/default_app.asar/main.js
 */
const isDevelopment = process.env.NODE_ENV !== 'production'
// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

function sendToRender(id: string, ...args: any[]) {
  // if (win) {
  //   win.webContents.send("log", id + args.join(" # "));
  //   if (windowWorker) {
  //     win.webContents.send("log", "send to worker window");
  //     windowWorker.webContents.send("log", id + args.join(" # "));
  //   }
  // }
  BrowserWindow.getAllWindows().forEach(w => {
    w.webContents.send(id, ...args);
    w.webContents.send("log", id + args.join(" # "));
  })
  // webContents.getAllWebContents().forEach(wc => {
  //   wc.send(id, ...args);
  // })
  // webContents.getAllWebContents().forEach(wc => {
  //   wc.send("log", id + args.join(" # "));
  // })
}

function getTempFilePath(): string {
  const userdata = app.getPath('userData');
  return userdata + path.sep + "temp-file" + FileEnding;
}

ipcMain.on('msg-worker', (event: any, arg: any) => {
  sendToRender("msg-worker", arg);
});

ipcMain.on('msg-main', (event: any, arg: any) => {
  sendToRender("msg-main", arg);
})

ipcMain.on('ondragstart', (event: any, filePaths: string[]) => {

  filePaths.forEach(function (e: string, index: number, theArray: string[]) {
    filePaths[index] = e.replaceAll("\\\\", "/");
    filePaths[index] = e.replaceAll("\\", "/");
  });


  if (filePaths.length > 0) {
    event.sender.startDrag({
      files: filePaths,
      icon: "C:/content-copy.png"
    })
  }

})

function detectUSBEvents() {

  usbDetect.startMonitoring();

  // Detect add or remove (change)
  usbDetect.on('change', function (device: any) {
    setTimeout(() => {
      sendToRender("usb-update");
    }, 500);
  });

}

/**
 * Usage of the trash lib: https://github.com/sindresorhus/trash
 */
ipcMain.on('move-to-trash', (event: any, args: { filePaths: string[], targetDir: string }) => {

  args.filePaths.forEach(function (e: string, index: number, theArray: string[]) {
    args.filePaths[index] = e.replaceAll("\\\\", "/");
    args.filePaths[index] = e.replaceAll("\\", "/");
  });

  if (args.filePaths.length > 0) {
    trash(args.filePaths).catch((error: any) => {
      console.log(error);
    })
      .finally(() => {
        sendToRender('move-to-trash-finished', args.targetDir);
      });
  }

})

ipcMain.on('copy-files', (event: any, args: { filePaths: string[], targetDir: string }) => {
  for (let i = 0; i < args.filePaths.length; i++) {
    const abspath = args.filePaths[i];
    const filename = path.basename(abspath);
    fs.copyFile(abspath, path.join(args.targetDir, filename), fs.constants.COPYFILE_EXCL, (err: NodeJS.ErrnoException | null) => { });
  }
})

ipcMain.on('insight-file-loaded', (event: any, arg: { filePath: string }) => {
  if (win) {
    win.setTitle(arg.filePath && arg.filePath.length > 0 ? "Data Insight: " + path.parse(path.basename(arg.filePath)).name : "Data Insight: " + "New File");
  }
})

ipcMain.on('open-insight-file', (event: any, arg: any) => {
  openFile();
})

function openFile(filePath: string | undefined = undefined) {
  if (!filePath) {
    const homeDir = require('os').homedir();
    const directory = `${homeDir}/Desktop`;

    const files = dialog.showOpenDialogSync({
      defaultPath: directory,
      filters: [{ name: "Insight File Type", extensions: ["ins"] }],
      properties: ["openFile", "openFile"],
    });

    if (!files) { return; }
    filePath = files[0];
  }

  sendToRender('insight-file-selected', filePath);
}

ipcMain.on('select-files', (event: any, arg: { target: "", type: "folders" | "files", path: string | undefined }) => {
  selectFiles(arg);
})

function selectFiles(arg: { target: "", type: "folders" | "files", path: string | undefined }) {

  if (!arg.path) {
    const homeDir = require('os').homedir(); // See: https://www.npmjs.com/package/os
    arg.path = `${homeDir}/Desktop`;
  }

  if (win) {
    const files = dialog.showOpenDialogSync(win, {
      defaultPath: arg.path,
      buttonLabel: arg.type == "folders" ? "Add Folders to Workspace" : "Add Files to Workspace",
      title: "Select Content for the Workspace",
      properties: [arg.type == "folders" ? "openDirectory" : "openFile", "multiSelections"],
    });

    if (!files) { return; }

    const directoryOfSelection = path.dirname(files[0]);

    sendToRender('files-selected', { files: files, directory: directoryOfSelection, target: arg.target });
  }
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
  { json: string, temp: boolean, path: string, chooseFile: boolean, executeSave: boolean }) => {

  if (arg.temp) {
    saveFile(arg.json, getTempFilePath(), true);
  } else {
    if (!arg.chooseFile && arg.path && arg.path.length != 0 && (arg.executeSave || fs.existsSync(arg.path))) {
      saveFile(arg.json, arg.path);
    } else {
      dialog.showSaveDialog({}).then((result) => {
        if (result.canceled) { return; }
        if (result.filePath) {
          sendToRender('fire-file-save-path-selected', checkExtention(result.filePath ? result.filePath : ""));
        }
      }).catch((err) => {
        console.log(err);
      });
    }

  }
})

ipcMain.on('closed', _ => {
  usbDetect.stopMonitoring();
  win = null;
  windowWorker = null;

  if (process.platform !== 'darwin') {

    app.quit();
  }
});

function checkExtention(filepath: string) {
  filepath = path.normalize(filepath).replace(/\\/g, "/");
  let ext = path.extname(filepath);
  if (ext !== ".ins") {
    filepath += ".ins";
  }
  return filepath;
}

function saveFile(jsonData: string, filepath: string, isTemp: boolean = false) {

  filepath = checkExtention(filepath);

  fs.writeFile(filepath, jsonData, (err: any) => {
    console.log(err);
  });

  app.addRecentDocument(filepath);

  if (!isTemp) {
    sendToRender('fire-file-saved', filepath);
  }

  if (win) {
    if (isTemp
    ) {
      win.setTitle("Data Insight: " + " New File");
    } else {
      win.setTitle("Data Insight: " + path.parse(path.basename(filepath)).name);
    }
  }

}

function fireFileSaveEvent(chooseFile: boolean) {
  sendToRender('fire-file-save', chooseFile);
}

function fireNewFileEvent() {
  sendToRender('fire-new-file', "");
}

var args = process.argv;

app.on('open-file', (event, path) => {
  args = [path];
  openFile(path);
});

ipcMain.on('get-args', (event: any, arg: any) => {
  sendToRender('send-args', args);
})

var menu: Menu;

async function createWindow() {

  detectUSBEvents();

  // Create the browser window.
  win = new BrowserWindow({
    title: "Data Insight",
    width: 1400,
    height: 800,
    minWidth: 400,
    minHeight: 400,
    // x: 10,
    // y: 10,
    center: true,
    autoHideMenuBar: false,
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

  // Create the worker window.
  windowWorker = new BrowserWindow({
    title: "worker",
    show: !true,
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

  win.on('close', (e) => {
    usbDetect.stopMonitoring();
    if (win) {
      e.preventDefault();
      win.webContents.send('app-close');
    }
  });

  // win.setMenuBarVisibility(false)
  menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          accelerator: process.platform === 'darwin' ? 'Ctrl+N' : 'Ctrl+N',
          label: 'New',
          click() {
            fireNewFileEvent();
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
          label: "Open Recent",
          role: "recentDocuments",
          submenu: [{
            label: "Clear Recent",
            role: "clearRecentDocuments"
          }]
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
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Q' : 'Ctrl+Q',
          click() {
            app.quit()
          }
        }
      ]
    },
    {
      label: "Window",
      submenu: [
        {
          role: "togglefullscreen",
          accelerator: process.platform === 'darwin' ? 'Alt+F' : 'Alt+F',
          label: 'Fullscreen'
        },
        {
          accelerator: process.platform === 'darwin' ? 'Alt+H' : 'Alt+H',
          label: 'Hide Menu',
          click() {
            if (win) {
              win.setMenuBarVisibility(!win.isMenuBarVisible());
            }
          }
        },
        {
          accelerator: process.platform === 'darwin' ? 'Alt+D' : 'Alt+D',
          label: 'Distract free mode',
          click() {
            if (win) {
              sendToRender('toggle-distract-mode');
            }
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
    windowWorker.loadURL(`app://./subpage.html`)
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
        usbDetect.stopMonitoring()
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      usbDetect.stopMonitoring()
      app.quit()
    })
  }
}
