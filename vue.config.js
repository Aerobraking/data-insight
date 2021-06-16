module.exports = {
 // mode: 'production',
  configureWebpack: {
    devtool: 'source-map'
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