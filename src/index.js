import r2wc from "@r2wc/react-to-web-component";

import App from "./App";

const app = r2wc(App, {
  props: {
    datapackage: "json",
  },
});

customElements.define("bcodmo-data-viewer", app);
