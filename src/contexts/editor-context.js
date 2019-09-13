import React from "react";

const EditorContext = React.createContext({
  files: {},
  setFiles: () => {}
});

export default EditorContext;
