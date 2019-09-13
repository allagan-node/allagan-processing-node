import { useRouter } from "next/router";
import React from "react";

import EditorContext from "../../src/contexts/editor-context";

const EditorSecond = () => {
  const router = useRouter();

  return (
    <EditorContext.Consumer>
      {editorContext => {
        if (!editorContext.files.loaded) router.push("/editor/1");

        return <div>Hello, World!</div>;
      }}
    </EditorContext.Consumer>
  );
};

export default EditorSecond;
