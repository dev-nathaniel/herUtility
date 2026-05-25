import Svg, { Path } from "react-native-svg"

function Plus({ width = 20, height = 20, color = "#F7F7F7" }: { width?: number, height?: number, color?: string }) {
    return (
        <Svg
            width={width}
            height={height}
            viewBox="0 0 20 20"
            fill="none"
        >
            <Path
                d="M10.001 4.167v11.668M15.835 10.002H4.167"
                stroke={color}
                strokeWidth={1.25}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    )
}

export default Plus
