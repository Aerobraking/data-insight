const WorkerPlugin = require('worker-plugin');

module.exports = {
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