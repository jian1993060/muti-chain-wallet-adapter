const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'wallet_adapter.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      name: 'WalletAdapter',
      type: 'umd',
      export: 'default'
    },
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  android: '4.4'
                },
                useBuiltIns: 'usage',
                corejs: 3
              }]
            ]
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js']
  },
  mode: 'production',
  optimization: {
    minimize: true
  }
}; 