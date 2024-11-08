import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import xmldom from 'xmldom';
import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';

import Svg, {
  Circle,
  Ellipse,
  G,
  LinearGradient,
  RadialGradient,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  Text,
  TSpan,
  Defs,
  Stop
} from 'react-native-svg';

import * as utils from './utils';

let ind = 0;

function SvgUri(props) {
  const { fill, fillAll, svgXmlData: xmlData, source, onLoad, style, width: _width, height: _height } = props;
  const [svgXmlDataConst, setSvgXmlData] = useConstant(xmlData, (v1, v2) => v1 !== v2);
  const uri = source && source.uri;
  const uriRef = useRef(uri);

  useMemo(() => {
    setSvgXmlData(xmlData, false);
  }, [xmlData, setSvgXmlData]);

  const { current: svgXmlData } = svgXmlDataConst;

  // eslint-disable-next-line no-shadow
  const fetchSVGData = useEvent(async (uri) => {
    let responseXML = null;
    let error = null;
    try {
      const response = await fetch(uri);
      responseXML = await response.text();
    } catch (e) {
      error = e;
      console.warn('ERROR SVG fetchSVGData:', uri, e);
    } finally {
      // 如果请求资源已经改变，则不忽略此次请求的返回值
      if (uriRef.current === uri) {
        setSvgXmlData(responseXML);
        if (onLoad && !error) {
          onLoad();
        }
      }
    }

    return responseXML;
  });

  useEffect(() => {
    if (typeof source === 'number' || (source && source.uri)) {
      const _source = resolveAssetSource(source) || {};
      uriRef.current = _source.uri;
      fetchSVGData(_source.uri);
    }
  }, [source, fetchSVGData]);

  const width = _width || style.width;
  const height = _height || style.height;

  const rootSVG = useMemo(() => {
    if (!svgXmlData) {
      return null;
    }
    const inputSVG = svgXmlData.substring(svgXmlData.indexOf('<svg '), svgXmlData.indexOf('</svg>') + 6);
    const doc = new xmldom.DOMParser().parseFromString(inputSVG);
    return inspectNode(doc.childNodes[0], fill, fillAll, width, height);
  }, [svgXmlData, fill, fillAll, width, height]);

  if (svgXmlData == null || svgXmlData === undefined) {
    return null;
  }

  return <View style={[{ justifyContent: 'center', alignItems: 'center' }, style, { width, height }]}>{rootSVG}</View>;
}

function fixYPosition(y, node) {
  if (node.attributes) {
    const fontSizeAttr = Object.keys(node.attributes).find((a) => node.attributes[a].name === 'font-size');
    if (fontSizeAttr) {
      return parseFloat(y) - parseFloat(node.attributes[fontSizeAttr].value);
    }
  }
  if (!node.parentNode) {
    return y;
  }
  return fixYPosition(y, node.parentNode);
}

/**
 *
 * @param {number} size
 * @param {number} orgSize
 */
function getScale(size, orgSize) {
  const s = size / orgSize;
  return Number.isNaN(s) ? 1 : s;
}
// Remove empty strings from children array
function trimElementChildren(children) {
  // eslint-disable-next-line no-restricted-syntax
  for (const child of children) {
    if (typeof child === 'string') {
      if (child.trim().length === 0) children.splice(children.indexOf(child), 1);
    }
  }
}

/**
 * 获取Svg缩放大小
 * @param {{ width: number, height: number }} componentAtts
 */
function getSvgScale(width, height, componentAtts) {
  const scaleWidth = getScale(width, componentAtts.width);
  const scaleHeight = getScale(height, componentAtts.height);

  return Math.min(scaleWidth, scaleHeight);
}

function obtainComponentAtts({ attributes }, enabledAttributes, fill, fillAll) {
  const styleAtts = {};

  if (fill && fillAll) {
    styleAtts.fill = fill;
  }

  Array.from(attributes).forEach(({ nodeName, nodeValue }) => {
    Object.assign(
      styleAtts,
      utils.transformStyle({
        nodeName,
        nodeValue,
        fillProp: fill
      })
    );
  });

  const componentAtts = Array.from(attributes)
    .map(utils.camelCaseNodeName)
    .map(utils.removePixelsFromNodeValue)
    .filter(utils.getEnabledAttributes(enabledAttributes.concat(COMMON_ATTS)))
    .reduce((acc, { nodeName, nodeValue }) => {
      if (nodeName === 'fill') {
        if (fill) {
          if (typeof fill === 'string') {
            nodeValue = fill;
          } else if (Array.isArray(fill)) {
            const newValue = fill.find((item) => item.color === nodeValue);
            if (newValue) {
              nodeValue = newValue.fill;
            }
          }
        }
      }
      acc[nodeName] = nodeValue;
      return acc;
    }, {});
  Object.assign(componentAtts, styleAtts);

  return componentAtts;
}

function AddFill(fn, fill, fillAll) {
  return function (node, enabledAttributes) {
    return fn(node, enabledAttributes, fill, fillAll);
  };
}
function createSVGElement(node, children, fill, fillAll, width, height) {
  trimElementChildren(children);
  const _obtainComponentAtts = AddFill(obtainComponentAtts, fill, fillAll);
  let componentAtts = {};
  const i = ind++;
  switch (node.nodeName) {
    case 'svg': {
      componentAtts = _obtainComponentAtts(node, SVG_ATTS);
      const scale = getSvgScale(width, height, componentAtts);
      return (
        <Svg key={i} {...componentAtts} style={[componentAtts.style, { transform: [{ scale }] }]}>
          {children}
        </Svg>
      );
    }
    case 'g':
      componentAtts = _obtainComponentAtts(node, G_ATTS);
      return (
        <G key={i} {...componentAtts}>
          {children}
        </G>
      );
    case 'path':
      componentAtts = _obtainComponentAtts(node, PATH_ATTS);
      return (
        <Path key={i} {...componentAtts}>
          {children}
        </Path>
      );
    case 'circle':
      componentAtts = _obtainComponentAtts(node, CIRCLE_ATTS);
      return (
        <Circle key={i} {...componentAtts}>
          {children}
        </Circle>
      );
    case 'rect':
      componentAtts = _obtainComponentAtts(node, RECT_ATTS);
      return (
        <Rect key={i} {...componentAtts}>
          {children}
        </Rect>
      );
    case 'line':
      componentAtts = _obtainComponentAtts(node, LINE_ATTS);
      return (
        <Line key={i} {...componentAtts}>
          {children}
        </Line>
      );
    case 'defs':
      return <Defs key={i}>{children}</Defs>;
    case 'linearGradient':
      componentAtts = _obtainComponentAtts(node, LINEARG_ATTS);
      return (
        <LinearGradient key={i} {...componentAtts}>
          {children}
        </LinearGradient>
      );
    case 'radialGradient':
      componentAtts = _obtainComponentAtts(node, RADIALG_ATTS);
      return (
        <RadialGradient key={i} {...componentAtts}>
          {children}
        </RadialGradient>
      );
    case 'stop':
      componentAtts = _obtainComponentAtts(node, STOP_ATTS);
      return (
        <Stop key={i} {...componentAtts}>
          {children}
        </Stop>
      );
    case 'ellipse':
      componentAtts = _obtainComponentAtts(node, ELLIPSE_ATTS);
      return (
        <Ellipse key={i} {...componentAtts}>
          {children}
        </Ellipse>
      );
    case 'polygon':
      componentAtts = _obtainComponentAtts(node, POLYGON_ATTS);
      return (
        <Polygon key={i} {...componentAtts}>
          {children}
        </Polygon>
      );
    case 'polyline':
      componentAtts = _obtainComponentAtts(node, POLYLINE_ATTS);
      return (
        <Polyline key={i} {...componentAtts}>
          {children}
        </Polyline>
      );
    case 'text':
      componentAtts = _obtainComponentAtts(node, TEXT_ATTS);
      if (componentAtts.y) {
        componentAtts.y = fixYPosition(componentAtts.y, node);
      }
      return (
        <Text key={i} {...componentAtts}>
          {children}
        </Text>
      );
    case 'tspan':
      componentAtts = _obtainComponentAtts(node, TEXT_ATTS);
      if (componentAtts.y) {
        componentAtts.y = fixYPosition(componentAtts.y, node);
      }
      return (
        <TSpan key={i} {...componentAtts}>
          {children}
        </TSpan>
      );
    default:
      return null;
  }
}

function inspectNode(node, fill, fillAll, width, height) {
  // Only process accepted elements
  if (!ACCEPTED_SVG_ELEMENTS.includes(node.nodeName)) {
    return null;
  }

  // Process the xml node
  const arrayElements = [];

  // if have children process them.
  // Recursive function.
  if (node.childNodes && node.childNodes.length > 0) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const isTextValue = node.childNodes[i].nodeValue;
      if (isTextValue) {
        // 解决svg文件中存在格式化的空格问题和换行问题
        node.nodeName === 'text' && arrayElements.push(node.childNodes[i].nodeValue);
      } else {
        const nodo = inspectNode(node.childNodes[i], fill, fillAll, width, height);
        if (nodo != null) {
          arrayElements.push(nodo);
        }
      }
    }
  }

  return createSVGElement(node, arrayElements, fill, fillAll, width, height);
}

// 对象浅比较函数，用于React.memo
function shallowEqual(prev, next) {
  if (prev === next) return true;
  if (typeof prev !== 'object' || prev === null || typeof next !== 'object' || next === null) return false;
  const keysA = Object.keys(prev);
  const keysB = Object.keys(next);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(next, keysA[i]) || prev[keysA[i]] !== next[keysA[i]]) return false;
  }
  return true;
}
function useEvent(callback) {
  const ref = useRef();
  ref.current = callback;
  return useCallback((...args) => ref.current(...args), [ref]);
}

const useForceUpdate = () => {
  const [, setData] = useState(0);

  return useCallback(() => {
    setData((d) => d + 1);
  }, []);
};

const useConstant = (defValue, defEqualityFn) => {
  const ref = useRef(defValue);
  const forceUpdate = useForceUpdate();
  return [
    useMemo(
      () =>
        Object.freeze({
          get current() {
            return ref.current;
          },
          set current(val) {
            throw new Error('禁止直接赋值, 请使用Set方法');
          }
        }),
      []
    ),
    useEvent((v, equalityFn = defEqualityFn) => {
      const oldVal = ref.current;
      ref.current = typeof v === 'function' ? v(ref.current) : v;

      // 追加函数支持
      if (typeof equalityFn === 'function' ? equalityFn(oldVal, ref.current) : equalityFn) {
        forceUpdate();
      }
    })
  ];
};

export default React.memo(SvgUri, (prevProps, nextProps) => {
  return (
    prevProps.svgXmlData === nextProps.svgXmlData &&
    shallowEqual(prevProps.style, nextProps.style) &&
    shallowEqual(prevProps.source, nextProps.source) &&
    shallowEqual(prevProps.fill, nextProps.fill) &&
    prevProps.fillAll === nextProps.fillAll
  );
});

const ACCEPTED_SVG_ELEMENTS = [
  'svg',
  'g',
  'circle',
  'path',
  'rect',
  'defs',
  'line',
  'linearGradient',
  'radialGradient',
  'stop',
  'ellipse',
  'polygon',
  'polyline',
  'text',
  'tspan'
];

// Attributes from SVG elements that are mapped directly.
const SVG_ATTS = ['viewBox', 'width', 'height'];
const G_ATTS = ['id'];

const CIRCLE_ATTS = ['cx', 'cy', 'r'];
const PATH_ATTS = ['d'];
const RECT_ATTS = ['width', 'height'];
const LINE_ATTS = ['x1', 'y1', 'x2', 'y2'];
const LINEARG_ATTS = LINE_ATTS.concat(['id', 'gradientUnits']);
const RADIALG_ATTS = CIRCLE_ATTS.concat(['id', 'gradientUnits']);
const STOP_ATTS = ['offset'];
const ELLIPSE_ATTS = ['cx', 'cy', 'rx', 'ry'];

const TEXT_ATTS = ['fontFamily', 'fontSize', 'fontWeight', 'textAnchor'];

const POLYGON_ATTS = ['points'];
const POLYLINE_ATTS = ['points'];

const COMMON_ATTS = [
  'fill',
  'fillOpacity',
  'stroke',
  'strokeWidth',
  'strokeOpacity',
  'opacity',
  'strokeLinecap',
  'strokeLinejoin',
  'strokeDasharray',
  'strokeDashoffset',
  'x',
  'y',
  'rotate',
  'scale',
  'origin',
  'originX',
  'originY'
];
