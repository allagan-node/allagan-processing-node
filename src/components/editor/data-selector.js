import { Alert, Button, Icon, Upload } from "antd";
import React from "react";

const DataSelector = props => {
  const [fileList, setFileList] = React.useState([]);
  const [errors, setErrors] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  return (
    <React.Fragment>
      <div style={{ marginTop: "25px" }}>
        <Alert
          description="현재는 문자열 자료 파일 편집만을 지원합니다. 문자열 파일은 통상적으로 game/sqpack/ffxiv에서 찾을 수 있으며 파일 이름이 0a0000으로 시작하고 (예: 0a0000.win32.index), 여러 개의 index와 dat 파일로 나누어져 있습니다 (예: *.index, *.index2, *.dat0...). 자료를 선택하실 때에는 모든 index와 dat 파일들을 한꺼번에 선택해주세요."
          message="편집할 파이널 판타지 14 자료 파일을 선택합니다."
          showIcon
          type="info"
        />
      </div>
      {errors.length > 0 && (
        <div style={{ marginTop: "25px" }}>
          <Alert
            description={
              <ul>
                {errors.map((ce, i) => {
                  return <li key={i}>{ce}</li>;
                })}
              </ul>
            }
            message="자료 선택 오류"
            showIcon
            type="error"
          />
        </div>
      )}
      <div style={{ marginTop: "25px" }}>
        <Upload.Dragger
          accept=".index*,.dat*"
          beforeUpload={(file, _fileList) => {
            setErrors([]);
            setFileList([]);
            setLoading(true);

            let _errors = [];

            let indexFiles = _fileList.filter(f => {
              return (
                f.name.substring(f.name.lastIndexOf("."), f.name.length) ===
                ".index"
              );
            });

            if (indexFiles.length === 0) {
              _errors.push(
                "index 파일을 찾지 못했습니다. index 파일을 선택해주세요."
              );
              setErrors(_errors);
              setLoading(false);

              return false;
            }

            if (indexFiles.length > 1) {
              _errors.push(
                "여러 종류의 자료를 동시에 선택할 수 없습니다: " +
                  indexFiles.map(f => f.name).join(", ")
              );
              setErrors(_errors);
              setLoading(false);

              return false;
            }

            return indexFiles[0].arrayBuffer().then(b => {
              let dv = new DataView(b);
              let headerOffset = dv.getInt32(0xc, true);
              let numDat = dv.getUint8(headerOffset + 0x50);

              for (let i = 0; i < numDat; i++) {
                if (
                  _fileList.findIndex(f => {
                    return (
                      f.name.substring(
                        f.name.lastIndexOf("."),
                        f.name.length
                      ) ===
                      ".dat" + i
                    );
                  }) === -1
                ) {
                  _errors.push(
                    "dat" +
                      i +
                      " 파일을 찾지 못했습니다. dat" +
                      i +
                      " 파일을 선택해주세요."
                  );
                }
              }

              setErrors(_errors);
              setLoading(false);

              if (_errors.length === 0) {
                setFileList(_fileList);
              }

              return false;
            });
          }}
          customRequest={() => {}}
          fileList={fileList}
          multiple={true}
          showUploadList={{
            showPreviewIcon: true,
            showRemoveIcon: false
          }}
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
      <div style={{ marginTop: "25px" }}>
        <Button
          block
          disabled={errors.length > 0 || fileList.length === 0}
          loading={loading}
          onClick={() => {
            props.files.indexFile = fileList.find(f => {
              return (
                f.name.substring(f.name.lastIndexOf("."), f.name.length) ===
                ".index"
              );
            });
            props.files.datFiles = fileList.filter(f => {
              return (
                f.name.substring(f.name.lastIndexOf("."), f.name.length - 1) ===
                ".dat"
              );
            });
            props.incrementCurrent();
          }}
          type="primary"
        >
          다음 단계로
          <Icon type="right" />
        </Button>
      </div>
    </React.Fragment>
  );
};

export default DataSelector;
