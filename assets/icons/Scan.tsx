import * as React from "react"
import Svg, { Path } from "react-native-svg"

function Scan({ width = 20, height = 20 }: { width?: number, height?: number }) {
    return (
        <Svg
            width={width}
            height={height}
            viewBox="0 0 20 20"
            fill="none"
        >
            <Path
                d="M13.337 2.083c1.661.095 2.711.362 3.465 1.116.753.753 1.02 1.803 1.115 3.464M6.663 2.083c-1.66.095-2.71.362-3.464 1.116-.754.753-1.021 1.803-1.115 3.464m15.833 6.674c-.095 1.66-.362 2.711-1.115 3.465-.754.753-1.804 1.02-3.465 1.115m-11.253-4.58c.094 1.66.361 2.711 1.115 3.465.753.753 1.803 1.02 3.464 1.115M4.167 10h11.666"
                stroke="#181818"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    )
}

export default Scan
