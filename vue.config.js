module.exports = {
  configureWebpack: {
    devtool: 'source-map'
  },
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      //preload: 'src/preload.js',
      // Or, for multiple preload files:
    }
  }
}