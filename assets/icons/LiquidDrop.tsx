import * as React from "react"
import Svg, { Path } from "react-native-svg"

function LiquidDrop({ width = 18, height = 18 }: { width?: number, height?: number }) {
    return (
        <Svg
            width={width}
            height={height}
            viewBox="0 0 18 18"
            fill="none"
        >
            <Path
                d="M14.625 10.758a5.625 5.625 0 11-11.25 0 9.724 9.724 0 012.18-5.625c.197-.267.4-.52.604-.76A18.985 18.985 0 019 1.617s5.625 4.219 5.625 9.14z"
                fill="#3B82F6"
                stroke="#3B82F6"
                strokeWidth={1.5}
                strokeMiterlimit={10}
            />
            <Path
                d="M11.813 10.758c0 1.94-.872 3.515-2.813 3.515M11.813 8.648v1.407"
                stroke="#fff"
                strokeWidth={1.5}
                strokeMiterlimit={10}
            />
        </Svg>
    )
}

export default LiquidDrop
