/**
 * The enums are used for identifying the IPC messages.
 * This is more rubust and less errorprone then using strings directly.
 */
enum IPCMessageType {
    FileScanToRender = "FileScanToRender",
    FileWatcherToRender = "FileWatcherToRender",
    RenderToFileScan = "RenderToFileScan",
    RenderToFileWatcher = "RenderToFileWatcher",
}

export default IPCMessageType;