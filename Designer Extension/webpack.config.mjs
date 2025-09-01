import path from "path";
import { fileURLToPath } from "url";
import Dotenv from "dotenv-webpack";
import TerserPlugin from "terser-webpack-plugin";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default {
  entry: "./src/main.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(dirname, "public"),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new Dotenv({ path: path.resolve(dirname, ".env") }), // Read env from Designer Extension/.env
    // Remove any accidental localhost fallbacks from third-party libs
    {
      apply: (compiler) => {
        compiler.hooks.thisCompilation.tap("StripLocalhostPlugin", (compilation) => {
          compilation.hooks.processAssets.tap(
            {
              name: "StripLocalhostPlugin",
              stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE,
            },
            (assets) => {
              Object.keys(assets)
                .filter((filename) => filename.endsWith(".js"))
                .forEach((filename) => {
                  const source = assets[filename].source().toString();
                  const replaced = source
                    .replace(/http:\/\/localhost/gi, "about:blank")
                    .replace(/localhost/gi, "");
                  if (replaced !== source) {
                    compilation.updateAsset(
                      filename,
                      new compiler.webpack.sources.RawSource(replaced)
                    );
                  }
                });
            }
          );
        });
      },
    },
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          compress: { 
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug']
          },
          format: { comments: false },
          mangle: true
        },
      }),
    ],
  },
  performance: {
    hints: 'warning',
    maxEntrypointSize: 500000,
    maxAssetSize: 500000,
  },
  devServer: {
    static: [{ directory: path.join(dirname, "public") }],
    compress: true,
    port: process.env.FRONTEND_PORT || 1337,
  },
};
