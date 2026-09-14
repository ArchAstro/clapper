import path from "node:path";
export default {
  root: path.resolve(import.meta.dirname, "../rendiv"),
  alias: {
    react: path.resolve(import.meta.dirname, "../rendiv/node_modules/react"),
    "react-dom": path.resolve(import.meta.dirname, "../rendiv/node_modules/react-dom"),
  },
};
