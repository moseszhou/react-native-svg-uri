// src/index.tsx
import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { DOMParser } from "xmldom";
import resolveAssetSource from "react-native/Libraries/Image/resolveAssetSource";
import Svg, { Circle, Ellipse, G, LinearGradient, RadialGradient, Line, Path, Polygon, Polyline, Rect, Text, TSpan, Defs, Stop } from "react-native-svg";

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
  const { fill, fillAll, svgXmlData: xmlData, source, onLoad, style, width: _width, height: _height } = props;
  const [svgXmlDataConst, setSvgXmlData] = useConstant(
    xmlData,
    (v1, v2) => v1 !== v2
  );
  const uri = source && typeof source === "object" && "uri" in source ? source.uri : void 0;
  const uriRef = useRef(uri);
  const prevXmlDataRef = useRef(xmlData);
  if (prevXmlDataRef.current !== xmlData) {
    prevXmlDataRef.current = xmlData;
    setSvgXmlData(xmlData, false);
  }
  const { current: svgXmlData } = svgXmlDataConst;
  const fetchSVGData = useEvent(async (fetchUri) => {
    let responseXML = null;
    let error = null;
    try {
      if (!cacheFetchSVGDataPromise[fetchUri]) {
        cacheFetchSVGDataPromise[fetchUri] = fetch(fetchUri).then((r) => r.text());
      }
      responseXML = await cacheFetchSVGDataPromise[fetchUri];
    } catch (e) {
      delete cacheFetchSVGDataPromise[fetchUri];
      error = e;
      console.warn("ERROR SVG fetchSVGData:", fetchUri, e);
    } finally {
      if (uriRef.current === fetchUri) {
        setSvgXmlData(responseXML ?? void 0);
        if (onLoad && !error) {
          onLoad();
        }
      }
    }
    return responseXML;
  });
  useEffect(() => {
    if (typeof source === "number" || source && typeof source === "object" && "uri" in source) {
      const _source = resolveAssetSource(source) || {};
      uriRef.current = _source.uri;
      fetchSVGData(_source.uri);
    }
  }, [source, fetchSVGData]);
  const flatStyle = StyleSheet.flatten(style) || {};
  const rawWidth = flatStyle.width;
  const width = _width ?? (typeof rawWidth === "number" || typeof rawWidth === "string" ? rawWidth : void 0);
  const rawHeight = flatStyle.height;
  const height = _height ?? (typeof rawHeight === "number" || typeof rawHeight === "string" ? rawHeight : void 0);
  const rootSVG = useMemo(() => {
    if (!svgXmlData) {
      return null;
    }
    const inputSVG = svgXmlData.substring(
      svgXmlData.indexOf("<svg "),
      svgXmlData.indexOf("</svg>") + 6
    );
    const doc = new DOMParser().parseFromString(inputSVG, "text/xml");
    return inspectNode(doc.childNodes[0], fill, fillAll, width, height);
  }, [svgXmlData, fill, fillAll, width, height]);
  return /* @__PURE__ */ React.createElement(View, { style: [{ justifyContent: "center", alignItems: "center" }, style, { width, height }] }, rootSVG);
}
function fixYPosition(y, node) {
  if (node.attributes) {
    const fontSizeAttr = Object.keys(node.attributes).find(
      (a) => node.attributes[a].name === "font-size"
    );
    if (fontSizeAttr) {
      return String(parseFloat(y) - parseFloat(node.attributes[fontSizeAttr].value));
    }
  }
  if (!node.parentNode) {
    return y;
  }
  return fixYPosition(y, node.parentNode);
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
function getSvgScale(width, height, componentAtts) {
  const scaleWidth = getScale(width, componentAtts.width);
  const scaleHeight = getScale(height, componentAtts.height);
  return Math.min(scaleWidth, scaleHeight);
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
function createSVGElement(node, children, fill, fillAll, width, height) {
  trimElementChildren(children);
  const _obtainComponentAtts = AddFill(obtainComponentAtts, fill, fillAll);
  let componentAtts = {};
  const i = ind++;
  switch (node.nodeName) {
    case "svg": {
      componentAtts = _obtainComponentAtts(node, SVG_ATTS);
      const scale = getSvgScale(width, height, componentAtts);
      return /* @__PURE__ */ React.createElement(Svg, { key: i, ...componentAtts, style: [componentAtts.style, { transform: [{ scale }] }] }, children);
    }
    case "g":
      componentAtts = _obtainComponentAtts(node, G_ATTS);
      return /* @__PURE__ */ React.createElement(G, { key: i, ...componentAtts }, children);
    case "path":
      componentAtts = _obtainComponentAtts(node, PATH_ATTS);
      return /* @__PURE__ */ React.createElement(Path, { key: i, ...componentAtts }, children);
    case "circle":
      componentAtts = _obtainComponentAtts(node, CIRCLE_ATTS);
      return /* @__PURE__ */ React.createElement(Circle, { key: i, ...componentAtts }, children);
    case "rect":
      componentAtts = _obtainComponentAtts(node, RECT_ATTS);
      return /* @__PURE__ */ React.createElement(Rect, { key: i, ...componentAtts }, children);
    case "line":
      componentAtts = _obtainComponentAtts(node, LINE_ATTS);
      return /* @__PURE__ */ React.createElement(Line, { key: i, ...componentAtts }, children);
    case "defs":
      return /* @__PURE__ */ React.createElement(Defs, { key: i }, children);
    case "linearGradient":
      componentAtts = _obtainComponentAtts(node, LINEARG_ATTS);
      return /* @__PURE__ */ React.createElement(LinearGradient, { key: i, ...componentAtts }, children);
    case "radialGradient":
      componentAtts = _obtainComponentAtts(node, RADIALG_ATTS);
      return /* @__PURE__ */ React.createElement(RadialGradient, { key: i, ...componentAtts }, children);
    case "stop":
      componentAtts = _obtainComponentAtts(node, STOP_ATTS);
      return /* @__PURE__ */ React.createElement(Stop, { key: i, ...componentAtts }, children);
    case "ellipse":
      componentAtts = _obtainComponentAtts(node, ELLIPSE_ATTS);
      return /* @__PURE__ */ React.createElement(Ellipse, { key: i, ...componentAtts }, children);
    case "polygon":
      componentAtts = _obtainComponentAtts(node, POLYGON_ATTS);
      return /* @__PURE__ */ React.createElement(Polygon, { key: i, ...componentAtts }, children);
    case "polyline":
      componentAtts = _obtainComponentAtts(node, POLYLINE_ATTS);
      return /* @__PURE__ */ React.createElement(Polyline, { key: i, ...componentAtts }, children);
    case "text":
      componentAtts = _obtainComponentAtts(node, TEXT_ATTS);
      if (componentAtts.y) {
        componentAtts.y = fixYPosition(componentAtts.y, node);
      }
      return /* @__PURE__ */ React.createElement(Text, { key: i, ...componentAtts }, children);
    case "tspan":
      componentAtts = _obtainComponentAtts(node, TEXT_ATTS);
      if (componentAtts.y) {
        componentAtts.y = fixYPosition(componentAtts.y, node);
      }
      return /* @__PURE__ */ React.createElement(TSpan, { key: i, ...componentAtts }, children);
    default:
      return null;
  }
}
function inspectNode(node, fill, fillAll, width, height) {
  if (!ACCEPTED_SVG_ELEMENTS.includes(node.nodeName)) {
    return null;
  }
  const arrayElements = [];
  if (node.childNodes && node.childNodes.length > 0) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const isTextValue = node.childNodes[i].nodeValue;
      if (isTextValue) {
        node.nodeName === "text" && arrayElements.push(node.childNodes[i].nodeValue);
      } else {
        const element = inspectNode(node.childNodes[i], fill, fillAll, width, height);
        if (element != null) {
          arrayElements.push(element);
        }
      }
    }
  }
  return createSVGElement(node, arrayElements, fill, fillAll, width, height);
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
function useEvent(callback) {
  const ref = useRef(callback);
  ref.current = callback;
  return useCallback((...args) => ref.current(...args), [ref]);
}
var useForceUpdate = () => {
  const [, setData] = useState(0);
  return useCallback(() => {
    setData((d) => d + 1);
  }, []);
};
var useConstant = (defValue, defEqualityFn) => {
  const ref = useRef(defValue);
  const forceUpdate = useForceUpdate();
  const constRef = useMemo(
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
var index_default = React.memo(SvgUri, (prevProps, nextProps) => {
  return prevProps.svgXmlData === nextProps.svgXmlData && shallowEqual(prevProps.style, nextProps.style) && shallowEqual(prevProps.source, nextProps.source) && shallowEqual(prevProps.fill, nextProps.fill) && prevProps.fillAll === nextProps.fillAll;
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
var STOP_ATTS = ["offset"];
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
export {
  index_default as default
};
