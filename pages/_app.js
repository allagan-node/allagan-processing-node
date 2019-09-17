import {Layout} from "antd";
import App from "next/app";
import React from "react";

import EditorContext from "../src/contexts/editor-context";

import TopHeader from "../src/components/top-header";

class AllaganProcessingNode extends App {
    constructor(props) {
        super(props);

        this.setFiles = files => {
            this.state.files = files;
            this.setState(this.state);
        };

        this.state = {
            files: {},
            setFiles: this.setFiles
        };
    }

    render() {
        const {Component, pageProps} = this.props;

        return (
            <Layout>
                <TopHeader/>
                <Layout.Content style={{minHeight: "100vh", paddingTop: "64px"}}>
                    <EditorContext.Provider value={this.state}>
                        <Component {...pageProps} />
                    </EditorContext.Provider>
                </Layout.Content>
            </Layout>
        );
    }
}

export default AllaganProcessingNode;
