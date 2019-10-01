import React from "react";

const EditorContext = React.createContext({
  files: {},
  setFiles: () => {},
  dataTree: {},
  setDataTree: () => {}
});

export default EditorContext;
