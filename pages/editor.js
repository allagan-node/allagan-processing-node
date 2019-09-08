import { Card, Steps } from "antd";
import React from "react";

import DataEditor from "../src/components/editor/data-editor";
import DataSelector from "../src/components/editor/data-selector";

const Editor = props => {
  const [current, setCurrent] = React.useState(0);
  const incrementCurrent = () => {
    setCurrent(current + 1);
  };
  const [files, setFiles] = React.useState({});

  return (
    <Card style={{ margin: "25px 25px 0 25px" }}>
      <Steps current={current}>
        <Steps.Step title="편집할 자료 선택" />
        <Steps.Step title="편집" />
        <Steps.Step title="자료 재구축" />
      </Steps>
      {current === 0 && (
        <DataSelector incrementCurrent={incrementCurrent} setFiles={setFiles} />
      )}
      {current === 1 && <DataEditor files={files} />}
    </Card>
  );
};

export default Editor;
