import Lottie from "lottie-react";

const racingLoaderData = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 200,
  h: 200,
  nm: "Racing Loader",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Circle 1",
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [30], e: [100] },
            { t: 15, s: [100], e: [30] },
            { t: 30, s: [30] },
          ],
        },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: 0, s: [70, 100, 0], e: [70, 80, 0] },
            { t: 15, s: [70, 80, 0], e: [70, 100, 0] },
            { t: 30, s: [70, 100, 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 100, 100], e: [120, 120, 100] },
            { t: 15, s: [120, 120, 100], e: [100, 100, 100] },
            { t: 30, s: [100, 100, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: "el",
          d: 1,
          s: { a: 0, k: [16, 16] },
          p: { a: 0, k: [0, 0] },
          nm: "Ellipse",
        },
        {
          ty: "fl",
          c: { a: 0, k: [1, 0.5, 0, 1] },
          o: { a: 0, k: 100 },
          r: 1,
          nm: "Fill",
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: "Circle 2",
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 5, s: [30], e: [100] },
            { t: 20, s: [100], e: [30] },
            { t: 35, s: [30] },
          ],
        },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: 5, s: [100, 100, 0], e: [100, 80, 0] },
            { t: 20, s: [100, 80, 0], e: [100, 100, 0] },
            { t: 35, s: [100, 100, 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 5, s: [100, 100, 100], e: [120, 120, 100] },
            { t: 20, s: [120, 120, 100], e: [100, 100, 100] },
            { t: 35, s: [100, 100, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: "el",
          d: 1,
          s: { a: 0, k: [16, 16] },
          p: { a: 0, k: [0, 0] },
          nm: "Ellipse",
        },
        {
          ty: "fl",
          c: { a: 0, k: [0.7, 0.35, 0.9, 1] },
          o: { a: 0, k: 100 },
          r: 1,
          nm: "Fill",
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
    },
    {
      ddd: 0,
      ind: 3,
      ty: 4,
      nm: "Circle 3",
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 10, s: [30], e: [100] },
            { t: 25, s: [100], e: [30] },
            { t: 40, s: [30] },
          ],
        },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: 10, s: [130, 100, 0], e: [130, 80, 0] },
            { t: 25, s: [130, 80, 0], e: [130, 100, 0] },
            { t: 40, s: [130, 100, 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 10, s: [100, 100, 100], e: [120, 120, 100] },
            { t: 25, s: [120, 120, 100], e: [100, 100, 100] },
            { t: 40, s: [100, 100, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: "el",
          d: 1,
          s: { a: 0, k: [16, 16] },
          p: { a: 0, k: [0, 0] },
          nm: "Ellipse",
        },
        {
          ty: "fl",
          c: { a: 0, k: [1, 0.5, 0, 1] },
          o: { a: 0, k: 100 },
          r: 1,
          nm: "Fill",
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
    },
  ],
};

export function RacingLoader({ className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Lottie
        animationData={racingLoaderData}
        loop
        style={{ width: 80, height: 80 }}
      />
    </div>
  );
}
