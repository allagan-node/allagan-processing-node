import { Icon, Layout, Menu } from "antd";
import Router from "next/router";
import React, { useEffect } from "react";

const TopHeader = props => {
  useEffect(() => {
    if (current.length === 1 && Router.pathname === "/") {
      setCurrent([]);
    } else if (
      (current.length === 0 && Router.pathname !== "/") ||
      (current.length === 1 && current[0] !== Router.pathname)
    ) {
      setCurrent([Router.pathname]);
    }
  });

  const [current, setCurrent] = React.useState([]);

  return (
    <Layout.Header style={{ position: "fixed", zIndex: 1, width: "100%" }}>
      <Menu
        mode="horizontal"
        selectedKeys={current}
        style={{ lineHeight: "64px" }}
        theme="dark"
      >
        <Menu.Item key="/" onClick={() => Router.push("/")}>
          알라그 가공 시스템
        </Menu.Item>
        <Menu.Item key="/editor/1" onClick={() => Router.push("/editor/1")}>
          <Icon type="edit" />
          편집 도구
        </Menu.Item>
        <Menu.Item key="/builder" onClick={() => Router.push("/builder")}>
          <Icon type="build" />
          취합 도구
        </Menu.Item>
      </Menu>
    </Layout.Header>
  );
};

export default TopHeader;
