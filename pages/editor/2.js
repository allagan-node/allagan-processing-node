import { Alert, Card, Icon, Result, Steps } from "antd";
import Router from "next/router";
import React from "react";

import EditorContext from "../../src/contexts/editor-context";
import {
  Compute,
  DecodeDataBlocks,
  ReadBytesFromFile,
  UnwrapOffset
} from "../../src/utility";

class EditorSecond extends React.Component {
  static contextType = EditorContext;

  constructor(props) {
    super(props);

    this.state = {
      errors: [],
      loading: true,
      loadingText: "",
      dataMap: {}
    };
  }

  componentDidMount() {
    if (!this.context.files.loaded) Router.push("/editor/1");
    if (!this.context.files["0a0000"] || !this.context.files["0a0000"].index) {
      this.state.errors.push(
        "트리 생성에 필요한 문자열 자료 파일을 찾을 수 없습니다. 자료를 다시 선택해주세요."
      );
      this.state.loading = false;
      this.setState(this.state);
      return;
    }

    this.state.loadingText = "문자열 자료 매핑 중...";
    this.setState(this.state, this.constructFileMap);
  }

  constructFileMap() {
    ReadBytesFromFile(this.context.files["0a0000"].index)
      .then(b => {
        const dv = new DataView(b);
        const headerOffset = dv.getInt32(0xc, true);
        const fileOffset = dv.getInt32(headerOffset + 0x8, true);
        const fileCount = dv.getInt32(headerOffset + 0xc, true) / 0x10;

        for (let i = 0; i < fileCount; i++) {
          const curFileOffset = fileOffset + i * 0x10;
          const key = dv.getUint32(curFileOffset, true);
          const directoryKey = dv.getUint32(curFileOffset + 0x4, true);
          const wrappedOffset = dv.getUint32(curFileOffset + 0x8, true);
          const unwrappedOffset = UnwrapOffset(wrappedOffset);

          if (!this.state.dataMap[directoryKey]) {
            this.state.dataMap[directoryKey] = {};
          }

          this.state.dataMap[directoryKey][key] = {
            key: key,
            directoryKey: directoryKey,
            datFileNum: unwrappedOffset.datFileNum,
            datOffset: unwrappedOffset.datOffset
          };
        }
      })
      .then(() => {
        this.state.loadingText = "문자열 자료 ExL 디코딩 중...";
        this.setState(this.state, this.decodeExL);
      });
  }

  decodeExL() {
    const rootExL = this.state.dataMap[Compute("exd")][Compute("root.exl")];
    if (!rootExL) {
      this.state.errors.push(
        "문자열 자료 인덱스에서 ExL을 찾을 수 없습니다. 선택한 자료가 올바른 자료인지 확인해주세요."
      );
      this.state.loading = false;
      this.setState(this.state);
      return;
    }

    rootExL.name = "root.exl";
    rootExL.directoryName = "exd";

    ReadBytesFromFile(this.context.files["0a0000"][rootExL.datFileNum])
      .then(b => {
        return DecodeDataBlocks(b, rootExL.datOffset);
      })
      .then(data => {
        const lines = [];
        const rootLines = new TextDecoder().decode(data).split("\n");
        for (let i = 0; i < rootLines.length; i++) {
          if (!rootLines[i]) continue;
          const rootLineCols = rootLines[i].split(",");
          if (rootLineCols.length !== 2) continue;
          lines.push(rootLineCols[0]);
        }
      });
  }

  render() {
    return (
      <Card style={{ margin: "25px" }}>
        <Steps current={1}>
          <Steps.Step title="편집할 자료 선택" />
          <Steps.Step title="편집" />
          <Steps.Step title="자료 재구축" />
        </Steps>
        {this.state.errors.length > 0 && (
          <div style={{ marginTop: "25px" }}>
            <Alert
              description={
                <ul>
                  {this.state.errors.map((e, i) => {
                    return <li key={i}>{e}</li>;
                  })}
                </ul>
              }
              message="오류"
              showIcon
              type="error"
            />
          </div>
        )}
        {this.state.loading && (
          <div style={{ marginTop: "25px" }}>
            <Result
              icon={<Icon type="loading" />}
              title="트리 생성 중..."
              subTitle={this.state.loadingText}
            />
          </div>
        )}
      </Card>
    );
  }
}

export default EditorSecond;
