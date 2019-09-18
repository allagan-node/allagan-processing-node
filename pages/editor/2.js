import {Alert, Card, Icon, Result, Steps} from "antd";
import Router from "next/router";
import React from "react";

import EditorContext from "../../src/contexts/editor-context";
import {Compute, DecodeDataBlocks, DecodeExH, ReadBytesFromFile, UnwrapOffset} from "../../src/utility";

class EditorSecond extends React.Component {
    static contextType = EditorContext;

    constructor(props) {
        super(props);

        this.state = {
            errors: [],
            loading: true,
            loadingText: "",
            dataMap: {},
            dataTree: {
                key: "root",
                name: "root",
                directories: [],
                files: []
            }
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

        this.state.loadingText = "문자열 자료 읽어들이는 중...";
        this.setState(this.state, this.cacheData);
    }

    async cacheData() {
        const data = this.context.files["0a0000"];
        const dataKeys = Object.keys(data);

        for (let dataKey of dataKeys) {
            await ReadBytesFromFile(data[dataKey]).then(b => {
                data[dataKey + "-cache"] = b;
            });
        }

        this.state.loadingText = "문자열 자료 매핑 중...";
        this.setState(this.state, this.constructDataMap);
    }

    async constructDataMap() {
        const dv = new DataView(this.context.files["0a0000"]["index-cache"]);
        const headerOffset = dv.getInt32(0xc, true);
        const fileOffset = dv.getInt32(headerOffset + 0x8, true);
        const fileCount = dv.getInt32(headerOffset + 0xc, true) / 0x10;

        for (let i = 0; i < fileCount; i++) {
            const curFileOffset = fileOffset + i * 0x10;
            const key = dv.getUint32(curFileOffset, true);
            const directoryKey = dv.getUint32(curFileOffset + 0x4, true);
            const wrappedOffset = dv.getUint32(curFileOffset + 0x8, true);
            const unwrappedOffset = UnwrapOffset(wrappedOffset);

            if (!this.state.dataMap[directoryKey]) {
                this.state.dataMap[directoryKey] = {};
            }

            this.state.dataMap[directoryKey][key] = {
                key: key,
                directoryKey: directoryKey,
                datFileNum: unwrappedOffset.datFileNum,
                datOffset: unwrappedOffset.datOffset
            };
        }

        this.state.loadingText = "문자열 자료 ExL 디코딩 중...";
        this.setState(this.state, this.decodeExL);
    }

    decodeExL() {
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

        for (let rootLine of rootLines) {
            const rootLineCols = rootLine.split(",");
            if (rootLineCols.length !== 2) continue;
            lines.push(rootLineCols[0]);
        }

        if (lines.length === 0) {
            this.state.errors.push(
                "ExL 디코딩에 실패했습니다. 선택한 자료가 올바른 자료인지 확인해주세요."
            );
            this.state.loading = false;
            this.setState(this.state);
            return;
        }

        this.state.loadingText = "문자열 자료 ExH 등록 중...";
        this.setState(this.state, () => this.buildTreeNode(lines));
    }

    buildTreeNode(lines) {
        for (let line of lines) {
            const name =
                line.indexOf("/") !== -1
                    ? line.substring(line.lastIndexOf("/") + 1, line.length)
                    : line;
            const directoryName =
                line.indexOf("/") !== -1
                    ? "exd/" + line.substring(0, line.lastIndexOf("/"))
                    : "exd";

            if (!this.state.dataMap[Compute(directoryName)]) continue;
            if (!this.state.dataMap[Compute(directoryName)][Compute(name + ".exh")])
                continue;

            const exHData = this.state.dataMap[Compute(directoryName)][
                Compute(name + ".exh")
                ];
            if (!this.context.files["0a0000"][exHData.datFileNum]) continue;

            const directories = directoryName.split("/");

            let node = this.state.dataTree;
            let parentKey = this.state.dataTree.key;

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
                name: name,
                exHData: exHData
            });
        }

        this.state.loadingText = "문자열 자료 ExH 디코딩 중...";
        this.setState(this.state, this.decodeExH);
    }

    async decodeExH() {
        const exHs = this.retrieveFiles(this.state.dataTree);
        for (let exH of exHs) {
            const data = DecodeDataBlocks(
                this.context.files["0a0000"][exH.exHData.datFileNum + "-cache"],
                exH.exHData.datOffset
            );
            const decodedExH = DecodeExH(data);
            if (
                decodedExH.variant === 1 &&
                decodedExH.ranges.length > 0 &&
                decodedExH.languages.length > 0
            ) {
                exH.decodedExH = decodedExH;
            }
        }

        this.state.loadingText = "문자열 자료 트리 정리 중...";
        this.setState(this.state, this.cleanUpTree);
    }

    retrieveFiles(node) {
        const files = [];
        for (let file of node.files) {
            files.push(file);
        }

        for (let directory of node.directories) {
            const directoryFiles = this.retrieveFiles(directory);
            for (let directoryFile of directoryFiles) {
                files.push(directoryFile);
            }
        }

        return files;
    }

    cleanUpTree() {
        this.cleanUpNode(this.state.dataTree);
        console.log(this.state.dataTree);
    }

    cleanUpNode(node) {
        let index = node.files.findIndex(f => !f.decodedExH);
        while (index !== -1) {
            node.files.splice(index, 1);
            index = node.files.findIndex(f => !f.decodedExH);
        }

        for (let directory of node.directories) {
            this.cleanUpNode(directory);
        }
    }

    render() {
        return (
            <Card style={{margin: "25px"}}>
                <Steps current={1}>
                    <Steps.Step title="편집할 자료 선택"/>
                    <Steps.Step title="편집"/>
                    <Steps.Step title="자료 재구축"/>
                </Steps>
                {this.state.errors.length > 0 && (
                    <div style={{marginTop: "25px"}}>
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
                )}
                {this.state.loading && (
                    <div style={{marginTop: "25px"}}>
                        <Result
                            icon={<Icon type="loading"/>}
                            title="트리 생성 중..."
                            subTitle={this.state.loadingText}
                        />
                    </div>
                )}
            </Card>
        );
    }
}

export default EditorSecond;
