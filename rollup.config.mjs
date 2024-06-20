import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import babel from "@rollup/plugin-babel";
import replace from "@rollup/plugin-replace";
import postcss from "rollup-plugin-postcss";
import nodePolyfills from "rollup-plugin-polyfill-node";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/index.js",
  output: {
    file: "public/bundle.js",
    format: "iife",
  },
  plugins: [
    nodeResolve({
      extensions: [".js", ".jsx"],
    }),
    babel({
      babelHelpers: "bundled",
      presets: ["@babel/preset-react"],
      extensions: [".js", ".jsx"],
    }),
    postcss({
      plugins: [],
    }),
    commonjs({}),
    resolve(),
    replace({
      preventAssignment: false,
      "process.env.NODE_ENV": '"development"',
    }),
    nodePolyfills(/* options */),
    terser(),
  ],
};
