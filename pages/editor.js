import { Alert, Card, Col, Icon, Row, Steps, Upload } from "antd";
import React from "react";

const Editor = props => {
  const [current, setCurrent] = React.useState(0);
  const [fileList, setFileList] = React.useState([]);

  return (
    <Row justify="center" style={{ marginTop: "25px" }} type="flex">
      <Col span={20}>
        <Card>
          <Steps current={current}>
            <Steps.Step title="편집할 자료 선택" />
            <Steps.Step title="편집" />
            <Steps.Step title="자료 재구축" />
          </Steps>
          <div style={{ marginTop: "25px" }}>
            <Alert
              description="문자열 자료 파일만 편집할 수 있습니다. 문자열 파일은 통상적으로 game/sqpack/ffxiv에서 찾을 수 있으며 파일 이름이 0a0000으로 시작하고 (예: 0a0000.win32.index), 여러 개의 index와 dat 파일로 나누어져 있습니다. (예: *.index, *.index2, *.dat0...) 파일 이름이 0a0000으로 시작하는 모든 index와 dat 파일들을 선택해주세요."
              message="편집할 파이널 판타지 14 자료 파일을 선택합니다."
              showIcon
              type="info"
            />
          </div>
          <div style={{ marginTop: "25px" }}>
            <Upload.Dragger
              accept=".index*,.dat*"
              beforeUpload={(file, _fileList) => {
                setFileList(_fileList);
                return false;
              }}
              fileList={fileList}
              multiple={true}
            >
              <p className="ant-upload-drag-icon">
                <Icon type="inbox" />
              </p>
              <p className="ant-upload-text">
                여기를 클릭하거나 자료 파일들을 이 곳으로 드래그하여 선택하세요.
              </p>
              <p className="ant-upload-hint">
                통상 문자열 자료는 game/sqpack/ffxiv/0a0000.*에 담겨져 있습니다.
                여러 index와 dat 파일들이 존재할 경우 모두 선택해주세요.
              </p>
            </Upload.Dragger>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default Editor;
