import Router from "next/router";
import React from "react";

import EditorContext from "../../src/contexts/editor-context";

class EditorSecond extends React.Component {
  static contextType = EditorContext;

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    if (!this.context.files.loaded) Router.push("/editor/1");
    console.log(this.context.files);
  }

  render() {
    return <div>Hello, World!</div>;
  }
}

export default EditorSecond;
