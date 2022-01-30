export interface FileWatcherUpdate {
    id: "filewatcherupdate",
    map: "default" | "recursive",
    type: string,
    path: string
}

export interface FileWatcherSend {
    type: "register" | "unregister",
    path: string
    recursive: boolean
}