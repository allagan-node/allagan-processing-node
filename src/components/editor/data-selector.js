import { Alert, Button, Icon, Progress, Result, Upload } from "antd";
import React from "react";

const DataSelector = props => {
  const [errors, setErrors] = React.useState([]);
  const [pass, setPass] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [loadingText, setLoadingText] = React.useState("");

  return (
    <React.Fragment>
      <div style={{ marginTop: "25px" }}>
        <Alert
          description="예) C:\Program Files (x86)\SquareEnix\FINAL FANTASY XIV - A Realm Reborn\game\sqpack"
          message="편집할 파이널 판타지 14 자료들이 설치되어 있는 폴더를 선택해주세요."
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
        {pass ? (
          <Result
            status="success"
            title="자료 선택 완료!"
            subTitle="다음 단계로 넘어가 자료 편집을 시작하세요!"
          />
        ) : (
          <Upload.Dragger
            accept=".index*,.dat*"
            beforeUpload={(file, fileList) => {
              const files = {};

              setErrors([]);
              setPass(false);
              setProgress(0);
              setLoadingText("");
              setLoading(true);

              return new Promise(async (resolve, reject) => {
                let _errors = [];

                let indexFiles = fileList.filter(f => {
                  return (
                    f.name.substring(f.name.lastIndexOf("."), f.name.length) ===
                    ".index"
                  );
                });

                if (indexFiles.length === 0) {
                  _errors.push("index 파일을 찾지 못했습니다.");
                  setErrors(_errors);
                  setLoading(false);
                  resolve();
                }

                const diagnose = i => {
                  setProgress(Math.round(((i + 1) / indexFiles.length) * 100));
                  setLoadingText("검사 중... " + indexFiles[i].name);

                  let fr = new FileReader();
                  fr.onload = e => {
                    let b = e.target.result;
                    let dv = new DataView(b);
                    let headerOffset = dv.getInt32(0xc, true);
                    let numDat = dv.getUint8(headerOffset + 0x50);

                    let fileName = indexFiles[i].name.substring(
                      0,
                      indexFiles[i].name.indexOf(".")
                    );
                    files[fileName] = {
                      index: indexFiles[i]
                    };

                    for (let j = 0; j < numDat; j++) {
                      let datFile = fileList.find(f => {
                        return (
                          f.name.substring(0, f.name.indexOf(".")) ===
                            fileName &&
                          f.name.substring(
                            f.name.lastIndexOf("."),
                            f.name.length
                          ) ===
                            ".dat" + j
                        );
                      });

                      if (!datFile) {
                        _errors.push(
                          fileName + ": .dat" + j + " 파일을 찾지 못했습니다."
                        );
                      } else {
                        files[fileName][j] = datFile;
                      }
                    }

                    i++;
                    if (i < indexFiles.length) {
                      diagnose(i);
                    } else {
                      if (_errors.length === 0) {
                        props.setFiles(files);
                        setPass(true);
                      }
                      setErrors(_errors);
                      setLoading(false);
                    }
                  };
                  fr.readAsArrayBuffer(indexFiles[i]);
                };

                diagnose(0);
                resolve();
              });
            }}
            customRequest={() => {}}
            disabled={loading}
            directory={true}
            showUploadList={false}
          >
            {loading ? (
              <React.Fragment>
                <div className="ant-upload-drag-icon">
                  <Progress type="circle" percent={progress} />
                </div>
                <p className="ant-upload-text">{loadingText}</p>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <p className="ant-upload-drag-icon">
                  <Icon type="inbox" />
                </p>
                <p className="ant-upload-text">
                  여기를 클릭하거나 자료가 담긴 폴더를 이 곳으로 드래그하여
                  선택하세요.
                </p>
                <p className="ant-upload-hint">
                  파이널 판타지 14 클라이언트 자료는 일반적으로 /game/sqpack
                  하위 경로에 담겨져 있습니다. sqpack 폴더를 선택해주세요.
                </p>
              </React.Fragment>
            )}
          </Upload.Dragger>
        )}
      </div>
      <div style={{ marginTop: "25px" }}>
        <Button
          block
          disabled={!pass}
          loading={loading}
          onClick={() => {
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
