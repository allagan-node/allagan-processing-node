import {
  Alert,
  Button,
  Card,
  Icon,
  Progress,
  Result,
  Steps,
  Table,
  Tabs,
  TreeSelect
} from "antd";
import Router from "next/router";
import React from "react";

import EditorContext from "../../src/contexts/editor-context";
import {
  Compute,
  DecodeDataBlocks,
  DecodeExD,
  DecodeExH,
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
      loadingSubText: "",
      loadingProgress: 0,
      loadingStepProgress: 0,
      dataMap: {},
      dataTree: {
        key: "root",
        value: "Root",
        title: "Root",
        children: [],
        selectable: false
      },
      selectedNode: {},
      activeRangeStart: "",
      activeLangCode: ""
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

    setTimeout(() => this.cacheData(), 0);
  }

  cacheData() {
    this.state.loadingText = "문자열 자료 읽어들이는 중...";
    this.state.loadingSubText = "";
    this.state.loadingProgress = 0;
    this.setState(this.state, async () => {
      const data = this.context.files["0a0000"];
      const dataKeys = Object.keys(data);

      for (let [i, dataKey] of dataKeys.entries()) {
        await ReadBytesFromFile(data[dataKey]).then(b => {
          data[dataKey + "-cache"] = b;

          return new Promise(resolve => {
            let newProgress = Math.round(((i + 1) / dataKeys.length) * 100);
            if (newProgress > this.state.loadingProgress) {
              this.state.loadingSubText = dataKey.toString();
              this.state.loadingProgress = newProgress;
              this.setState(this.state, () => setTimeout(resolve, 1000));
            } else {
              resolve();
            }
          });
        });
      }

      setTimeout(() => this.constructDataMap(), 1000);
    });
  }

  constructDataMap() {
    this.state.loadingText = "문자열 자료 매핑 중...";
    this.state.loadingSubText = "";
    this.state.loadingProgress = 0;
    this.state.loadingStepProgress = Math.round((1 / 7) * 100);
    this.setState(this.state, () =>
      setTimeout(async () => {
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

          if (!this.state.dataMap[directoryKey]) {
            this.state.dataMap[directoryKey] = {};
          }

          this.state.dataMap[directoryKey][key] = {
            key: key,
            directoryKey: directoryKey,
            datFileNum: unwrappedOffset.datFileNum,
            datOffset: unwrappedOffset.datOffset
          };

          await new Promise(resolve => {
            let newProgress = Math.round(((i + 1) / fileCount) * 100);
            if (newProgress > this.state.loadingProgress) {
              this.state.loadingSubText = key;
              this.state.loadingProgress = newProgress;
              this.setState(this.state, () => setTimeout(resolve, 10));
            } else {
              resolve();
            }
          });
        }

        setTimeout(() => this.decodeExL(), 1000);
      }, 1000)
    );
  }

  decodeExL() {
    this.state.loadingText = "문자열 자료 ExL 디코딩 중...";
    this.state.loadingSubText = "";
    this.state.loadingProgress = 0;
    this.state.loadingStepProgress = Math.round((2 / 7) * 100);
    this.setState(this.state, () =>
      setTimeout(async () => {
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

        const data = DecodeDataBlocks(
          this.context.files["0a0000"][rootExL.datFileNum + "-cache"],
          rootExL.datOffset
        );
        const lines = [];
        const rootLines = new TextDecoder().decode(data).split("\n");

        for (let [i, rootLine] of rootLines.entries()) {
          const rootLineCols = rootLine.split(",");
          if (rootLineCols.length !== 2) continue;
          if (rootLineCols[0] !== "Achievement" && rootLineCols[0] !== "Quest")
            continue;
          lines.push(rootLineCols[0]);

          await new Promise(resolve => {
            let newProgress = Math.round(((i + 1) / rootLines.length) * 100);
            if (newProgress > this.state.loadingProgress) {
              this.state.loadingSubText = rootLineCols[0];
              this.state.loadingProgress = newProgress;
              this.setState(this.state, () => setTimeout(resolve, 10));
            } else {
              resolve();
            }
          });
        }

        if (lines.length === 0) {
          this.state.errors.push(
            "ExL 디코딩에 실패했습니다. 선택한 자료가 올바른 자료인지 확인해주세요."
          );
          this.state.loading = false;
          this.setState(this.state);
          return;
        }

        setTimeout(() => this.buildTreeNode(lines), 1000);
      }, 1000)
    );
  }

  buildTreeNode(lines) {
    this.state.loadingText = "문자열 자료 ExH 등록 중...";
    this.state.loadingSubText = "";
    this.state.loadingProgress = 0;
    this.state.loadingStepProgress = Math.round((3 / 7) * 100);
    this.setState(this.state, () =>
      setTimeout(async () => {
        for (let [i, line] of lines.entries()) {
          const name =
            line.indexOf("/") !== -1
              ? line.substring(line.lastIndexOf("/") + 1, line.length)
              : line;
          const directoryName =
            line.indexOf("/") !== -1
              ? "exd/" + line.substring(0, line.lastIndexOf("/"))
              : "exd";
          if (!this.state.dataMap[Compute(directoryName)]) continue;

          const exHData = this.state.dataMap[Compute(directoryName)][
            Compute(name + ".exh")
          ];
          if (!exHData) continue;
          if (!this.context.files["0a0000"][exHData.datFileNum]) continue;

          const directories = directoryName.split("/");
          let node = this.state.dataTree;
          for (let directory of directories) {
            if (node.children.findIndex(n => n.title === directory) === -1) {
              node.children.push({
                key: node.key + "-" + directory,
                value: node.key + "-" + directory,
                title: directory,
                children: [],
                selectable: false
              });
            }

            node = node.children.find(n => n.title === directory);
          }
          node.children.push({
            key: node.key + "-" + name,
            value: node.key + "-" + name,
            title: name,
            children: [],
            selectable: true,
            exH: {
              name: name,
              directoryName: directoryName,
              data: exHData
            }
          });

          await new Promise(resolve => {
            let newProgress = Math.round(((i + 1) / lines.length) * 100);
            if (newProgress > this.state.loadingProgress) {
              this.state.loadingSubText = name;
              this.state.loadingProgress = newProgress;
              this.setState(this.state, () => setTimeout(resolve, 10));
            } else {
              resolve();
            }
          });
        }

        setTimeout(() => this.decodeExH(), 1000);
      }, 1000)
    );
  }

  decodeExH() {
    this.state.loadingText = "문자열 자료 ExH 디코딩 중...";
    this.state.loadingSubText = "";
    this.state.loadingProgress = 0;
    this.state.loadingStepProgress = Math.round((4 / 7) * 100);
    this.setState(this.state, () =>
      setTimeout(async () => {
        const exHs = this.retrieveNodes(this.state.dataTree).map(n => n.exH);
        for (let [i, exH] of exHs.entries()) {
          const data = DecodeDataBlocks(
            this.context.files["0a0000"][exH.data.datFileNum + "-cache"],
            exH.data.datOffset
          );
          const decodedExH = DecodeExH(data);
          if (
            decodedExH.variant === 1 &&
            decodedExH.ranges.length > 0 &&
            decodedExH.languages.length > 0
          ) {
            exH.decoded = decodedExH;
          }

          await new Promise(resolve => {
            let newProgress = Math.round(((i + 1) / exHs.length) * 100);
            if (newProgress > this.state.loadingProgress) {
              this.state.loadingSubText = exH.name;
              this.state.loadingProgress = newProgress;
              this.setState(this.state, () => setTimeout(resolve, 10));
            } else {
              resolve();
            }
          });
        }

        setTimeout(() => this.decodeExD(), 1000);
      }, 1000)
    );
  }

  retrieveNodes(node) {
    const nodes = node.children.filter(c => c.selectable);

    const remainingNodes = node.children.filter(c => !c.selectable);
    for (let remainingNode of remainingNodes) {
      const childNodes = this.retrieveNodes(remainingNode);
      for (let childNode of childNodes) {
        nodes.push(childNode);
      }
    }

    return nodes;
  }

  decodeExD() {
    this.state.loadingText = "문자열 자료 ExD 디코딩 중...";
    this.state.loadingSubText = "";
    this.state.loadingProgress = 0;
    this.state.loadingStepProgress = Math.round((5 / 7) * 100);
    this.setState(this.state, () =>
      setTimeout(async () => {
        const nodes = this.retrieveNodes(this.state.dataTree);
        for (let [i, node] of nodes.entries()) {
          if (!node.exH.decoded) continue;

          const tableColumns = [];
          for (let column of node.exH.decoded.columns) {
            if (column.type !== 0x0) continue;
            tableColumns.push({
              title: column.offset,
              key: column.offset,
              dataIndex: column.offset,
              onCell: (record, rowIndex) => {
                return {
                  record: record,
                  columnOffset: column.offset,
                  rowIndex: rowIndex,
                  test: () => {
                    const dataSource = this.state.selectedNode.exD[
                      this.state.selectedNode.exH.name +
                        "_" +
                        this.state.activeRangeStart +
                        "_" +
                        this.state.activeLangCode +
                        ".exd"
                    ].tableDataSource;
                    console.log(dataSource[rowIndex][column.offset]);
                    console.log(record);
                  }
                };
              },
              render: b =>
                b && b.length > 0
                  ? new TextDecoder().decode(new Uint8Array(b).buffer)
                  : ""
            });
          }
          if (tableColumns.length === 0) continue;

          node.exD = {
            tableColumns: tableColumns
          };

          for (let range of node.exH.decoded.ranges) {
            for (let lang of node.exH.decoded.languages) {
              const exDName =
                node.exH.name + "_" + range.start + "_" + lang.code + ".exd";
              if (!this.state.dataMap[Compute(node.exH.directoryName)])
                continue;

              const exDData = this.state.dataMap[
                Compute(node.exH.directoryName)
              ][Compute(exDName)];
              if (!exDData) continue;

              const data = DecodeDataBlocks(
                this.context.files["0a0000"][exDData.datFileNum + "-cache"],
                exDData.datOffset
              );
              const tableDataSource = DecodeExD(
                data,
                tableColumns,
                node.exH.decoded.fixedSizeDataLength
              );
              node.exD[exDName] = {
                data: exDData,
                tableDataSource: tableDataSource
              };

              range.loaded = true;
              lang.loaded = true;
            }
          }

          await new Promise(resolve => {
            let newProgress = Math.round(((i + 1) / nodes.length) * 100);
            if (newProgress > this.state.loadingProgress) {
              this.state.loadingSubText = node.exH.name;
              this.state.loadingProgress = newProgress;
              this.setState(this.state, () => setTimeout(resolve, 50));
            } else {
              resolve();
            }
          });
        }

        setTimeout(() => this.cleanUpTree(), 1000);
      }, 1000)
    );
  }

  cleanUpTree() {
    this.state.loadingText = "문자열 자료 트리 정리 중...";
    this.state.loadingSubText = "";
    this.state.loadingProgress = 100;
    this.state.loadingStepProgress = Math.round((6 / 7) * 100);
    this.setState(this.state, () =>
      setTimeout(() => {
        this.cleanUpNode(this.state.dataTree);

        const data = this.context.files["0a0000"];
        const dataKeys = Object.keys(data);

        for (let dataKey of dataKeys) {
          delete data[dataKey + "-cache"];
        }

        this.state.loadingSubText = "문자열 자료 디코딩 완료!";
        this.state.loadingStepProgress = 100;
        this.setState(this.state, () =>
          setTimeout(() => {
            this.state.loading = false;
            this.setState(this.state);
          }, 1000)
        );
      }, 1000)
    );
  }

  cleanUpNode(node) {
    const children = node.children.filter(
      n =>
        n.selectable &&
        n.exH &&
        n.exH.decoded &&
        n.exH.decoded.ranges &&
        n.exH.decoded.languages
    );
    for (let child of children) {
      while (true) {
        let range = child.exH.decoded.ranges.findIndex(r => !r.loaded);
        if (range === -1) break;
        child.exH.decoded.ranges.splice(range, 1);
      }

      while (true) {
        let lang = child.exH.decoded.languages.findIndex(l => !l.loaded);
        if (lang === -1) break;
        child.exH.decoded.languages.splice(lang, 1);
      }
    }

    while (true) {
      let index = node.children.findIndex(
        n =>
          n.selectable &&
          (!n.exH ||
            !n.exH.decoded ||
            !n.exH.decoded.ranges ||
            n.exH.decoded.ranges.length === 0 ||
            !n.exH.decoded.languages ||
            n.exH.decoded.languages.length === 0 ||
            !n.exD ||
            !n.exD.tableColumns ||
            n.exD.tableColumns.length === 0)
      );
      if (index === -1) break;
      node.children.splice(index, 1);
    }

    node.children
      .sort((firstEl, secondEl) => {
        return firstEl - secondEl;
      })
      .sort((firstEl, secondEl) => {
        return (firstEl.selectable ? 1 : 0) - (secondEl.selectable ? 1 : 0);
      });

    const remainingNodes = node.children.filter(n => !n.selectable);
    for (let remainingNode of remainingNodes) {
      this.cleanUpNode(remainingNode);
    }
  }

  onTreeSelect(value, node) {
    this.state.selectedNode = {
      exD: node.props.exD,
      exH: node.props.exH
    };
    this.state.activeRangeStart = node.props.exH.decoded.ranges[0].start.toString();
    this.state.activeLangCode = node.props.exH.decoded.languages[0].code.toString();
    this.setState(this.state);
  }

  render() {
    return (
      <Card style={{ margin: "25px" }}>
        <style
          dangerouslySetInnerHTML={{
            __html: "table th, table td { white-space: nowrap; }"
          }}
        />
        <Steps current={1}>
          <Steps.Step title="편집할 자료 선택" />
          <Steps.Step title="편집" />
          <Steps.Step title="자료 재구축" />
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
                onClick={() => Router.push("/editor/1")}
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
                <React.Fragment>
                  <Progress
                    percent={this.state.loadingProgress}
                    type="circle"
                  />
                  <Progress
                    percent={this.state.loadingStepProgress}
                    style={{ marginTop: "25px" }}
                  />
                </React.Fragment>
              }
              title={this.state.loadingText}
              subTitle={this.state.loadingSubText}
            />
          </div>
        )}
        {!this.state.loading && this.state.errors.length === 0 && (
          <React.Fragment>
            <div style={{ marginTop: "25px" }}>
              <TreeSelect
                onSelect={(value, node) => this.onTreeSelect(value, node)}
                placeholder="편집할 자료를 선택하세요."
                showSearch={true}
                style={{ minWidth: "300px" }}
                treeData={[this.state.dataTree]}
              />
            </div>
            {this.state.selectedNode.exD && this.state.selectedNode.exH && (
              <div style={{ marginTop: "25px" }}>
                <Tabs
                  activeKey={this.state.activeRangeStart}
                  onChange={activeKey => {
                    this.state.activeRangeStart = activeKey;
                    this.setState(this.state);
                  }}
                  style={{ height: "calc(100vh - 275px)" }}
                  tabPosition="left"
                >
                  {this.state.selectedNode.exH.decoded.ranges.map(r => {
                    return (
                      <Tabs.TabPane key={r.start} tab={r.start}>
                        <Tabs
                          activeKey={this.state.activeLangCode}
                          onChange={activeKey => {
                            this.state.activeLangCode = activeKey;
                            this.setState(this.state);
                          }}
                          tabPosition="top"
                        >
                          {this.state.selectedNode.exH.decoded.languages.map(
                            l => {
                              return (
                                <Tabs.TabPane key={l.code} tab={l.code}>
                                  <Table
                                    bordered={true}
                                    columns={
                                      this.state.selectedNode.exD.tableColumns
                                    }
                                    components={{
                                      body: {
                                        cell: EditableCell
                                      }
                                    }}
                                    dataSource={
                                      this.state.selectedNode.exD[
                                        this.state.selectedNode.exH.name +
                                          "_" +
                                          r.start +
                                          "_" +
                                          l.code +
                                          ".exd"
                                      ].tableDataSource
                                    }
                                    scroll={{
                                      x: true,
                                      y: "calc(100vh - 425px)"
                                    }}
                                    showHeader={false}
                                    size="middle"
                                  />
                                </Tabs.TabPane>
                              );
                            }
                          )}
                        </Tabs>
                      </Tabs.TabPane>
                    );
                  })}
                </Tabs>
              </div>
            )}
          </React.Fragment>
        )}
      </Card>
    );
  }
}

class EditableCell extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      children: props.children,
      editable: props.record[props.columnOffset].length > 0,
      columnOffset: props.columnOffset,
      record: props.record,
      test: props.test
    };
  }

  render() {
    if (this.state.editable) {
      return (
        <td
          onClick={() => {
            this.state.test();
          }}
        >
          {this.state.children}
        </td>
      );
    } else {
      return (
        <td style={{ backgroundColor: "#eee", height: "46px" }}>
          {this.state.children}
        </td>
      );
    }
  }
}

export default EditorSecond;
