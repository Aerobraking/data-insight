'use strict'

import { ipcMain, app, protocol, BrowserWindow, dialog, Menu } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import fs from "fs";
import path from "path";
import settings from 'electron-settings';
import trash from "trash";
import usbDetect from "usb-detection";

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

var menu: Menu;
var switchFrameType = false;
var s: {
  wX: number, wY: number, wWidth: number, wHeight: number, frame: number, maximized: number, fullscreen: number
} = {
  wWidth: 0,
  wHeight: 0,
  wX: 0,
  wY: 0,
  frame: -1,
  maximized: 1,
  fullscreen: -1,
};
const sLoaded: any = settings.getSync('settings_main');
if (sLoaded) s = sLoaded;

var args = process.argv;

let win!: BrowserWindow | null;
let windowWorker!: BrowserWindow | null;
let windowWorkerFile!: BrowserWindow | null;
const FileEnding: string = ".ins";

const isDevelopment = process.env.NODE_ENV !== 'production'
const dragpng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAABgAAAAYADwa0LPAAABEklEQVRo3u2ZsQ6CMBCG/zOsxuiss6O+qPE5NCbODs6uvoOuxlAf4HeQQREM0NKDeN/YpuW+HnBJDzA6CMkZyR1Jx5bxjTUpCh7AGcBE+yCrMCgYW/cleACQ/ABJB2AYLQAR8VpfIPDxXvo+oG0G/luYgAnUJlKdcCT3JOe/Yqn9ESvUiTuAhYhcQmUgdp0YA1iVTTbJQNQ6keFEZBRKIEqdqPqc//wLdQkT0MYEtDEBbUxAGxPQxgS0MQFtTECb3gt8Xa93/S40T+8zYALamIA2JqBN0mDNA2+XuyF6vRVIyyaaZOAYIeA8h7KJ2lU365ic8Lq3j8ENwFJErsF2zFpMW5Jpiy2mlOSG5DTSQRmNeAKIfX8Wvu/xQQAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMS0xMi0xOFQxMzozMTozNiswMDowMEVo2dcAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjEtMTItMThUMTM6MzE6MzYrMDA6MDA0NWFrAAAAAElFTkSuQmCC";
export const DragIconPath = app.getPath('userData') + path.sep + "dragicon.png";

function createDragImage() {
  var base64Data: any = dragpng.replace(/^data:image\/png;base64,/, "");
  fs.writeFile(DragIconPath, base64Data, { encoding: 'base64' }, function (err: any) {
    if (err) console.log(err);
  });
}

function isDevMode() {
  return true|| !app.isPackaged;
}

function sendToRender(id: string, ...args: any[]) {
  BrowserWindow.getAllWindows().forEach(w => {
    w.webContents.send(id, ...args);
    w.webContents.send("log", id + args.join(" # "));
  })
}

function getTempFilePath(): string {
  const userdata = app.getPath('userData');
  return userdata + path.sep + "temp-file" + FileEnding;
}

/**
 * For the Folder Sync worker
 */
ipcMain.on('msg-worker', (event: any, arg: any) => {
  sendToRender("msg-worker", arg);
});

ipcMain.on('msg-main', (event: any, arg: any) => {
  sendToRender("msg-main", arg);
})

/**
 * For the file worker
 */
ipcMain.on('msg-main-to-file', (event: any, arg: any) => {
  sendToRender("msg-main-to-file", arg);
})

ipcMain.on('msg-file-to-main', (event: any, arg: any) => {
  sendToRender("msg-file-to-main", arg);
})

ipcMain.on('ondragstart', (event: any, filePaths: string[]) => {

  filePaths.forEach(function (e: string, index: number, theArray: string[]) {
    filePaths[index] = e.replaceAll("\\\\", "/");
    filePaths[index] = e.replaceAll("\\", "/");
  });


  if (filePaths.length > 0) {
    event.sender.startDrag({
      files: filePaths,
      icon: DragIconPath
    })
  }

})

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

ipcMain.on('frame', (event: any, arg: boolean) => {
  s.frame = arg ? 1 : 0;
})

ipcMain.on('open-insight-file', (event: any, arg: any) => {
  openFile();
})

ipcMain.on('select-files', (event: any, arg: { target: "", type: "folders" | "files", path: string | undefined }) => {
  selectFiles(arg);
})

ipcMain.on('get-args', (event: any, arg: any) => {
  let sendTemp = true;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];

    try {
      if (fs.existsSync(a) && a.endsWith(".ins")) {
        sendTemp = false; break;
      }
    } catch (err) {
      console.error(err);
    }
  }

  // sendToRender('send-args', sendTemp ? [getTempFilePath()] : args);
  sendToRender('send-args', sendTemp ? ["empty"] : args);
})

ipcMain.on('show-window', (event: any, arg: any) => {
  if (win) {
    win.show();
  }
})

/**
 * Programm wird beendet
 * wir speichern die datei automatisch als temp Datei in AppData
 * Beim starten nach temp datei gucken und diese öffnen
 */
ipcMain.on('save-insight-file', (event: any, arg:
  { json: string, temp: boolean, path: string, chooseFile: boolean, executeSave: boolean }) => {

  if (arg.temp) {
    saveFile(arg.json, getTempFilePath(), true);
  } else {
    if (!arg.chooseFile && arg.path && arg.path.length != 0 && (arg.executeSave || fs.existsSync(arg.path))) {
      saveFile(arg.json, arg.path);
    } else {
      dialog.showSaveDialog({
        title: "Select .ins File",
        filters: [{ name: "Insight File Type", extensions: ["ins"] }],
      }).then((result) => {
        if (result.canceled) { return; }
        if (result.filePath) {
          sendToRender('fire-file-save-path-selected', addFileExtention(result.filePath ? result.filePath : ""));
        }
      }).catch((err) => {
        console.log(err);
      });
    }

  }
})

ipcMain.on('closed', e => {
  windowClosed();
});

function windowClosed() {

  usbDetect.stopMonitoring();

  if (win && windowWorker && windowWorkerFile) {
    windowWorker.close();
    windowWorkerFile.close();
  }

  win = null;
  windowWorker = null;
  windowWorkerFile = null;

  // if (switchFrameType) {
  //   switchFrameType = false;
  //   createWindow();
  //   return;
  // }

  if (process.platform !== 'darwin') {
    app.quit();
  }
}

app.on('open-file', (event, path) => {
  args = [path];
  openFile(path);
});

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  // if (process.platform !== 'darwin') {
  //   app.quit()
  // }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => createWindow())

function detectUSBEvents() {

  usbDetect.startMonitoring();

  // Detect add or remove (change)
  usbDetect.on('change', function (device: any) {
    setTimeout(() => {
      sendToRender("usb-update");
    }, 1200);
  });

}

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

function addFileExtention(filepath: string) {
  filepath = path.normalize(filepath).replace(/\\/g, "/");
  let ext = path.extname(filepath);
  if (ext !== ".ins") {
    filepath += ".ins";
  }
  return filepath;
}

function saveFile(jsonData: string, filepath: string, isTemp: boolean = false) {

  filepath = addFileExtention(filepath);

  fs.writeFile(filepath, jsonData, (err: any) => {
    if (err) console.log(err);
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

function updateSettings() {
  if (win) {
    s.maximized = win.isMaximized() ? 1 : 0;
    if (!win.isMaximized() && s.fullscreen != 1) {
      s.wX = win.getBounds().x;
      s.wY = win.getBounds().y;
      s.wWidth = win.getBounds().width;
      s.wHeight = win.getBounds().height;
    }
  }
}

async function createWindow() {

  detectUSBEvents();

  // Create the browser window for the view.
  win = new BrowserWindow({
    title: "Data Insight",
    width: s.wWidth > 0 ? s.wWidth : 1400,
    height: s.wHeight > 0 ? s.wHeight : 800,
    x: s.wX >= 0 ? s.wX : 0,
    y: s.wY >= 0 ? s.wY : 0,
    center: s.wX >= 0 && s.wY >= 0 ? false : true,
    minWidth: 400,
    minHeight: 400,
    show: false,
    fullscreen: s.fullscreen == 1,
    // frame: s.frame != 0 ? true : false,
    autoHideMenuBar: false,
    webPreferences: {
      enableRemoteModule: true,
      webSecurity: false,
      devTools: isDevMode(),
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegrationInWorker: true,
      nodeIntegration: (process.env
        .ELECTRON_NODE_INTEGRATION as unknown) as boolean,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION
    }
  })

  if (s.maximized == 1) win.maximize();

  win.on('resize', (e: any) => updateSettings());
  win.on('move', (e: any) => updateSettings());
  win.on('minimize', (e: any) => updateSettings());
  win.on('maximize', (e: any) => s.maximized = 1);
  win.on('unmaximize', (e: any) => s.maximized = 0);
  win.on('enter-full-screen', (e: any) => (win) ? s.fullscreen = 1 : "");
  win.on('leave-full-screen', (e: any) => win ? s.fullscreen = 0 : "");

  // Create the worker window.
  windowWorker = new BrowserWindow({
    title: "worker",
    show: !true,
    webPreferences: {
      enableRemoteModule: true,
      webSecurity: false,
      devTools: isDevMode(),
      nodeIntegrationInWorker: true,
      nodeIntegration: (process.env
        .ELECTRON_NODE_INTEGRATION as unknown) as boolean,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION
    }
  })

  // Create the file worker window.
  windowWorkerFile = new BrowserWindow({
    title: "workerfile",
    show: !true,
    webPreferences: {
      enableRemoteModule: true,
      webSecurity: false,
      devTools: isDevMode(),
      nodeIntegrationInWorker: true,
      nodeIntegration: (process.env
        .ELECTRON_NODE_INTEGRATION as unknown) as boolean,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION
    }
  })

  win.on('close', (e) => {
    console.log("win.on(close)");

    if (win) {
      console.log("  if (win) {.on(close)");
      updateSettings();
      settings.setSync('settings_main', s);
      // e.preventDefault();
      windowClosed();

      // win.webContents.send('app-close');

    }
  });
  // process.platform === 'darwin' 
  menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          accelerator: 'CmdOrCtrl+N',
          label: 'New',
          click() {
            fireNewFileEvent();
          }
        },
        {
          accelerator: 'CmdOrCtrl+O',
          label: 'Open',
          click() {
            openFile();
          }
        },
        {
          label: "Open Recent",
          // does not work in windows, needs a manual implementation
          visible: process.platform != 'darwin',
          role: "recentDocuments",
          submenu: [{
            label: "Clear Recent",
            role: "clearRecentDocuments"
          }]
        },
        {
          accelerator: 'CmdOrCtrl+S',
          label: 'Save',
          click() {
            fireFileSaveEvent(false);
          }
        },
        {
          accelerator: 'CmdOrCtrl+Shift+S',
          label: 'Save as',
          click() {
            fireFileSaveEvent(true);
          }
        },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
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
          accelerator: 'F9',
          label: 'Distract free mode',
          click() {
            if (win) {
              sendToRender('toggle-distract-mode');
            }
          }
        },
        {
          accelerator: 'F10',
          label: 'Hide Menu',
          // does not work in osx
          visible: process.platform != 'darwin',
          click() {
            if (win) {
              win.setMenuBarVisibility(!win.isMenuBarVisible());
            }
          }
        },
        {
          role: "togglefullscreen",
          accelerator: 'F11',
          label: 'Fullscreen'
        },
        /** {
         //   accelerator: 'F4',
         //   label: 'Frameless',
         //   // does not work in osx
         //   visible: process.platform != 'darwin',
         //   click() {
         //     if (win) {
         //       s.frame = s.frame == 0 ? 1 : 0;
         //       switchFrameType = true;
         //       if (win) {
         //         updateSettings();
         //         console.log("set settings: ", s);
         //         settings.setSync('settings_main', s);
         //       }
 
         //       usbDetect.stopMonitoring();
         //       if (win) {  
         //         console.log("send close event manually");
         //         win.webContents.send('app-close');
         //       }
 
         //     }
         //   }
         // },*/
        {
          label: 'Reload Page',
          visible: isDevMode(),
          accelerator: 'Ctrl+R',
          click() {
            if (win) {
              win.reload()
            }
          }
        },
        {
          label: 'Dev Tools',
          visible: isDevMode(),
          click() {
            if (win && windowWorker && windowWorkerFile) {
              win.webContents.openDevTools();
              windowWorker.webContents.openDevTools();
              windowWorkerFile.webContents.openDevTools();
            }
          }
        },
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          accelerator: "F5",
          label: 'Controls',
          click() {
            if (win) {
              sendToRender('show-help');
            }
          }
        },
        {
          accelerator: "F6",
          label: 'About',
          click() {
            if (win) {
              sendToRender('show-about');
            }
          }
        }
      ]
    }
  ])

  Menu.setApplicationMenu(menu);

  // load the last session
  win.webContents.once('dom-ready', () => { /*openFile(getTempFilePath()); */ });

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    windowWorker.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string + 'subpage');
    windowWorkerFile.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string + 'subpage2');
    // Load the url of the dev server if in development mode
    win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string);
  } else {
    createProtocol('app');
    // Load the index.html when not in development 
    windowWorker.loadURL(`app://./subpage.html`);
    windowWorkerFile.loadURL(`app://./subpage2.html`);
    win.loadURL('app://./index.html');
  }

}

createDragImage();

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
