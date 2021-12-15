const WorkerPlugin = require('worker-plugin');

module.exports = {
  pages: {
    index: 'src/main.ts',
    subpage: 'src/mainSub.ts'
  },
  // mode: 'production',
  configureWebpack: {
    devtool: 'source-map',
    plugins: [
      new WorkerPlugin()
    ],
    externals: {
      fsevents: "require('fseventselectron')"
    }
  },
  pluginOptions: {
    electronBuilder: {
      removeElectronJunk: true,
      builderOptions: {
        productName: "Data Insight",
        appId: 'com.aerobraking.datainsight',
        fileAssociations: {
          "ext": "ins",
          "name": "INS",
        },
        win: {
          "target": [
            "nsis"
          ],
          icon: 'public/icon.png',
          /**
           * Important so the app does not run as admin in windows.
           * Because with admin rights, file drop is disabled
           * for the window of the app.
           * It also asks for permission each time the app will be
           * started, which is quite annoying.
           * https://www.electron.build/configuration/win
           */
          "requestedExecutionLevel": "asInvoker"
        },
        "nsis": {
          "oneClick": false,
          "allowToChangeInstallationDirectory": true,
          // when true it asks for permissions before installing
          "perMachine": false,
          "installerIcon": "public/icon.ico",
          "uninstallerIcon": "public/icon.ico",
          "uninstallDisplayName": "Data Insights",
        }
      },
      nodeIntegration: true,
      nodeIntegrationInWorker: true
    }
  }
}