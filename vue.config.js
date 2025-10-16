const webpack = require("webpack");
module.exports = {
  configureWebpack: {
    devServer: {
      host: '0.0.0.0',
      port: 8080, // 你可以选择任何未被占用的端口
      open: true, // 启动时自动打开浏览器
    },
    plugins: [
      new webpack.DefinePlugin({
        '__VUE_OPTIONS_API__': JSON.stringify(true),
        '__VUE_PROD_DEVTOOLS__': JSON.stringify(false),
        '__VUE_PROD_HYDRATION_MISMATCH_DETAILS__': JSON.stringify(false) // 添加这行
      })
    ]
  }
}
