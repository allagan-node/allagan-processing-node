import { Avatar, Card, Col, Divider, Icon, Row, Steps } from "antd";
import React from "react";

const Editor = props => {
  return (
    <Row justify="center" style={{ marginTop: "25px" }} type="flex">
      <Col span={20}>
        <Card>
          <Steps current={0}>
            <Steps.Step title="편집할 자료 선택" />
            <Steps.Step title="편집" />
            <Steps.Step title="자료 재구축" />
          </Steps>
        </Card>
      </Col>
    </Row>
  );
};

export default Editor;
