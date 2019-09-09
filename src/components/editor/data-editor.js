import { Col, Icon, message, Progress, Result, Row } from "antd";
import React, { useEffect } from "react";

import { Compute, ReadFromFile } from "../../utility";

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
    ReadFromFile(props.files["0a0000"].index)
      .then(b => {
        const dv = new DataView(b);
        const headerOffset = dv.getInt32(0xc, true);
        const fileOffset = dv.getInt32(headerOffset + 0x8, true);
        const fileCount = dv.getInt32(headerOffset + 0xc, true) / 0x10;

        setLoadingText("문자열 자로 트리 구조 생성 중...");
        setProgress(0);
        for (let i = 0; i < fileCount; i++) {
          setProgress(Math.round(((i + 1) / fileCount) * 100));
          const curFileOffset = fileOffset + i * 0x10;
          const key = dv.getUint32(curFileOffset, true);
          fileMap[key] = {
            key: key,
            directoryKey: dv.getUint32(curFileOffset + 0x4, true),
            wrappedOffset: dv.getUint32(curFileOffset + 0x8, true)
          };
        }

        const root = fileMap[Compute("root.exl")];
        if (!root) {
          message.error(
            "문자열 자료 파일 인덱스 내 ExL 구조를 찾을 수 없습니다. 선택한 자료가 올바른 자료인지 확인해주세요."
          );
          props.decrementCurrent();
          return;
        }

        root.name = "root.exl";
        root.directoryName = "exd";

        const datFileNum = ((root.wrappedOffset & 0x7) >>> 1) & 0xff;

        setLoadingText("문자열 자료 ExL 읽는 중...");
        return ReadFromFile(props.files["0a0000"][datFileNum]);
      })
      .then(b => {
        const root = fileMap[Compute("root.exl")];
        const datOffset = ((root.wrappedOffset & 0xfffffff8) << 3) & 0xffffffff;

        const dv = new DataView(b);
        const endOfHeader = dv.getInt32(datOffset, true);
        const headerDv = new DataView(b, datOffset, endOfHeader);
        const blockCount = headerDv.getInt16(0x14, true);
        const zlib = require("zlib");

        const blocks = [];
        setLoadingText("문자열 자료 파일 ExL 압축 해제 중...");
        setProgress(0);
        for (let i = 0; i < blockCount; i++) {
          setProgress(Math.round(((i + 1) / blockCount) * 100));
          const blockOffset =
            datOffset + endOfHeader + headerDv.getInt32(0x18 + i * 0x8, true);
          const blockHeaderDv = new DataView(b, blockOffset, 0x10);

          const sourceSize = blockHeaderDv.getInt32(0x8, true);
          const rawSize = blockHeaderDv.getInt32(0xc, true);
          const isCompressed = sourceSize < 0x7d00;
          let actualSize = isCompressed ? sourceSize : rawSize;

          const paddingLeftover = (actualSize + 0x10) % 0x80;
          if (isCompressed && paddingLeftover !== 0) {
            actualSize += 0x80 - paddingLeftover;
          }

          let block = b.slice(
            blockOffset + 0x10,
            blockOffset + 0x10 + actualSize
          );

          if (isCompressed) {
            block = zlib.inflateRawSync(new Buffer(block));
          } else {
            block = new Uint8Array(block);
          }

          blocks.push(block);
        }

        setLoadingText("문자열 자료 파일 ExL 취합 중...");
        const data = new Uint8Array(
          blocks.reduce((pv, cv) => pv + cv.length, 0)
        );
        let curDataOffset = 0;
        for (let block of blocks) {
          data.set(block, curDataOffset);
          curDataOffset += block.length;
        }

        setLoadingText("문자열 자료 파일 ExL 디코딩 중...");
        setProgress(0);
        const rootTextLines = new TextDecoder().decode(data).split("\n");
        for (let i = 0; i < rootTextLines.length; i++) {
          setProgress(Math.round(((i + 1) / rootTextLines.length) * 100));

          if (!rootTextLines[i]) continue;
          const rootTextCols = rootTextLines[i].split(",");
          if (rootTextCols.length !== 2) continue;

          setLoadingText(
            "문자열 자료 파일 ExL 디코딩 중... " + rootTextCols[0]
          );
        }
      });
  }, []);

  const [loading, setLoading] = React.useState(true);
  const [loadingText, setLoadingText] = React.useState("");
  const [progress, setProgress] = React.useState(100);

  return (
    <React.Fragment>
      {loading ? (
        <Result
          icon={
            <React.Fragment>
              <Icon type="loading" />
              <Progress
                percent={progress}
                status="active"
                style={{ marginTop: "25px" }}
              />
            </React.Fragment>
          }
          title="트리 생성 중..."
          subTitle={loadingText}
        />
      ) : (
        <Row gutter={16}>
          <Col span={6}></Col>
          <Col span={18}></Col>
        </Row>
      )}
    </React.Fragment>
  );
};

export default DataEditor;
