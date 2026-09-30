import type { GestureId } from "../vision/types";
export function GesturePreview({
  id = "RASENGAN",
  hero = false,
}: {
  id?: GestureId;
  hero?: boolean;
}) {
  const arms: Record<GestureId, string> = {
    RASENGAN: "M 97 116 L 80 169 L 78 220 M 203 116 L 223 169 L 196 148",
    CHIDORI: "M 97 116 L 77 169 L 104 148 M 203 116 L 220 169 L 222 220",
    KATON: "M 97 116 L 85 170 L 140 157 M 203 116 L 215 170 L 160 157",
    SHADOW_CLONE: "M 97 116 L 72 167 L 76 122 M 203 116 L 228 167 L 224 122",
  };
  const wrists: Record<GestureId, number[][]> = {
    RASENGAN: [
      [78, 220],
      [196, 148],
    ],
    CHIDORI: [
      [104, 148],
      [222, 220],
    ],
    KATON: [
      [140, 157],
      [160, 157],
    ],
    SHADOW_CLONE: [
      [76, 122],
      [224, 122],
    ],
  };
  return (
    <svg
      className={`gesture-preview ${hero ? "hero-figure" : ""}`}
      viewBox="0 0 300 320"
      role="img"
      aria-label={`${id.replace("_", " ")} gesture reference illustration`}
    >
      <defs>
        <linearGradient
          id={`body-${hero ? "hero" : id}`}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop stopColor="#4b4a45" />
          <stop offset="1" stopColor="#171817" />
        </linearGradient>
      </defs>
      <path
        d="M 133 87 L 129 105 Q 108 106 97 116 L 110 198 L 105 230 L 123 307 L 140 307 L 150 243 L 160 307 L 177 307 L 195 230 L 190 198 L 203 116 Q 189 106 171 105 L 167 87"
        fill={`url(#body-${hero ? "hero" : id})`}
        stroke="#72736b"
        strokeWidth=".8"
      />
      <path
        d="M 130 54 Q 130 34 150 33 Q 171 34 171 54 L 168 78 Q 151 103 133 78 Z"
        fill="#30312d"
        stroke="#8a8a7e"
        strokeWidth=".8"
      />
      <path
        d="M132 62 169 62 M138 79 163 79 M150 106 150 209 M111 139 189 139 M110 198 190 198"
        fill="none"
        stroke="#77786e"
        strokeWidth=".6"
        opacity=".6"
      />
      <path
        d={arms[id]}
        stroke="#3e403a"
        strokeWidth="19"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M97 116 203 116 190 219 110 219Z"
        fill="none"
        stroke="currentColor"
        opacity=".35"
        strokeWidth="1"
      />
      <path
        d={arms[id]}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {[[97, 116], [203, 116], [110, 219], [190, 219], ...wrists[id]].map(
        ([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={i > 3 ? 5 : 3} fill="currentColor" />
            <circle
              cx={x}
              cy={y}
              r={i > 3 ? 10 : 6}
              fill="none"
              stroke="currentColor"
              opacity=".25"
            />
          </g>
        ),
      )}
      {id === "RASENGAN" && (
        <g className="preview-orb" transform="translate(46 -13)">
          <circle cx="150" cy="161" r="18" fill="currentColor" opacity=".08" />
          <circle
            cx="150"
            cy="161"
            r="15"
            fill="none"
            stroke="currentColor"
            strokeDasharray="2 3"
          />
          <ellipse
            cx="150"
            cy="161"
            rx="8"
            ry="16"
            fill="none"
            stroke="currentColor"
            opacity=".5"
          />
        </g>
      )}
      <path
        d="M135 21H119V37 M181 37V21H165 M80 287V303H96 M204 303H220V287"
        fill="none"
        stroke="currentColor"
        opacity=".4"
      />
    </svg>
  );
}
