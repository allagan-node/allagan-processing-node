import { Col, Row } from "antd";
import React from "react";

const DataEditor = props => {
  console.log(props.files);

  return (
    <Row gutter={16}>
      <Col span={6}></Col>
      <Col span={18}></Col>
    </Row>
  );
};

export default DataEditor;
