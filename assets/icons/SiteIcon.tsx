import * as React from "react"
import Svg, { Path } from "react-native-svg"

function SiteIcon({ width = 20, height = 20 }: { width?: number, height?: number }) {
    return (
        <Svg
            width={width}
            height={height}
            viewBox="0 0 20 20"
            fill="none"
        >
            <Path
                d="M12.5 1.667h-5c-2.758 0-3.333.575-3.333 3.333v13.333h11.666V5c0-2.758-.575-3.333-3.333-3.333z"
                stroke="#181818"
                strokeWidth={1.5}
                strokeLinejoin="round"
            />
            <Path
                d="M2.5 18.334h15"
                stroke="#181818"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Path
                d="M12.5 18.333v-2.5c0-1.379-.288-1.667-1.667-1.667H9.167c-1.38 0-1.667.288-1.667 1.667v2.5"
                stroke="#181818"
                strokeWidth={1.5}
                strokeLinejoin="round"
            />
            <Path
                d="M11.25 5h-2.5m2.5 2.917h-2.5m2.5 2.916h-2.5"
                stroke="#181818"
                strokeWidth={1.5}
                strokeLinecap="round"
            />
        </Svg>
    )
}

export default SiteIcon
