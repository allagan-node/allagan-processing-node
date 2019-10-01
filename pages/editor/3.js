import { Card, Icon, Steps } from "antd";
import Router from "next/router";
import React from "react";

import EditorContext from "../../src/contexts/editor-context";

class EditorThird extends React.Component {
  static contextType = EditorContext;

  constructor(props) {
    super(props);

    this.state = {
      errors: []
    };
  }

  componentDidMount() {
    if (!this.context.files.loaded || !this.context.dataTree.loaded) {
      if (window) {
        window.location = "/editor";
      } else {
        Router.replace("/editor");
      }
    }
  }

  render() {
    return (
      <Card style={{ margin: "25px" }}>
        <Steps current={2}>
          <Steps.Step title="편집할 자료 선택" />
          <Steps.Step title="편집" />
          <Steps.Step icon={<Icon type="loading" />} title="자료 재구축" />
        </Steps>
        {this.state.errors.length > 0 && <React.Fragment></React.Fragment>}
      </Card>
    );
  }
}

export default EditorThird;
