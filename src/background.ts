/**
 * This file is the starting point of our app. This code is executed in the background thread which handles
 * the creation of the windows and some OS specific things the render threads aren't allowed to do. 
 */
import { ipcMain, app, protocol, BrowserWindow, dialog, Menu } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import fs from "fs";
import path from "path";
import settings from 'electron-settings';
import trash from "trash";
import usbDetect from "usb-detection";
import IPCMessageType from './IpcMessageTypes';

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

interface WindowSettings {
  wX: number, wY: number, wWidth: number, wHeight: number, frame: number, maximized: number, fullscreen: number
}

var menu: Menu;
var windowSettings: WindowSettings = {
  wWidth: 0,
  wHeight: 0,
  wX: 0,
  wY: 0,
  frame: -1,
  maximized: 1,
  fullscreen: -1,
};
// try to load saved window settings
const windowSettingsLoaded: any = settings.getSync('settings_main');
if (windowSettingsLoaded) windowSettings = windowSettingsLoaded;

// arguments from the app process
var args = process.argv;

let win!: BrowserWindow | null;
let windowWorker!: BrowserWindow | null;
let windowWorkerFile!: BrowserWindow | null;
const FileEnding: string = ".ins";

export const DragIconPath = app.getPath('userData') + path.sep + "dragicon.png";

/**
 * Creates an png in the user folder that is used for the drag icon that is attached to the mouse.
 * Without an existing icon the drag method does not work.
 */
function createDragImage() {
  const dragpng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QAAAAAAAD5Q7t/AAAACXBIWXMAAABgAAAAYADwa0LPAAABEklEQVRo3u2ZsQ6CMBCG/zOsxuiss6O+qPE5NCbODs6uvoOuxlAf4HeQQREM0NKDeN/YpuW+HnBJDzA6CMkZyR1Jx5bxjTUpCh7AGcBE+yCrMCgYW/cleACQ/ABJB2AYLQAR8VpfIPDxXvo+oG0G/luYgAnUJlKdcCT3JOe/Yqn9ESvUiTuAhYhcQmUgdp0YA1iVTTbJQNQ6keFEZBRKIEqdqPqc//wLdQkT0MYEtDEBbUxAGxPQxgS0MQFtTECb3gt8Xa93/S40T+8zYALamIA2JqBN0mDNA2+XuyF6vRVIyyaaZOAYIeA8h7KJ2lU365ic8Lq3j8ENwFJErsF2zFpMW5Jpiy2mlOSG5DTSQRmNeAKIfX8Wvu/xQQAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMS0xMi0xOFQxMzozMTozNiswMDowMEVo2dcAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjEtMTItMThUMTM6MzE6MzYrMDA6MDA0NWFrAAAAAElFTkSuQmCC";
  var base64Data: any = dragpng.replace(/^data:image\/png;base64,/, "");
  fs.writeFile(DragIconPath, base64Data, { encoding: 'base64' }, function (err: any) {
    if (err) console.log(err);
  });
}

/**
 * 
 * @returns true: activates some debugging outputs.
 */
function isDevMode() {
  return true || !app.isPackaged;
}

/**
 * Sends the given data to all open windows (so to their render threads)
 * @param id 
 * @param args 
 */
function sendToWindows(id: string, ...args: any[]) {
  BrowserWindow.getAllWindows().forEach(w => {
    w.webContents.send(id, ...args);
    w.webContents.send("log", id + args.join(" # "));
  })
}

/**
 * The app can save the last used file in the user folder so it can be recoverd when starting the app again.
 * @returns Returns the path to the backup file of the last active file in the app.
 */
function getTempFilePath(): string {
  const userdata = app.getPath('userData');
  return userdata + path.sep + "temp-file" + FileEnding;
}

/**
 * This makes sure that all ipc messages are shared between all windows.
 * yes, that should be optimized so each message is only send to the window that
 * needs to get the message. :/
 */
for (let t in IPCMessageType) {
  ipcMain.on(t, (event: any, arg: any) => {
    sendToWindows(t, arg);
  });
}

/**
 * Starts the drag operation in the OS. The message is send from the render.
 */
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
 * Puts the given files into the trash. Tested for Windows and macOS.
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
        sendToWindows('move-to-trash-finished', args.targetDir);
      });
  }

})

/**
 * Copy the given files/folders to the given target Directory.
 */
ipcMain.on('copy-files', (event: any, args: { filePaths: string[], targetDir: string }) => {
  for (let i = 0; i < args.filePaths.length; i++) {
    const abspath = args.filePaths[i];
    const filename = path.basename(abspath);
    fs.copyFile(abspath, path.join(args.targetDir, filename), fs.constants.COPYFILE_EXCL, (err: NodeJS.ErrnoException | null) => { });
  }
})

/**
 * Updates the window title when a file is loaded.
 */
ipcMain.on('insight-file-loaded', (event: any, arg: { filePath: string }) => {
  if (win) {
    win.setTitle(arg.filePath && arg.filePath.length > 0 ? "Data Insight: " + path.parse(path.basename(arg.filePath)).name : "Data Insight: " + "New File");
  }
})

ipcMain.on('frame', (event: any, arg: boolean) => {
  windowSettings.frame = arg ? 1 : 0;
})

ipcMain.on('open-insight-file', (event: any, arg: any) => {
  openFile();
})

ipcMain.on('select-files', (event: any, arg: { target: "", type: "folders" | "files", path: string | undefined }) => {
  selectFiles(arg);
})

/**
 * When getting the mssage, the arguments that the app process recieved are send to the render.
 */
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

  sendToWindows('send-args', sendTemp ? ["empty"] : args);
})

/**
 * When the render has finished preparing all objects it sends this message
 * so the user won't see a window without content.
 */
ipcMain.on('show-window', (event: any, arg: any) => {
  if (win) {
    win.show();
  }
})

/**
 * Saves the given json string to a file.
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
          sendToWindows('fire-file-save-path-selected', addFileExtention(result.filePath ? result.filePath : ""));
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

/**
 * When the app window is closed we kill all worker windows and quit the app (unless we are on macOS)
 */
function windowClosed() {

  usbDetect.stopMonitoring();

  if (win && windowWorker && windowWorkerFile) {
    windowWorker.close();
    windowWorkerFile.close();
  }

  win = null;
  windowWorker = null;
  windowWorkerFile = null;

  if (process.platform !== 'darwin') {
    app.quit();
  }
}

app.on('open-file', (event, path) => {
  args = [path]; openFile(path);
});

/**
 * On macOS it's common to re-create a window in the app when the
 * dock icon is clicked and there are no other windows open.
 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

/**
 * This method will be called when Electron has finished
 * initialization and is ready to create browser windows.
 * Some APIs can only be used after this event occurs.
 */
app.on('ready', async () => createWindow())

/**
 * Start the monitoring of usb events. Is used for detecting
 * usb storages so we can refresh drive list in the Folder Views.
 */
function startUSBMonitoring() {

  usbDetect.startMonitoring();

  /**
   * Detect add or remove (change), use a delay because otherwise the drive will not already be 
   * available via the drivelist package.
   */
  usbDetect.on('change', function (device: any) {
    setTimeout(() => {
      sendToWindows("usb-update");
    }, 1200);
  });

}

/**
 * Loads the file for the given filepath or opens a dialog for selecting a file.
 * @param filePath the path to the file that should be loaded. When undefinied a dialog will be opened
 * to select a file.
 */
function openFile(filePath: string | undefined = undefined): void {
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


  sendToWindows('insight-file-selected', filePath);
}

/**
 * Opens a dialog for selecting multiple files or folders (not both) from the file system.
 * @param arg
 */
function selectFiles(arg: { target: "", type: "folders" | "files", path: string | undefined }): void {

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

    sendToWindows('files-selected', { files: files, directory: directoryOfSelection, target: arg.target });
  }
}

/**
 * Adds the .ins file extention to the given path if not exisiting.
 * @param filepath
 * @returns the given filepath with the .ins extention.
 */
function addFileExtention(filepath: string) {
  filepath = path.normalize(filepath).replace(/\\/g, "/");
  let ext = path.extname(filepath);
  if (ext !== ".ins") {
    filepath += ".ins";
  }
  return filepath;
}

/**
 * Writes the given json data to the file for the given path.
 * @param jsonData the json data that should be saved.
 * @param filepath the path to the file where the json data should be saved in.
 * @param isTemp true: ignores the filepath and saves it as the backup file in the user directory
 */
function saveFile(jsonData: string, filepath: string, isTemp: boolean = false) {

  filepath = addFileExtention(filepath);

  fs.writeFile(filepath, jsonData, (err: any) => {
    if (err) console.log(err);
  });

  app.addRecentDocument(filepath);

  if (!isTemp) {
    sendToWindows('fire-file-saved', filepath);
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
  sendToWindows('fire-file-save', chooseFile);
}

function fireNewFileEvent() {
  sendToWindows('fire-new-file', "");
}

/**
 * Gets the current window settings and put them into the windowsettings instance.
 */
function updateSettings() {
  if (win) {
    windowSettings.maximized = win.isMaximized() ? 1 : 0;
    if (!win.isMaximized() && windowSettings.fullscreen != 1) {
      windowSettings.wX = win.getBounds().x;
      windowSettings.wY = win.getBounds().y;
      windowSettings.wWidth = win.getBounds().width;
      windowSettings.wHeight = win.getBounds().height;
    }
  }
}

/**
 * This method starts the actual app by creating all windows and setting up some event listeners.
 */
async function createWindow() {

  startUSBMonitoring();

  // Create the browser window for the view.
  win = new BrowserWindow({
    title: "Data Insight",
    width: windowSettings.wWidth > 0 ? windowSettings.wWidth : 1400,
    height: windowSettings.wHeight > 0 ? windowSettings.wHeight : 800,
    x: windowSettings.wX >= 0 ? windowSettings.wX : 0,
    y: windowSettings.wY >= 0 ? windowSettings.wY : 0,
    center: windowSettings.wX >= 0 && windowSettings.wY >= 0 ? false : true,
    minWidth: 400,
    minHeight: 400,
    show: false,
    fullscreen: windowSettings.fullscreen == 1,
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

  if (windowSettings.maximized == 1) win.maximize();

  win.on('resize', (e: any) => updateSettings());
  win.on('move', (e: any) => updateSettings());
  win.on('minimize', (e: any) => updateSettings());
  win.on('maximize', (e: any) => windowSettings.maximized = 1);
  win.on('unmaximize', (e: any) => windowSettings.maximized = 0);
  win.on('enter-full-screen', (e: any) => (win) ? windowSettings.fullscreen = 1 : "");
  win.on('leave-full-screen', (e: any) => win ? windowSettings.fullscreen = 0 : "");

  // Create the worker window for the file scanning
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

  // Create the worker window for the file watching
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
    if (win) {
      updateSettings();
      settings.setSync('settings_main', windowSettings as any);
      // e.preventDefault();
      windowClosed();
    }
  });

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
              sendToWindows('toggle-distract-mode');
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
              sendToWindows('show-help');
            }
          }
        },
        {
          accelerator: "F6",
          label: 'About',
          click() {
            if (win) {
              sendToWindows('show-about');
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
if (process.env.NODE_ENV !== 'production') {
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
