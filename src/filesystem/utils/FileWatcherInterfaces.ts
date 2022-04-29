/**
 * Definition for recieving data from the FileSystemWatcher.
 */
export interface FileWatcherUpdate {
    id: "filewatcherupdate",
    map: "default" | "recursive",
    type: string,
    path: string
}

/**
 * Definition for sending data to the FileSystemWatcher.
 */
export interface FileWatcherSend {

    /**
     * reset removes all watched paths from the FileSystemWatcher.
     */
    type: "register" | "unregister" | "reset", 

    /**
     * The path that you want to watch
     */
    path: string,
    /**
     * true: the folder and all subfolders will be watched,
     * false: only the folder will be watched.
     */
    recursive: boolean,
}