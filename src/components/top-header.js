import {Icon, Layout, Menu} from "antd";
import Router from "next/router";
import React from "react";

class TopHeader extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            pathname: []
        };
    }

    componentDidMount() {
        this.state.pathname = [];
        if (Router.pathname !== "/") {
            this.state.pathname.push(Router.pathname);
        }
        this.setState(this.state);
    }

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (Router.pathname === "/") {
            if (this.state.pathname.length === 1) {
                this.state.pathname = [];
                this.setState(this.state);
            }
        } else {
            let pathname = Router.pathname;
            if (pathname.indexOf("/", 1) !== -1) {
                pathname = pathname.substring(0, pathname.indexOf("/", 1));
            }
            if (
                this.state.pathname.length === 0 ||
                (this.state.pathname.length === 1 &&
                    this.state.pathname[0] !== pathname)
            ) {
                this.state.pathname = [];
                this.state.pathname.push(pathname);
                this.setState(this.state);
            }
        }
    }

    render() {
        return (
            <Layout.Header style={{position: "fixed", zIndex: 1, width: "100%"}}>
                <Menu
                    mode="horizontal"
                    selectedKeys={this.state.pathname}
                    style={{lineHeight: "64px"}}
                    theme="dark"
                >
                    <Menu.Item key="/" onClick={() => Router.push("/")}>
                        알라그 가공 시스템
                    </Menu.Item>
                    <Menu.Item key="/editor" onClick={() => Router.push("/editor/1")}>
                        <Icon type="edit"/>
                        편집 도구
                    </Menu.Item>
                    <Menu.Item key="/builder" onClick={() => Router.push("/builder")}>
                        <Icon type="build"/>
                        취합 도구
                    </Menu.Item>
                </Menu>
            </Layout.Header>
        );
    }
}

export default TopHeader;
