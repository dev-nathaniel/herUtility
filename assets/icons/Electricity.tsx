import * as React from "react"
import Svg, { Path } from "react-native-svg"

function Electricity({ width = 18, height = 18 }: { width?: number, height?: number }) {
    return (
        <Svg
            width={width}
            height={height}
            viewBox="0 0 18 18"
            fill="none"
        >
            <Path
                d="M6.391 1.765h7.18l-3.263 5.224h2.608l-7.179 7.84 1.301-5.225H4.43l1.961-7.84z"
                fill="#EAB308"
                stroke="#EAB308"
                strokeWidth={1.5}
                strokeMiterlimit={10}
            />
        </Svg>
    )
}

export default Electricity
