"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.tsx
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"));
var import_react_native = require("react-native");
var import_xmldom = require("xmldom");
var import_resolveAssetSource = __toESM(require("react-native/Libraries/Image/resolveAssetSource"));
var import_react_native_svg = __toESM(require("react-native-svg"));

// src/utils.ts
var camelCase = (value) => value.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
var camelCaseNodeName = ({
  nodeName,
  nodeValue
}) => ({ nodeName: camelCase(nodeName), nodeValue });
var removePixelsFromNodeValue = ({
  nodeName,
  nodeValue
}) => ({ nodeName, nodeValue: nodeValue.replace("px", "") });
var transformStyle = ({
  nodeName,
  nodeValue,
  fillProp
}) => {
  if (nodeName === "style") {
    return nodeValue.split(";").reduce((acc, attribute) => {
      const [property, value] = attribute.split(":");
      if (property === "" || value === void 0) return acc;
      return { ...acc, [camelCase(property)]: fillProp && property === "fill" ? fillProp : value };
    }, {});
  }
  return null;
};
var getEnabledAttributes = (enabledAttributes) => ({ nodeName }) => enabledAttributes.includes(camelCase(nodeName));

// src/index.tsx
var ind = 0;
var cacheFetchSVGDataPromise = {};
function SvgUri(props) {
  const { fill, fillAll, svgXmlData: xmlData, source, onLoad, onError, style, width: _width, height: _height, mode = "scaleToFill" } = props;
  const [svgXmlDataConst, setSvgXmlData] = useConstant(xmlData, (v1, v2) => v1 !== v2);
  const sourceValue = typeof source === "number" ? source : source?.uri;
  const notifyLoad = useCommittedEvent(() => onLoad?.());
  const notifyError = useCommittedEvent((error) => {
    console.warn("ERROR SVG:", error);
    onError?.(error);
  });
  const prevXmlDataRef = (0, import_react.useRef)(xmlData);
  if (prevXmlDataRef.current !== xmlData) {
    prevXmlDataRef.current = xmlData;
    setSvgXmlData(xmlData, false);
  }
  const { current: svgXmlData } = svgXmlDataConst;
  (0, import_react.useEffect)(() => {
    if (sourceValue === void 0) return;
    let active = true;
    const load = async () => {
      let responseXML;
      try {
        const resolved = (0, import_resolveAssetSource.default)(
          typeof sourceValue === "string" ? { uri: sourceValue } : sourceValue
        );
        if (!resolved?.uri) throw new Error("Unable to resolve SVG source URI");
        responseXML = await fetchSVGData(resolved.uri);
      } catch (error) {
        if (active) {
          setSvgXmlData(void 0);
          notifyError(toError(error));
        }
        return;
      }
      if (active) {
        setSvgXmlData(responseXML);
        notifyLoad();
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [sourceValue, setSvgXmlData, notifyLoad, notifyError]);
  const flatStyle = import_react_native.StyleSheet.flatten(style) || {};
  const rawWidth = flatStyle.width;
  const width = _width ?? (typeof rawWidth === "number" || typeof rawWidth === "string" ? rawWidth : void 0);
  const rawHeight = flatStyle.height;
  const height = _height ?? (typeof rawHeight === "number" || typeof rawHeight === "string" ? rawHeight : void 0);
  const parsedSVG = (0, import_react.useMemo)(() => {
    if (svgXmlData === void 0) return { root: null, error: null };
    try {
      return { root: parseSVG(svgXmlData), error: null };
    } catch (error) {
      return { root: null, error: toError(error) };
    }
  }, [svgXmlData]);
  const renderedSVG = (0, import_react.useMemo)(() => {
    if (!parsedSVG.root) return { element: null, error: parsedSVG.error };
    try {
      return {
        element: inspectNode(parsedSVG.root, fill, fillAll, width, height, mode),
        error: null
      };
    } catch (error) {
      return { element: null, error: toError(error) };
    }
  }, [parsedSVG, fill, fillAll, width, height, mode]);
  (0, import_react.useEffect)(() => {
    if (renderedSVG.error) notifyError(renderedSVG.error);
  }, [renderedSVG.error, notifyError]);
  return /* @__PURE__ */ import_react.default.createElement(import_react_native.View, { style: [{ justifyContent: "center", alignItems: "center" }, style, { width, height }] }, renderedSVG.element);
}
function toError(error) {
  return error instanceof Error ? error : new Error(String(error));
}
function parseSVG(xml) {
  if (!xml.trimStart().startsWith("<")) {
    throw new Error("Invalid SVG: expected XML markup");
  }
  let parseError;
  const recordError = (message) => {
    parseError ?? (parseError = new Error(message));
  };
  const doc = new import_xmldom.DOMParser({
    errorHandler: {
      warning: (message) => console.warn(message),
      error: recordError,
      fatalError: recordError
    }
  }).parseFromString(xml, "text/xml");
  if (parseError) throw parseError;
  if (!doc?.documentElement || doc.documentElement.nodeName !== "svg") {
    throw new Error("Invalid SVG: expected an svg root element");
  }
  const hasInvalidSibling = Array.from(doc.childNodes).some(
    (node) => node.nodeType === 1 && node !== doc.documentElement || (node.nodeType === 3 || node.nodeType === 4) && Boolean(node.nodeValue?.trim())
  );
  if (hasInvalidSibling) throw new Error("Invalid SVG: unexpected content outside the root element");
  return doc.documentElement;
}
function fetchSVGData(uri) {
  if (!cacheFetchSVGDataPromise[uri]) {
    cacheFetchSVGDataPromise[uri] = (async () => {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Unable to load SVG: HTTP ${response.status} (${uri})`);
      }
      const xml = await response.text();
      parseSVG(xml);
      return xml;
    })().catch((error) => {
      delete cacheFetchSVGDataPromise[uri];
      throw error;
    });
  }
  return cacheFetchSVGDataPromise[uri];
}
function getScale(size, orgSize) {
  const s = Number(size) / Number(orgSize);
  return Number.isNaN(s) ? 1 : s;
}
function trimElementChildren(children) {
  for (const child of children) {
    if (typeof child === "string") {
      if (child.trim().length === 0) children.splice(children.indexOf(child), 1);
    }
  }
}
function getSvgScale(width, height, componentAtts, mode) {
  const scaleWidth = getScale(width, componentAtts.width);
  const scaleHeight = getScale(height, componentAtts.height);
  if (mode === "scaleToFill") {
    return { scaleX: scaleWidth, scaleY: scaleHeight };
  }
  const scale = mode === "aspectFill" ? Math.max(scaleWidth, scaleHeight) : Math.min(scaleWidth, scaleHeight);
  return { scaleX: scale, scaleY: scale };
}
function normalizeTextAttributes(componentAtts) {
  const { fontFamily, fontSize, fontWeight, ...rest } = componentAtts;
  const font = {};
  if (fontFamily) font.fontFamily = fontFamily;
  if (fontSize) font.fontSize = fontSize;
  if (fontWeight) font.fontWeight = fontWeight;
  return Object.keys(font).length > 0 ? { ...rest, font } : rest;
}
function obtainComponentAtts(node, enabledAttributes, fill, fillAll) {
  const styleAtts = {};
  if (fill && fillAll) {
    styleAtts.fill = fill;
  }
  Array.from(node.attributes).forEach(({ nodeName, nodeValue }) => {
    Object.assign(
      styleAtts,
      transformStyle({ nodeName, nodeValue, fillProp: typeof fill === "string" ? fill : void 0 })
    );
  });
  const componentAtts = Array.from(node.attributes).map(camelCaseNodeName).map(removePixelsFromNodeValue).filter(getEnabledAttributes(enabledAttributes.concat(COMMON_ATTS))).reduce((acc, { nodeName, nodeValue }) => {
    let val = nodeValue;
    if (nodeName === "fill") {
      if (fill) {
        if (typeof fill === "string") {
          val = fill;
        } else if (Array.isArray(fill)) {
          const newValue = fill.find((item) => item.color === nodeValue);
          if (newValue) {
            val = newValue.fill;
          }
        }
      }
    }
    acc[nodeName] = val;
    return acc;
  }, {});
  Object.assign(componentAtts, styleAtts);
  return componentAtts;
}
function AddFill(fn, fill, fillAll) {
  return function(node, enabledAttributes) {
    return fn(node, enabledAttributes, fill, fillAll);
  };
}
function createSVGElement(node, children, fill, fillAll, width, height, mode) {
  trimElementChildren(children);
  const _obtainComponentAtts = AddFill(obtainComponentAtts, fill, fillAll);
  let componentAtts = {};
  const i = ind++;
  switch (node.nodeName) {
    case "svg": {
      componentAtts = _obtainComponentAtts(node, SVG_ATTS);
      const { scaleX, scaleY } = getSvgScale(width, height, componentAtts, mode);
      return /* @__PURE__ */ import_react.default.createElement(import_react_native_svg.default, { key: i, ...componentAtts, style: [componentAtts.style, { transform: [{ scaleX }, { scaleY }] }] }, children);
    }
    case "g":
      componentAtts = _obtainComponentAtts(node, G_ATTS);
      return /* @__PURE__ */ import_react.default.createElement(import_react_native_svg.G, { key: i, ...componentAtts }, children);
    case "path":
      componentAtts = _obtainComponentAtts(node, PATH_ATTS);
      return /* @__PURE__ */ import_react.default.createElement(import_react_native_svg.Path, { key: i, ...componentAtts }, children);
    case "circle":
      componentAtts = _obtainComponentAtts(node, CIRCLE_ATTS);
      return /* @__PURE__ */ import_react.default.createElement(import_react_native_svg.Circle, { key: i, ...componentAtts }, children);
    case "rect":
      componentAtts = _obtainComponentAtts(node, RECT_ATTS);
      return /* @__PURE__ */ import_react.default.createElement(import_react_native_svg.Rect, { key: i, ...componentAtts }, children);
    case "line":
      componentAtts = _obtainComponentAtts(node, LINE_ATTS);
      return /* @__PURE__ */ import_react.default.createElement(import_react_native_svg.Line, { key: i, ...componentAtts }, children);
    case "defs":
      return /* @__PURE__ */ import_react.default.createElement(import_react_native_svg.Defs, { key: i }, children);
    case "linearGradient":
      componentAtts = _obtainComponentAtts(node, LINEARG_ATTS);
      return /* @__PURE__ */ import_react.default.createElement(import_react_native_svg.LinearGradient, { key: i, ...componentAtts }, children);
    case "radialGradient":
      componentAtts = _obtainComponentAtts(node, RADIALG_ATTS);
      return /* @__PURE__ */ import_react.default.createElement(import_react_native_svg.RadialGradient, { key: i, ...componentAtts }, children);
    case "stop":
      componentAtts = _obtainComponentAtts(node, STOP_ATTS);
      return /* @__PURE__ */ import_react.default.createElement(import_react_native_svg.Stop, { key: i, ...componentAtts }, children);
    case "ellipse":
      componentAtts = _obtainComponentAtts(node, ELLIPSE_ATTS);
      return /* @__PURE__ */ import_react.default.createElement(import_react_native_svg.Ellipse, { key: i, ...componentAtts }, children);
    case "polygon":
      componentAtts = _obtainComponentAtts(node, POLYGON_ATTS);
      return /* @__PURE__ */ import_react.default.createElement(import_react_native_svg.Polygon, { key: i, ...componentAtts }, children);
    case "polyline":
      componentAtts = _obtainComponentAtts(node, POLYLINE_ATTS);
      return /* @__PURE__ */ import_react.default.createElement(import_react_native_svg.Polyline, { key: i, ...componentAtts }, children);
    case "text":
      componentAtts = normalizeTextAttributes(_obtainComponentAtts(node, TEXT_ATTS));
      return /* @__PURE__ */ import_react.default.createElement(import_react_native_svg.Text, { key: i, ...componentAtts }, children);
    case "tspan":
      componentAtts = normalizeTextAttributes(_obtainComponentAtts(node, TEXT_ATTS));
      return /* @__PURE__ */ import_react.default.createElement(import_react_native_svg.TSpan, { key: i, ...componentAtts }, children);
    default:
      return null;
  }
}
function inspectNode(node, fill, fillAll, width, height, mode) {
  if (!ACCEPTED_SVG_ELEMENTS.includes(node.nodeName)) {
    return null;
  }
  const arrayElements = [];
  if (node.childNodes && node.childNodes.length > 0) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const isTextValue = node.childNodes[i].nodeValue;
      if (isTextValue) {
        (node.nodeName === "text" || node.nodeName === "tspan") && arrayElements.push(node.childNodes[i].nodeValue);
      } else {
        const element = inspectNode(node.childNodes[i], fill, fillAll, width, height, mode);
        if (element != null) {
          arrayElements.push(element);
        }
      }
    }
  }
  return createSVGElement(node, arrayElements, fill, fillAll, width, height, mode);
}
function shallowEqual(prev, next) {
  if (prev === next) return true;
  if (typeof prev !== "object" || prev === null || typeof next !== "object" || next === null)
    return false;
  const keysA = Object.keys(prev);
  const keysB = Object.keys(next);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(next, keysA[i]) || prev[keysA[i]] !== next[keysA[i]])
      return false;
  }
  return true;
}
function useCommittedEvent(callback) {
  const callbackRef = (0, import_react.useRef)(callback);
  (0, import_react.useLayoutEffect)(() => {
    callbackRef.current = callback;
  }, [callback]);
  return (0, import_react.useCallback)((...args) => callbackRef.current(...args), []);
}
function useEvent(callback) {
  const ref = (0, import_react.useRef)(callback);
  ref.current = callback;
  return (0, import_react.useCallback)((...args) => ref.current(...args), [ref]);
}
var useForceUpdate = () => {
  const [, setData] = (0, import_react.useState)(0);
  return (0, import_react.useCallback)(() => {
    setData((d) => d + 1);
  }, []);
};
var useConstant = (defValue, defEqualityFn) => {
  const ref = (0, import_react.useRef)(defValue);
  const forceUpdate = useForceUpdate();
  const constRef = (0, import_react.useMemo)(
    () => Object.freeze({
      get current() {
        return ref.current;
      }
    }),
    []
  );
  const setter = useEvent(
    (v, equalityFn = defEqualityFn) => {
      const oldVal = ref.current;
      ref.current = typeof v === "function" ? v(ref.current) : v;
      if (typeof equalityFn === "function" ? equalityFn(oldVal, ref.current) : equalityFn) {
        forceUpdate();
      }
    }
  );
  return [constRef, setter];
};
var index_default = import_react.default.memo(SvgUri, (prevProps, nextProps) => {
  return prevProps.svgXmlData === nextProps.svgXmlData && shallowEqual(prevProps.style, nextProps.style) && shallowEqual(prevProps.source, nextProps.source) && shallowEqual(prevProps.fill, nextProps.fill) && prevProps.fillAll === nextProps.fillAll && prevProps.mode === nextProps.mode && prevProps.width === nextProps.width && prevProps.height === nextProps.height && prevProps.onLoad === nextProps.onLoad && prevProps.onError === nextProps.onError;
});
var ACCEPTED_SVG_ELEMENTS = [
  "svg",
  "g",
  "circle",
  "path",
  "rect",
  "defs",
  "line",
  "linearGradient",
  "radialGradient",
  "stop",
  "ellipse",
  "polygon",
  "polyline",
  "text",
  "tspan"
];
var SVG_ATTS = ["viewBox", "width", "height"];
var G_ATTS = ["id"];
var CIRCLE_ATTS = ["cx", "cy", "r"];
var PATH_ATTS = ["d"];
var RECT_ATTS = ["width", "height"];
var LINE_ATTS = ["x1", "y1", "x2", "y2"];
var LINEARG_ATTS = LINE_ATTS.concat(["id", "gradientUnits"]);
var RADIALG_ATTS = CIRCLE_ATTS.concat(["id", "gradientUnits"]);
var STOP_ATTS = ["offset", "stopColor"];
var ELLIPSE_ATTS = ["cx", "cy", "rx", "ry"];
var TEXT_ATTS = ["fontFamily", "fontSize", "fontWeight", "textAnchor"];
var POLYGON_ATTS = ["points"];
var POLYLINE_ATTS = ["points"];
var COMMON_ATTS = [
  "fill",
  "fillOpacity",
  "stroke",
  "strokeWidth",
  "strokeOpacity",
  "opacity",
  "strokeLinecap",
  "strokeLinejoin",
  "strokeDasharray",
  "strokeDashoffset",
  "x",
  "y",
  "rotate",
  "scale",
  "origin",
  "originX",
  "originY"
];
