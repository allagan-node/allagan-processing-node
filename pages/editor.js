import Router from "next/router";
import React from "react";

class Editor extends React.Component {
  componentDidMount() {
    Router.replace("/editor/1", "/editor");
  }

  render() {
    return <div></div>;
  }
}

export default Editor;
