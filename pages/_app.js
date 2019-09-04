import { Layout } from "antd";
import App from "next/app";
import React from "react";

import TopHeader from "../src/components/top-header";

class AllaganProcessingNode extends App {
  constructor(props) {
    super(props);
  }

  render() {
    const { Component, pageProps } = this.props;

    return (
      <Layout>
        <TopHeader />
        <Layout.Content style={{ height: "100vh", paddingTop: "64px" }}>
          <Component {...pageProps} />
          <Layout.Footer style={{ textAlign: "center" }}>
            알라그 가공 시스템
          </Layout.Footer>
        </Layout.Content>
      </Layout>
    );
  }
}

export default AllaganProcessingNode;
