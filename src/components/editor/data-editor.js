import { Col, Icon, message, Progress, Result, Row } from "antd";
import React, { useEffect } from "react";

import { Compute } from "../../utility";

const DataEditor = props => {
  useEffect(() => {
    console.log(props.files);

    (async () => {
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

      let fileMap = {};

      setLoadingText("문자열 자료 인덱스 읽는 중...");
      let dv = new DataView(await props.files["0a0000"].index.arrayBuffer());
      let headerOffset = dv.getInt32(0xc, true);
      let fileOffset = dv.getInt32(headerOffset + 0x8, true);
      let fileCount = dv.getInt32(headerOffset + 0xc, true) / 0x10;

      setLoadingText("문자열 자료 트리 구조 생성 중...");
      setProgress(0);
      for (let i = 0; i < fileCount; i++) {
        setProgress(Math.round(((i + 1) / fileCount) * 100));
        let curFileOffset = fileOffset + i * 0x10;
        let key = dv.getUint32(curFileOffset, true);
        let directoryKey = dv.getUint32(curFileOffset + 0x4, true);
        let wrappedOffset = dv.getUint32(curFileOffset + 0x8, true);

        fileMap[key] = {
          key: key,
          directoryKey: directoryKey,
          wrappedOffset: wrappedOffset
        };
      }

      let root = fileMap[Compute("root.exl")];
      if (!root) {
        message.error(
          "문자열 자료 파일 인덱스 내 ExL 구조를 찾을 수 없습니다. 선택한 자료가 올바른 자료인지 확인해주세요."
        );
        props.decrementCurrent();
        return;
      }

      root.name = "root.exl";
      root.directoryName = "exd";

      let datFileNum = ((root.wrappedOffset & 0x7) >>> 1) & 0xff;
      let datOffset = ((root.wrappedOffset & 0xfffffff8) << 3) & 0xffffffff;

      setLoadingText("문자열 자료 ExL 읽는 중...");
      let b = await props.files["0a0000"][datFileNum].arrayBuffer();

      dv = new DataView(b);
      let endOfHeader = dv.getInt32(datOffset, true);
      let headerDv = new DataView(b, datOffset, endOfHeader);
      let blockCount = headerDv.getInt16(0x14, true);

      setLoadingText("문자열 자료 파일 ExL 압축 해제 중...");
      setProgress(0);
      for (let i = 0; i < blockCount; i++) {
        setProgress(Math.round(((i + 1) / blockCount) * 100));
        let blockOffset = headerDv.getInt32(0x18 + i * 0x8, true);

        const zlib = require("zlib");
        zlib.deflate(".....................", (err, buffer) => {
          console.log(err);
          console.log(buffer);
        });
      }

      return;
    })();
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
