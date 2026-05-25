import * as React from "react"
import Svg, { Path } from "react-native-svg"

function QuoteIcon({ width = 32, height = 32, color = "#181818" }: { width?: number, height?: number, color?: string }) {
    return (
        <Svg
            width={width}
            height={height}
            viewBox="0 0 32 32"
            fill="none"
        >
            <Path
                d="M19.974 9.354s.667.667 1.334 2c0 0 2.117-3.333 4-4M13.326 2.695c-3.331-.14-5.905.243-5.905.243-1.625.116-4.74 1.027-4.74 6.348 0 5.276-.034 11.78 0 14.373 0 1.584.982 5.279 4.377 5.477 4.126.24 11.559.292 14.97 0 .912-.052 3.951-.768 4.336-4.075.399-3.426.32-5.807.32-6.373"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <Path
                d="M29.333 9.354a6.67 6.67 0 01-6.673 6.667 6.67 6.67 0 01-6.673-6.667 6.67 6.67 0 016.673-6.666 6.67 6.67 0 016.673 6.666zM9.308 17.354h5.333M9.308 22.688h10.666"
                stroke="#181818"
                strokeWidth={2}
                strokeLinecap="round"
            />
        </Svg>
    )
}

export default QuoteIcon
