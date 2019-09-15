import { Avatar, Card, Col, Result, Row } from "antd";
import Router from "next/router";
import React from "react";

class Index extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <Result
          icon={<img src="/static/28642.png" style={{ borderRadius: "50%" }} />}
          subTitle="알라그 가공 시스템은 파이널 판타지 14 클라이언트 자료 가공에 쓰이는 여러 도구를 제공합니다. 아래 목록에서 사용할 도구를 선택해주세요."
          title="알라그 가공 시스템"
        />
        <Row justify="center" style={{ marginTop: "25px" }} type="flex">
          <Col span={8}>
            <Card hoverable onClick={() => Router.push("/editor/1")}>
              <Card.Meta
                avatar={<Avatar icon="edit" />}
                description="편집 도구를 사용해 자료 편집이 가능합니다."
                title="편집 도구"
              />
            </Card>
          </Col>
          <Col span={1} />
          <Col span={8}>
            <Card hoverable onClick={() => Router.push("/builder")}>
              <Card.Meta
                avatar={<Avatar icon="build" />}
                description="취합 도구를 사용해 부분적으로 편집된 자료들을 하나로 취합할 수 있습니다."
                title="취합 도구"
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }
}

export default Index;
