import { Col, Icon, message, Result, Row, Tabs, Tree } from "antd";
import React, { useEffect } from "react";

import {
  Compute,
  DecodeDataBlocks,
  ReadBytesFromFile,
  UnwrapOffset,
  DecodeExH
} from "../../utility";

const DataEditor = props => {
  useEffect(() => {
    if (!props.files) {
      message.error(
        "아무 자료도 선택되지 않았습니다. 자료를 다시 선택해주세요."
      );
      props.decrementCurrent();
      return;
    }

    if (!props.files["0a0000"]) {
      message.error(
        "트리 생성에 필요한 문자열 자료 파일을 찾을 수 없습니다. 자료를 다시 선택해주세요."
      );
      props.decrementCurrent();
      return;
    }

    const fileMap = {};

    setLoadingText("문자열 자료 인덱스 읽는 중...");
    ReadBytesFromFile(props.files["0a0000"].index)
      .then(b => {
        const dv = new DataView(b);
        const headerOffset = dv.getInt32(0xc, true);
        const fileOffset = dv.getInt32(headerOffset + 0x8, true);
        const fileCount = dv.getInt32(headerOffset + 0xc, true) / 0x10;

        setLoadingText("문자열 자료 트리 구조 생성 중...");
        for (let i = 0; i < fileCount; i++) {
          const curFileOffset = fileOffset + i * 0x10;
          const key = dv.getUint32(curFileOffset, true);
          const directoryKey = dv.getUint32(curFileOffset + 0x4, true);

          if (!fileMap[directoryKey]) {
            fileMap[directoryKey] = {};
          }

          fileMap[directoryKey][key] = {
            key: key,
            directoryKey: directoryKey,
            wrappedOffset: dv.getUint32(curFileOffset + 0x8, true)
          };
        }

        const root = fileMap[Compute("exd")][Compute("root.exl")];
        if (!root) {
          message.error(
            "문자열 자료 인덱스 내 ExL 구조를 찾을 수 없습니다. 선택한 자료가 올바른 자료인지 확인해주세요."
          );
          props.decrementCurrent();
          return;
        }

        root.name = "root.exl";
        root.directoryName = "exd";

        const unwrappedOffset = UnwrapOffset(root.wrappedOffset);

        setLoadingText("문자열 자료 ExL 디코딩 중...");
        return ReadBytesFromFile(
          props.files["0a0000"][unwrappedOffset.datFileNum]
        ).then(b => {
          return DecodeDataBlocks(b, root.wrappedOffset);
        });
      })
      .then(data => {
        const lines = [];
        const rootTextLines = new TextDecoder().decode(data).split("\n");
        for (let i = 0; i < rootTextLines.length; i++) {
          if (!rootTextLines[i]) continue;
          const rootTextCols = rootTextLines[i].split(",");
          if (rootTextCols.length !== 2) continue;
          lines.push(rootTextCols[0]);
        }

        const tree = {
          key: "root",
          name: "root",
          directories: [],
          files: []
        };
        const files = [];

        setLoadingText("문자열 자료 ExL 트리 구조 생성 중...");
        for (let line of lines) {
          const name =
            line.indexOf("/") !== -1
              ? line.substring(line.lastIndexOf("/") + 1, line.length)
              : line;
          const directoryName =
            line.indexOf("/") !== -1
              ? "exd/" + line.substring(0, line.lastIndexOf("/"))
              : "exd";
          if (!fileMap[Compute(directoryName)]) continue;
          if (!fileMap[Compute(directoryName)][Compute(name + ".exh")])
            continue;
          const file = fileMap[Compute(directoryName)][Compute(name + ".exh")];
          const directories = directoryName.split("/");

          let node = tree;
          let parentKey = tree.key;

          for (let directory of directories) {
            if (node.directories.findIndex(v => v.name === directory) === -1) {
              node.directories.push({
                key: parentKey + "-" + directory,
                name: directory,
                directories: [],
                files: []
              });
            }
            node = node.directories.find(v => v.name === directory);
            parentKey = node.key;
          }

          node.files.push({
            key: parentKey + "-" + name,
            name: name
          });
          files.push({
            key: parentKey + "-" + name,
            file: file
          });
        }

        setTree(tree);
        setFiles(files);
        setLoading(false);
      });
  }, []);

  const [loading, setLoading] = React.useState(true);
  const [loadingText, setLoadingText] = React.useState("");
  const [tree, setTree] = React.useState({});
  const [files, setFiles] = React.useState([]);
  const [dataLoading, setDataLoading] = React.useState(false);
  const [selectedExH, setSelectedExH] = React.useState({
    columns: [],
    ranges: [],
    languages: []
  });

  const renderTree = treeNode => {
    return (
      <Tree.TreeNode key={treeNode.key} title={treeNode.name}>
        {treeNode.directories.map(d => {
          return renderTree(d);
        })}
        {treeNode.files.map(f => {
          return <Tree.TreeNode isLeaf key={f.key} title={f.name} />;
        })}
      </Tree.TreeNode>
    );
  };

  return (
    <React.Fragment>
      {loading ? (
        <Result
          icon={<Icon type="loading" />}
          title="트리 생성 중..."
          subTitle={loadingText}
        />
      ) : (
        <Row gutter={16}>
          <Col
            span={6}
            style={{
              padding: "25px",
              maxHeight: "calc(100vh - 291px)",
              overflow: "auto"
            }}
          >
            <Tree.DirectoryTree
              disabled={dataLoading}
              onSelect={(keys, event) => {
                if (event.node.isLeaf()) {
                  let fileInfo = files.find(
                    f => f.key === event.node.props.eventKey
                  ).file;
                  if (!fileInfo) return;

                  setDataLoading(true);
                  const unwrappedOffset = UnwrapOffset(fileInfo.wrappedOffset);
                  ReadBytesFromFile(
                    props.files["0a0000"][unwrappedOffset.datFileNum]
                  )
                    .then(b => {
                      return DecodeDataBlocks(b, fileInfo.wrappedOffset);
                    })
                    .then(data => {
                      return DecodeExH(data.buffer);
                    })
                    .then(exh => {
                      setSelectedExH(exh);
                      setDataLoading(false);
                    });
                }
              }}
            >
              {renderTree(tree)}
            </Tree.DirectoryTree>
          </Col>
          <Col span={18}>
            {dataLoading ? (
              <Result
                icon={<Icon type="loading" />}
                title="자료 디코딩 중..."
              />
            ) : (
              <Tabs
                style={{
                  maxHeight: "calc(100vh - 291px)",
                  minHeight: "calc(100vh - 291px)"
                }}
                tabPosition="left"
              >
                {selectedExH.ranges.map(r => {
                  return (
                    <Tabs.TabPane key={r.start} tab={r.start}>
                      <Tabs tabPosition="top">
                        {selectedExH.languages.map(l => {
                          return (
                            <Tabs.TabPane key={l} tab={l}>
                              Content!
                            </Tabs.TabPane>
                          );
                        })}
                      </Tabs>
                    </Tabs.TabPane>
                  );
                })}
              </Tabs>
            )}
          </Col>
        </Row>
      )}
    </React.Fragment>
  );
};

export default DataEditor;
