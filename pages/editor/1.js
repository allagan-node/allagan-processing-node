import {
  Alert,
  Button,
  Card,
  Icon,
  Progress,
  Result,
  Steps,
  Upload
} from "antd";
import Router from "next/router";
import React from "react";

import EditorContext from "../../src/contexts/editor-context";
import { ReadBytesFromFile } from "../../src/utility";

const EditorFirst = () => {
  const [errors, setErrors] = React.useState([]);
  const [pass, setPass] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadingProgress, setLoadingProgress] = React.useState(0);
  const [loadingText, setLoadingText] = React.useState("");

  return (
    <EditorContext.Consumer>
      {editorContext => {
        return (
          <Card style={{ margin: "25px" }}>
            <Steps current={0}>
              <Steps.Step title="편집할 자료 선택" />
              <Steps.Step title="편집" />
              <Steps.Step title="자료 재구축" />
            </Steps>
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
                      {errors.map((e, i) => {
                        return <li key={i}>{e}</li>;
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
              ) : loading ? (
                <Result
                  icon={<Progress type="circle" percent={loadingProgress} />}
                  title="자료 검사 중..."
                  subTitle={loadingText}
                />
              ) : (
                <Upload.Dragger
                  accept=".index*,.dat*"
                  beforeUpload={(file, fileList) => {
                    if (!fileList || fileList.length === 0) return;
                    if (fileList[fileList.length - 1].uid !== file.uid) return;

                    setLoading(true);
                    setLoadingText("");
                    setLoadingProgress(0);
                    setErrors([]);
                    setPass(false);

                    return new Promise(resolve => {
                      const files = {};
                      const _errors = [];
                      const indexFiles = fileList.filter(f => {
                        return (
                          f.name.substring(
                            f.name.lastIndexOf("."),
                            f.name.length
                          ) === ".index"
                        );
                      });
                      if (indexFiles.length === 0) {
                        _errors.push("index 파일을 찾지 못했습니다.");
                        setErrors(_errors);
                        setLoading(false);
                        resolve();
                      }

                      const diagnose = i => {
                        setLoadingProgress(
                          Math.round((i / indexFiles.length) * 100)
                        );
                        setLoadingText("검사 중... " + indexFiles[i].name);
                        ReadBytesFromFile(indexFiles[i]).then(b => {
                          const dv = new DataView(b);
                          const headerOffset = dv.getInt32(0xc, true);
                          const numDat = dv.getUint8(headerOffset + 0x50, true);

                          const fileName = indexFiles[i].name.substring(
                            0,
                            indexFiles[i].name.indexOf(".")
                          );
                          files[fileName] = {
                            indexFile: indexFiles[i]
                          };
                          for (let j = 0; j < numDat; j++) {
                            const datFile = fileList.find(f => {
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
                                fileName +
                                  ": .dat" +
                                  j +
                                  " 파일을 찾지 못했습니다."
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
                              files.loaded = true;
                              editorContext.setFiles(files);
                              setPass(true);
                            }
                            setErrors(_errors);
                            setLoading(false);
                          }
                        });
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
                </Upload.Dragger>
              )}
            </div>
            <div style={{ marginTop: "25px" }}>
              <Button
                block
                disabled={!pass}
                loading={loading}
                onClick={() => Router.push("/editor/2")}
                type="primary"
              >
                다음 단계로
                <Icon type="right" />
              </Button>
            </div>
          </Card>
        );
      }}
    </EditorContext.Consumer>
  );
};

export default EditorFirst;
