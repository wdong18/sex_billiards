const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development', // Default mode, can be overridden by npm scripts
  entry: './src/script.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // Clean the dist folder before each build
  },
  devtool: 'inline-source-map', // For better debugging
  devServer: {
    static: './dist', // Serve content from the dist directory
    hot: true, // Enable Hot Module Replacement
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html', // Use src/index.html as template
      filename: 'index.html', // Output filename
      inject: 'body', // Inject script into the body
    }),
  ],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'], // Process CSS files
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i, // If you add images later
        type: 'asset/resource',
      },
    ],
  },
};
