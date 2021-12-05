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
      builderOptions: {
        productName: "Data Insights", 
        appId: 'com.aerobraking.datainsights',
        win: {
          "target": [
            "nsis"
          ],
          icon: 'public/icon.png',
          "requestedExecutionLevel": "requireAdministrator"
        },
        "nsis": {
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