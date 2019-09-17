import Document, {Head, Html, Main, NextScript} from "next/document";
import React from "react";

class AllaganProcessingNodeDocument extends Document {
    render() {
        return (
            <Html>
                <Head>
                    <meta
                        content="initial-scale=1.0, width=device-width"
                        name="viewport"
                    />
                </Head>
                <body>
                <Main/>
                <NextScript/>
                </body>
            </Html>
        );
    }
}

export default AllaganProcessingNodeDocument;
