import * as React from "react"
import Svg, { Path } from "react-native-svg"

function HomeIcon({ width = 20, height = 20 }: { width?: number, height?: number }) {
    return (
        <Svg
            width={width}
            height={height}
            viewBox="0 0 20 20"
            fill="none"
        >
            <Path
                d="M2.5 9.992v2.091c0 2.75 0 4.125.854 4.98.855.854 2.23.854 4.98.854h3.333c2.75 0 4.124 0 4.979-.854.854-.855.854-2.23.854-4.98V9.992c0-1.402 0-2.102-.297-2.708-.296-.607-.85-1.037-1.955-1.897L13.581 4.09c-1.72-1.338-2.58-2.008-3.581-2.008-1 0-1.86.67-3.581 2.008L4.752 5.387c-1.106.86-1.659 1.29-1.955 1.897C2.5 7.89 2.5 8.59 2.5 9.992zM13.333 14.166H6.666"
                stroke="#181818"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    )
}

export default HomeIcon
