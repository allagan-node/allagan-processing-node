import { Progress, Result } from "antd";
import React from "react";

class Test extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loadingText: "",
      loadingProgress: 0,
      keepUpdating: true
    };
  }

  componentDidMount() {
    this.state.loadingText = "";
    this.state.loadingProgress = 0;
    this.setState(this.state, this.test);
    return this.keepUpdating();
  }

  async keepUpdating() {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, 500);
    }).then(() => {
      if (this.state.keepUpdating) this.setState(this.state, this.keepUpdating);
    });
  }

  async test() {
    for (let i = 1; i <= 100; i++) {
      await new Promise((resolve, reject) => {
        this.state.loadingText = i.toString();
        this.state.loadingProgress = i;
        setTimeout(resolve, 5000);
      }).then(() => {
        console.log(i);
        if (i >= 10) this.state.keepUpdating = false;
      });
    }
  }

  render() {
    return (
      <Result
        icon={<Progress type="circle" percent={this.state.loadingProgress} />}
        title="PROGRESS TEST"
        subTitle={this.state.loadingText}
      />
    );
  }
}

export default Test;
