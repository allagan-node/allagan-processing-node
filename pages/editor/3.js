import { Alert, Button, Card, Icon, Progress, Result, Steps } from "antd";
import Router from "next/router";
import React from "react";

import EditorContext from "../../src/contexts/editor-context";
import { Compute, ReadBytesFromFile, UnwrapOffset } from "../../src/utility";

class EditorThird extends React.Component {
  static contextType = EditorContext;

  constructor(props) {
    super(props);

    this.state = {
      errors: [],
      loading: true,
      loadingText: "",
      loadingSubText: "",
      loadingProgress: 0
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

    if (
      !this.context.files["0a0000"] ||
      !this.context.files["0a0000"].index ||
      !this.context.files["0a0000"]["0"]
    ) {
      this.state.errors.push(
        "문자열 자료 파일을 찾을 수 없습니다. 자료를 다시 선택해주세요."
      );
      this.state.loading = false;
      this.setState(this.state);
      return;
    }

    setTimeout(() => this.cacheData(), 0);
  }

  cacheData() {
    this.state.loadingText = "자료 캐싱 중...";
    this.state.loadingSubText = "";
    this.state.loadingProgress = 0;
    this.setState(this.state, () =>
      setTimeout(async () => {
        const data = this.context.files["0a0000"];
        const dataKeys = Object.keys(data);

        for (let dataKey of dataKeys) {
          await ReadBytesFromFile(data[dataKey]).then(b => {
            data[dataKey + "-cache"] = b;

            return new Promise(resolve => {
              this.state.loadingSubText = dataKey.toString();
              this.setState(this.state, () => setTimeout(resolve, 1000));
            });
          });
        }

        const dv = new DataView(data["0-cache"].slice(0, 0x800));
        dv.setInt32(0x400 + 0x10, 0x2, true);
        data["new-dat-cache"] = dv.buffer;

        setTimeout(() => this.process(), 0);
      }, 1000)
    );
  }

  process() {
    this.state.loadingText = "자료 처리 중...";
    this.state.loadingSubText = "";
    this.state.loadingProgress = 0;
    this.setState(this.state, () =>
      setTimeout(async () => {
        const touchedNodes = [];
        this.processNode(this.context.dataTree, touchedNodes);

        const dv = new DataView(this.context.files["0a0000"]["index-cache"]);
        const headerOffset = dv.getInt32(0xc, true);
        const fileOffset = dv.getInt32(headerOffset + 0x8, true);
        const fileCount = dv.getInt32(headerOffset + 0xc, true) / 0x10;

        for (let i = 0; i < fileCount; i++) {
          const curFileOffset = fileOffset + i * 0x10;
          const key = dv.getUint32(curFileOffset, true);
          const directoryKey = dv.getUint32(curFileOffset + 0x4, true);
          const unwrappedOffset = UnwrapOffset(
            dv.getUint32(curFileOffset + 0x8, true)
          );

          await new Promise(resolve => {
            let newProgress = Math.round(((i + 1) / fileCount) * 100);
            if (newProgress > this.state.loadingProgress) {
              this.state.loadingSubText = key.toString();
              this.state.loadingProgress = newProgress;
              this.setState(this.state, () => setTimeout(resolve, 50));
            } else {
              resolve();
            }
          });

          const touchedNode = touchedNodes.find(
            n =>
              Object.keys(n.exD).findIndex(k => Compute(k) === key) !== -1 &&
              Compute(n.exH.directoryName) === directoryKey
          );
          if (touchedNode) {
            // Re-compile modified data and put it in dat1
          } else if (unwrappedOffset.datOffset === 1) {
            // Push it in dat1 and update index
          } else {
            // Leave unmodified data in dat0
          }
        }
      }, 1000)
    );
  }

  processNode(node, touchedNodes) {
    if (node.exD) {
      const exDKeys = Object.keys(node.exD);

      for (let exDKey of exDKeys) {
        if (!node.exD[exDKey].touched) {
          delete node.exD[exDKey];
        }
      }

      if (Object.keys(node.exD).length > 0) {
        touchedNodes.push(node);
      }
    }

    for (let child of node.children) {
      this.processNode(child, touchedNodes);
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
        {this.state.errors.length > 0 && (
          <React.Fragment>
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
            <div style={{ marginTop: "25px" }}>
              <Button
                block
                onClick={() => {
                  if (window) {
                    window.location = "/editor";
                  } else {
                    Router.push("/editor");
                  }
                }}
                type="danger"
              >
                <Icon type="left" />
                이전 단계로
              </Button>
            </div>
          </React.Fragment>
        )}
        {this.state.loading && (
          <div style={{ marginTop: "25px" }}>
            <Result
              icon={
                <Progress percent={this.state.loadingProgress} type="circle" />
              }
              title={this.state.loadingText}
              subTitle={this.state.loadingSubText}
            />
          </div>
        )}
      </Card>
    );
  }
}

export default EditorThird;
