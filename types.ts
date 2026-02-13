export type CompositionData = {
  meta: {
    title: string;
    width: number;
    height: number;
    fps: number;
  };
  scenes: SceneData[];
};

export type SceneData = {
  id: string;
  durationInFrames: number;
  background: BackgroundData;
  elements: ElementData[];
  transition?: TransitionData;
};

export type BackgroundData = {
  type: "solid" | "gradient";
  color?: string;
  colors?: string[];
  direction?: number;
};

export type TransitionData = {
  type: "fade" | "slide" | "wipe" | "flip" | "clockWipe";
  durationInFrames: number;
  direction?: "from-left" | "from-right" | "from-top" | "from-bottom";
};

export type ElementData = TextElementData | ShapeElementData | ImageElementData;

export type BaseElementData = {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  enterAnimation?: AnimationData;
  exitAnimation?: AnimationData;
};

export type TextElementData = BaseElementData & {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: number;
  color: string;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
  maxWidth?: number;
};

export type ShapeElementData = BaseElementData & {
  type: "shape";
  shape: "rectangle" | "circle" | "ellipse" | "line";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  shadow?: string;
};

export type ImageElementData = BaseElementData & {
  type: "image";
  src: string;
  objectFit?: "cover" | "contain" | "fill";
  borderRadius?: number;
};

export type VideoCodeData = {
  meta: {
    title: string;
    width: number;
    height: number;
    fps: number;
    durationInFrames: number;
  };
  code: string;
};

export type AnimationData = {
  type:
    | "fade"
    | "slide"
    | "scale"
    | "spring"
    | "typewriter"
    | "blur"
    | "rotate"
    | "bounce";
  delay?: number;
  durationInFrames?: number;
  direction?: "left" | "right" | "up" | "down";
  springConfig?: {
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
};
