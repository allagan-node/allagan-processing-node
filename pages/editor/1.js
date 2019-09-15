import { Alert, Button, Card, Icon, Progress, Result, Steps, Upload } from "antd";
import Router from 'next/router';
import React from "react";

import EditorContext from "../../src/contexts/editor-context";
import { ReadBytesFromFile } from '../../src/utility';

class EditorFirst extends React.Component {
  static contextType = EditorContext;

  constructor(props) {
    super(props);

    this.state = {
      errors: [],
      pass: false,
      loading: false,
      loadingProgress: 0,
      loadingText: ""
    };
  }

  validateIndices(i, indexFiles, fileList, files, datToValidate) {
    this.state.loadingProgress = Math.round(i / indexFiles.length * 100);
    this.state.loadingText = '인덱스 검사 중...' + indexFiles[i].name;
    this.setState(this.state, () => {
      ReadBytesFromFile(indexFiles[i]).then(b => {
        if (new TextDecoder().decode(b.slice(0, 6)) !== 'SqPack') {
          this.state.errors.push(indexFiles[i].name + ' 파일 포맷이 잘못되었습니다.');
        } else {
          const dv = new DataView(b);
          const headerOffset = dv.getInt32(0xc, true);
          const numDat = dv.getUint8(headerOffset + 0x50, true);
          
          const fileName = indexFiles[i].name.substring(0, indexFiles[i].name.indexOf('.'));
          files[fileName] = {
            index: indexFiles[i]
          };

          for (let j = 0; j < numDat; j++) {
            const datFile = fileList.find(f => {
              return f.name.substring(0, f.name.indexOf('.')) === fileName && f.name.substring(f.name.lastIndexOf('.'), f.name.length) === '.dat' + j;
            });

            if (!datFile) {
              this.state.errors.push(fileName + ': .dat' + j + ' 파일을 찾지 못했습니다.');
            } else {
              datToValidate.push(datFile);
            }
          }
        }

        i++;
        if (i < indexFiles.length) {
          this.validateIndices(i, indexFiles, fileList, files, datToValidate);
        } else {
          if (datToValidate.length === 0) {
            this.state.errors.push('검사할 데이터 파일을 찾지 못했습니다.');
            this.state.loading = false;
            this.setState(this.state);
          } else {
            this.validateDatFiles(0, datToValidate, files);
          }
        }
      });
    });
  }

  validateDatFiles(i, datToValidate, files) {
    this.state.loadingProgress = Math.round(i / datToValidate.length * 100);
    this.state.loadingText = '데이터 검사 중...' + datToValidate[i].name;
    this.setState(this.state, () => {
      ReadBytesFromFile(datToValidate[i].slice(0, 6)).then(b => {
        const fileName = datToValidate[i].name.substring(0, datToValidate[i].name.indexOf('.'));
        const datNum = datToValidate[i].name.substring(datToValidate[i].name.length - 1, datToValidate[i].name.length);

        if (datNum === '0' && new TextDecoder().decode(b.slice(0, 6)) !== 'SqPack') {
          this.state.errors.push(datToValidate[i].name + ' 파일 포맷이 잘못되었습니다.');
        } else {
          files[fileName][datNum] = datToValidate[i];
        }

        i++;
        if (i < datToValidate.length) {
          this.validateDatFiles(i, datToValidate, files);
        } else {
          if (this.state.errors.length === 0) {
            files.loaded = true;
            this.context.setFiles(files);
            this.state.pass = true;
          }
          this.state.loading = false;
          this.setState(this.state);
        }
      });
    });
  }

  validateFileList(file, fileList) {
    if (!fileList || fileList.length === 0) return;
    if (fileList[fileList.length - 1].uid !== file.uid) return;

    let state = {
      errors: [],
      pass: false,
      loading: true,
      loadingProgress: 0,
      loadingText: ''
    };
    this.setState(state, () => {
      const indexFiles = fileList.filter(f => {
        return f.name.substring(f.name.lastIndexOf('.'), f.name.length) === '.index';
      });
      if (indexFiles.length === 0) {
        this.state.errors.push('index 파일을 찾지 못했습니다.');
        this.state.loading = false;
        this.setState(this.state);
        return;
      }

      this.validateIndices(0, indexFiles, fileList, {}, []);
    });
  }

  render() {
    return <Card style={{ margin: "25px" }}>
      <Steps current={0}>
        <Steps.Step title="편집할 자료 선택" />
        <Steps.Step title="편집" />
        <Steps.Step title="자료 재구축" />
      </Steps>
      <div style={{ marginTop: '25px' }}>
        <Alert description="예) C:\Program Files (x86)\SquareEnix\FINAL FANTASY XIV - A Realm Reborn\game\sqpack"
        message="편집할 파이널 판타지 14 자료들이 설치되어 있는 폴더를 선택해주세요."
        showIcon
        type="info" />
      </div>
      {this.state.errors.length > 0 && <div style={{ marginTop: '25px' }}>
        <Alert description={<ul>{this.state.errors.map((e, i) => { return <li key={i}>{e}</li>; })}</ul>}
        message="자료 선택 오류" showIcon type="error" />
      </div>}
      {this.state.pass && !this.state.loading && <div style={{ marginTop: '25px' }}>
        <Result status="success" title="자료 선택 완료!" subTitle="다음 단계로 넘어가 자료 편집을 시작하세요!" />
      </div>}
      {!this.state.pass && this.state.loading && <div style={{ marginTop: '25px' }}>
        <Result icon={<Progress type="circle" percent={this.state.loadingProgress} />} title="자료 검사 중..." subTitle={this.state.loadingText} />
      </div>}
      {!this.state.pass && !this.state.loading && <div style={{ marginTop: '25px' }}>
        <Upload.Dragger accept=".index*,.dat*" beforeUpload={(file, fileList) => this.validateFileList(file, fileList)}
        customRequest={() => {}} directory={true} showUploadList={false}>
          <p className="ant-upload-drag-icon">
            <Icon type="inbox" />
          </p>
          <p className="ant-upload-text">
            여기를 클릭하거나 자료가 담긴 폴더를 이 곳으로 드래그하여 선택하세요.
          </p>
          <p className="ant-upload-hint">
            파이널 판타지 14 클라이언트 자료는 일반적으로 /game/sqpack 하위 경로에 담겨져 있습니다. sqpack 폴더를 선택해주세요.
          </p>
        </Upload.Dragger>
      </div>}
      <div style={{ marginTop: '25px' }}>
        <Button block disabled={!this.state.pass} loading={this.state.loading} onClick={() => Router.push('/editor/2')} type="primary">
          다음 단계로
          <Icon type="right" />
        </Button>
      </div>
    </Card>;
  }
}

export default EditorFirst;