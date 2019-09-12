import { Col, Icon, message, Result, Row, Spin, Table, Tabs, Tree } from "antd";
import React, { useEffect } from "react";

import {
  Compute,
  DecodeDataBlocks,
  DecodeExH,
  GetLanguageCode,
  ReadBytesFromFile,
  UnwrapOffset
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
            directoryName: directoryName,
            name: name,
            file: file
          });
        }

        setTree(tree);
        setFiles(files);
        setFileMap(fileMap);
        setLoading(false);
      });
  }, []);

  const [loading, setLoading] = React.useState(true);
  const [loadingText, setLoadingText] = React.useState("");
  const [tree, setTree] = React.useState({});
  const [files, setFiles] = React.useState([]);
  const [fileMap, setFileMap] = React.useState({});
  const [dataLoading, setDataLoading] = React.useState(false);
  const [selectedExH, setSelectedExH] = React.useState(false);
  const [tableLoading, setTableLoading] = React.useState(true);
  const [tableColumns, setTableColumns] = React.useState([]);
  const [tableDataSource, setTableDataSource] = React.useState([]);
  const [selectedRange, setSelectedRange] = React.useState();
  const [selectedLanguage, setSelectedLanguage] = React.useState();

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

  const loadTable = (
    name,
    directoryName,
    rangeStart,
    langCode,
    columns,
    fixedSizeDataLength
  ) => {
    setTableLoading(true);

    if (!fileMap[Compute(directoryName)]) {
      setTableLoading(false);
      return;
    }

    console.log(name + "_" + rangeStart + "_" + langCode + ".exd");

    const targetFile =
      fileMap[Compute(directoryName)][
        Compute(name + "_" + rangeStart + "_" + langCode + ".exd")
      ];

    if (!targetFile) {
      setTableLoading(false);
      return;
    }

    const unwrappedOffset = UnwrapOffset(targetFile.wrappedOffset);
    ReadBytesFromFile(props.files["0a0000"][unwrappedOffset.datFileNum])
      .then(b => {
        return DecodeDataBlocks(b, targetFile.wrappedOffset);
      })
      .then(data => {
        const tableColumns = [];
        for (let column of columns) {
          if (column.type === 0x0) {
            tableColumns.push({
              title: column.offset,
              key: column.offset,
              dataIndex: column.offset,
              render: b => {
                return b && b.length > 0
                  ? new TextDecoder().decode(new Uint8Array(b).buffer)
                  : "";
              }
            });
          }
        }
        setTableColumns(tableColumns);

        const tableDataSource = [];

        const dv = new DataView(data.buffer);
        const offsetTableSize = dv.getInt32(0x8, false);
        const chunkTableSize = dv.getInt32(0xc, false);

        const offsetDv = new DataView(data.buffer, 0x20, offsetTableSize);

        for (let i = 0; i < offsetTableSize; i += 0x8) {
          const key = offsetDv.getInt32(i, false);
          const chunkOffset = offsetDv.getInt32(i + 0x4, false);

          const chunkHeaderDv = new DataView(data.buffer, chunkOffset, 0x6);
          const chunkColumnDefinitionDv = new DataView(
            data.buffer,
            chunkOffset + 0x6,
            fixedSizeDataLength
          );

          const chunkSize = chunkHeaderDv.getInt32(0x0, false);
          const chunkCheckDigit = chunkHeaderDv.getInt16(0x4, false);

          const chunkRawDataDv = new DataView(
            data.buffer,
            chunkOffset + 0x6 + fixedSizeDataLength,
            chunkSize - fixedSizeDataLength
          );
          const row = {
            key: key
          };

          for (let column of tableColumns) {
            let fieldIndex = chunkColumnDefinitionDv.getInt32(
              column.key,
              false
            );
            const fields = [];

            let b = chunkRawDataDv.getUint8(fieldIndex);
            while (b !== 0x0) {
              fields.push(b);
              fieldIndex++;
              if (fieldIndex >= chunkRawDataDv.byteLength) break;
              b = chunkRawDataDv.getUint8(fieldIndex);
            }

            row[column.key] = fields;
          }

          tableDataSource.push(row);
        }

        setTableDataSource(tableDataSource);
        setSelectedRange(rangeStart);
        setSelectedLanguage(langCode);
        setTableLoading(false);
      });
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
                  );
                  if (!fileInfo) return;

                  setDataLoading(true);
                  const unwrappedOffset = UnwrapOffset(
                    fileInfo.file.wrappedOffset
                  );
                  ReadBytesFromFile(
                    props.files["0a0000"][unwrappedOffset.datFileNum]
                  )
                    .then(b => {
                      return DecodeDataBlocks(b, fileInfo.file.wrappedOffset);
                    })
                    .then(data => {
                      return DecodeExH(data.buffer);
                    })
                    .then(exh => {
                      exh.name = fileInfo.name;
                      exh.directoryName = fileInfo.directoryName;
                      setSelectedExH(exh);

                      if (
                        exh.variant === 1 &&
                        exh.ranges.length > 0 &&
                        exh.languages.length > 0
                      ) {
                        loadTable(
                          exh.name,
                          exh.directoryName,
                          exh.ranges[0].start,
                          GetLanguageCode(exh.languages[0]),
                          exh.columns,
                          exh.fixedSizeDataLength
                        );
                      }

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
            ) : selectedExH ? (
              <Tabs
                onChange={key => {
                  loadTable(
                    selectedExH.name,
                    selectedExH.directoryName,
                    key,
                    selectedLanguage,
                    selectedExH.columns,
                    selectedExH.fixedSizeDataLength
                  );
                }}
                style={{ height: "calc(100vh - 291px)" }}
                tabPosition="left"
              >
                {selectedExH.variant === 1 &&
                selectedExH.ranges.length > 0 &&
                selectedExH.languages.length > 0 ? (
                  selectedExH.ranges.map(r => {
                    return (
                      <Tabs.TabPane key={r.start} tab={r.start}>
                        <Tabs
                          onChange={key => {
                            console.log(selectedRange);

                            loadTable(
                              selectedExH.name,
                              selectedExH.directoryName,
                              selectedRange,
                              GetLanguageCode(parseInt(key)),
                              selectedExH.columns,
                              selectedExH.fixedSizeDataLength
                            );
                          }}
                          tabPosition="top"
                        >
                          {selectedExH.languages.map(l => {
                            return (
                              <Tabs.TabPane key={l} tab={GetLanguageCode(l)}>
                                <Spin
                                  indicator={<Icon type="loading" />}
                                  spinning={tableLoading}
                                >
                                  <Table
                                    columns={tableColumns}
                                    dataSource={tableDataSource}
                                  />
                                </Spin>
                              </Tabs.TabPane>
                            );
                          })}
                        </Tabs>
                      </Tabs.TabPane>
                    );
                  })
                ) : (
                  <Tabs.TabPane key="0" tab="0">
                    <Result
                      status="error"
                      title="해당 ExH 형식은 아직 지원하지 않습니다."
                    />
                  </Tabs.TabPane>
                )}
              </Tabs>
            ) : (
              <Result
                style={{
                  maxHeight: "calc(100vh - 291px)",
                  minHeight: "calc(100vh - 291px)"
                }}
                title="왼쪽 트리에서 편집할 ExH를 선택해주세요."
              />
            )}
          </Col>
        </Row>
      )}
    </React.Fragment>
  );
};

export default DataEditor;
