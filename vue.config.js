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
      nodeIntegration: true,
      nodeIntegrationInWorker: true
      //preload: 'src/preload.js',
      // Or, for multiple preload files:
    }
  }
}