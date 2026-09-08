import React, { useState, useRef, useMemo, useEffect, useLayoutEffect, useCallback } from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { DOMParser } from 'xmldom';
// @ts-ignore
import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';

// @ts-ignore
// prettier-ignore
import Svg, { Circle, Ellipse, G, LinearGradient, RadialGradient, Line, Path, Polygon, Polyline, Rect, Text, TSpan, Defs, Stop } from 'react-native-svg';

import * as utils from './utils';

/** 将指定的 SVG 原始填充色映射为新颜色。 */
export type FillItem = {
  /** SVG 中的原始颜色。 */
  color: string;
  /** 替换后的颜色。 */
  fill: string;
};

/** SVG 图片的输入、显示参数及加载事件。 */
export interface SvgUriProps {
  /** 显示宽度；数字使用 React Native 布局单位，字符串可使用百分比。 */
  width?: number | string;
  /** 显示高度；数字使用 React Native 布局单位，字符串可使用百分比。 */
  height?: number | string;
  /** SVG 缩放模式，默认 scaleToFill。 */
  mode?: 'aspectFit' | 'aspectFill' | 'scaleToFill';
  /** 远程 URI 或 require 返回的静态资源编号。 */
  source?: { uri: string } | number;
  /** 直接渲染的 SVG XML 内容。 */
  svgXmlData?: string;
  /** 统一填充色或原始颜色映射。 */
  fill?: string | FillItem[];
  /**
   * source 资源获取并通过 XML 校验后调用，不代表原生绘制完成。
   * @returns 无返回值。
   */
  onLoad?: () => void;
  /**
   * 当前资源加载、XML 解析或节点转换失败时调用。
   * @param error 标准化后的错误对象。
   * @returns 无返回值。
   */
  onError?: (error: Error) => void;
  /** 是否对整棵 SVG 树应用填充色。 */
  fillAll?: boolean;
  /** 外层容器样式。 */
  style?: StyleProp<ViewStyle>;
}

let ind = 0;
const cacheFetchSVGDataPromise: Record<string, Promise<string>> = {};

/**
 * 将 SVG 资源或 XML 字符串转换为 React Native SVG 元素。
 * @param props 输入资源、显示参数和事件回调。
 * @returns SVG 外层容器。
 */
function SvgUri(props: SvgUriProps) {
  const { fill, fillAll, svgXmlData: xmlData, source, onLoad, onError, style, width: _width, height: _height, mode = 'scaleToFill' } = props;
  const [svgXmlDataConst, setSvgXmlData] = useConstant<string | undefined>(xmlData, (v1, v2) => v1 !== v2);
  const sourceValue = typeof source === 'number' ? source : source?.uri;
  const notifyLoad = useCommittedEvent(() => onLoad?.());
  const notifyError = useCommittedEvent((error: Error) => {
    console.warn('ERROR SVG:', error);
    onError?.(error);
  });

  const prevXmlDataRef = useRef(xmlData);
  if (prevXmlDataRef.current !== xmlData) {
    prevXmlDataRef.current = xmlData;
    setSvgXmlData(xmlData, false);
  }

  const { current: svgXmlData } = svgXmlDataConst;

  useEffect(() => {
    if (sourceValue === undefined) return;
    let active = true;

    const load = async () => {
      let responseXML: string;
      try {
        const resolved: { uri?: string } | null = resolveAssetSource(
          typeof sourceValue === 'string' ? { uri: sourceValue } : sourceValue
        );
        if (!resolved?.uri) throw new Error('Unable to resolve SVG source URI');
        responseXML = await fetchSVGData(resolved.uri);
      } catch (error: unknown) {
        if (active) {
          setSvgXmlData(undefined);
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

  const flatStyle = StyleSheet.flatten(style) || {};
  const rawWidth = flatStyle.width;
  const width = _width ?? (typeof rawWidth === 'number' || typeof rawWidth === 'string' ? rawWidth : undefined);
  const rawHeight = flatStyle.height;
  const height = _height ?? (typeof rawHeight === 'number' || typeof rawHeight === 'string' ? rawHeight : undefined);

  const parsedSVG = useMemo(() => {
    if (svgXmlData === undefined) return { root: null, error: null };
    try {
      return { root: parseSVG(svgXmlData), error: null };
    } catch (error: unknown) {
      return { root: null, error: toError(error) };
    }
  }, [svgXmlData]);

  const renderedSVG = useMemo(() => {
    if (!parsedSVG.root) return { element: null, error: parsedSVG.error };
    try {
      return {
        element: inspectNode(parsedSVG.root, fill, fillAll, width, height, mode),
        error: null,
      };
    } catch (error: unknown) {
      return { element: null, error: toError(error) };
    }
  }, [parsedSVG, fill, fillAll, width, height, mode]);

  useEffect(() => {
    if (renderedSVG.error) notifyError(renderedSVG.error);
  }, [renderedSVG.error, notifyError]);

  return (
    <View style={[{ justifyContent: 'center', alignItems: 'center' }, style, { width: width as any, height: height as any }]}>
      {renderedSVG.element}
    </View>
  );
}

/**
 * 将异常值转换为统一的 Error，保留已有 Error 对象。
 * @param error 捕获的异常值。
 * @returns 标准错误对象。
 */
function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * 解析完整 XML 并验证 SVG 根节点，保留仅产生 warning 的容错结果。
 * @param xml SVG XML 字符串。
 * @returns SVG 根元素。
 */
function parseSVG(xml: string): Element {
  if (!xml.trimStart().startsWith('<')) {
    throw new Error('Invalid SVG: expected XML markup');
  }
  let parseError: Error | undefined;
  const recordError = (message: string) => {
    parseError ??= new Error(message);
  };
  const doc = new DOMParser({
    errorHandler: {
      warning: (message: string) => console.warn(message),
      error: recordError,
      fatalError: recordError,
    },
  }).parseFromString(xml, 'text/xml');
  if (parseError) throw parseError;
  if (!doc?.documentElement || doc.documentElement.nodeName !== 'svg') {
    throw new Error('Invalid SVG: expected an svg root element');
  }
  const hasInvalidSibling = Array.from(doc.childNodes).some(
    (node) =>
      (node.nodeType === 1 && node !== doc.documentElement) ||
      ((node.nodeType === 3 || node.nodeType === 4) && Boolean(node.nodeValue?.trim()))
  );
  if (hasInvalidSibling) throw new Error('Invalid SVG: unexpected content outside the root element');
  return doc.documentElement;
}

/**
 * 复用同 URI 的请求，只缓存获取并通过 XML 校验的内容。
 * @param uri SVG 资源 URI。
 * @returns 经校验的 SVG XML 内容。
 */
function fetchSVGData(uri: string): Promise<string> {
  if (!cacheFetchSVGDataPromise[uri]) {
    cacheFetchSVGDataPromise[uri] = (async () => {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Unable to load SVG: HTTP ${response.status} (${uri})`);
      }
      const xml = await response.text();
      parseSVG(xml);
      return xml;
    })().catch((error: unknown) => {
      delete cacheFetchSVGDataPromise[uri];
      throw error;
    });
  }
  return cacheFetchSVGDataPromise[uri];
}

function getScale(size: number | string | undefined, orgSize: number | string | undefined): number {
  const s = Number(size) / Number(orgSize);
  return Number.isNaN(s) ? 1 : s;
}

function trimElementChildren(children: any[]): void {
  for (const child of children) {
    if (typeof child === 'string') {
      if (child.trim().length === 0) children.splice(children.indexOf(child), 1);
    }
  }
}

function getSvgScale(
  width: number | string | undefined,
  height: number | string | undefined,
  componentAtts: Record<string, any>,
  mode: SvgUriProps['mode']
): { scaleX: number; scaleY: number } {
  const scaleWidth = getScale(width, componentAtts.width);
  const scaleHeight = getScale(height, componentAtts.height);
  if (mode === 'scaleToFill') {
    return { scaleX: scaleWidth, scaleY: scaleHeight };
  }
  const scale = mode === 'aspectFill' ? Math.max(scaleWidth, scaleHeight) : Math.min(scaleWidth, scaleHeight);
  return { scaleX: scale, scaleY: scale };
}

function normalizeTextAttributes(componentAtts: Record<string, any>): Record<string, any> {
  const { fontFamily, fontSize, fontWeight, ...rest } = componentAtts;
  const font: Record<string, string> = {};
  if (fontFamily) font.fontFamily = fontFamily;
  if (fontSize) font.fontSize = fontSize;
  if (fontWeight) font.fontWeight = fontWeight;
  return Object.keys(font).length > 0 ? { ...rest, font } : rest;
}

function obtainComponentAtts(
  node: any,
  enabledAttributes: string[],
  fill: SvgUriProps['fill'],
  fillAll: boolean | undefined
): Record<string, any> {
  const styleAtts: Record<string, any> = {};

  if (fill && fillAll) {
    styleAtts.fill = fill;
  }

  Array.from<any>(node.attributes).forEach(({ nodeName, nodeValue }: any) => {
    Object.assign(
      styleAtts,
      utils.transformStyle({ nodeName, nodeValue, fillProp: typeof fill === 'string' ? fill : undefined })
    );
  });

  const componentAtts = Array.from<any>(node.attributes)
    .map(utils.camelCaseNodeName)
    .map(utils.removePixelsFromNodeValue)
    .filter(utils.getEnabledAttributes(enabledAttributes.concat(COMMON_ATTS)))
    .reduce((acc: Record<string, any>, { nodeName, nodeValue }: any) => {
      let val = nodeValue;
      if (nodeName === 'fill') {
        if (fill) {
          if (typeof fill === 'string') {
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

function AddFill(
  fn: (node: any, enabledAttributes: string[], fill: SvgUriProps['fill'], fillAll: boolean | undefined) => Record<string, any>,
  fill: SvgUriProps['fill'],
  fillAll: boolean | undefined
) {
  return function (node: any, enabledAttributes: string[]) {
    return fn(node, enabledAttributes, fill, fillAll);
  };
}

function createSVGElement(
  node: any,
  children: any[],
  fill: SvgUriProps['fill'],
  fillAll: boolean | undefined,
  width: number | string | undefined,
  height: number | string | undefined,
  mode: SvgUriProps['mode']
): React.ReactElement | null {
  trimElementChildren(children);
  const _obtainComponentAtts = AddFill(obtainComponentAtts, fill, fillAll);
  let componentAtts: Record<string, any> = {};
  const i = ind++;

  switch (node.nodeName) {
    case 'svg': {
      componentAtts = _obtainComponentAtts(node, SVG_ATTS);
      const { scaleX, scaleY } = getSvgScale(width, height, componentAtts, mode);
      return (
        <Svg key={i} {...componentAtts} style={[componentAtts.style, { transform: [{ scaleX }, { scaleY }] }]}>
          {children}
        </Svg>
      );
    }
    case 'g':
      componentAtts = _obtainComponentAtts(node, G_ATTS);
      return <G key={i} {...componentAtts}>{children}</G>;
    case 'path':
      componentAtts = _obtainComponentAtts(node, PATH_ATTS);
      return <Path key={i} {...componentAtts}>{children}</Path>;
    case 'circle':
      componentAtts = _obtainComponentAtts(node, CIRCLE_ATTS);
      return <Circle key={i} {...componentAtts}>{children}</Circle>;
    case 'rect':
      componentAtts = _obtainComponentAtts(node, RECT_ATTS);
      return <Rect key={i} {...componentAtts}>{children}</Rect>;
    case 'line':
      componentAtts = _obtainComponentAtts(node, LINE_ATTS);
      return <Line key={i} {...componentAtts}>{children}</Line>;
    case 'defs':
      return <Defs key={i}>{children}</Defs>;
    case 'linearGradient':
      componentAtts = _obtainComponentAtts(node, LINEARG_ATTS);
      return <LinearGradient key={i} {...componentAtts}>{children}</LinearGradient>;
    case 'radialGradient':
      componentAtts = _obtainComponentAtts(node, RADIALG_ATTS);
      return <RadialGradient key={i} {...componentAtts}>{children}</RadialGradient>;
    case 'stop':
      componentAtts = _obtainComponentAtts(node, STOP_ATTS);
      return <Stop key={i} {...componentAtts}>{children}</Stop>;
    case 'ellipse':
      componentAtts = _obtainComponentAtts(node, ELLIPSE_ATTS);
      return <Ellipse key={i} {...componentAtts}>{children}</Ellipse>;
    case 'polygon':
      componentAtts = _obtainComponentAtts(node, POLYGON_ATTS);
      return <Polygon key={i} {...componentAtts}>{children}</Polygon>;
    case 'polyline':
      componentAtts = _obtainComponentAtts(node, POLYLINE_ATTS);
      return <Polyline key={i} {...componentAtts}>{children}</Polyline>;
    case 'text':
      componentAtts = normalizeTextAttributes(_obtainComponentAtts(node, TEXT_ATTS));
      return <Text key={i} {...componentAtts}>{children}</Text>;
    case 'tspan':
      componentAtts = normalizeTextAttributes(_obtainComponentAtts(node, TEXT_ATTS));
      return <TSpan key={i} {...componentAtts}>{children}</TSpan>;
    default:
      return null;
  }
}

function inspectNode(
  node: any,
  fill: SvgUriProps['fill'],
  fillAll: boolean | undefined,
  width: number | string | undefined,
  height: number | string | undefined,
  mode: SvgUriProps['mode']
): React.ReactElement | null {
  if (!ACCEPTED_SVG_ELEMENTS.includes(node.nodeName)) {
    return null;
  }

  const arrayElements: any[] = [];

  if (node.childNodes && node.childNodes.length > 0) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const isTextValue = node.childNodes[i].nodeValue;
      if (isTextValue) {
        (node.nodeName === 'text' || node.nodeName === 'tspan') &&
          arrayElements.push(node.childNodes[i].nodeValue);
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

function shallowEqual(prev: any, next: any): boolean {
  if (prev === next) return true;
  if (typeof prev !== 'object' || prev === null || typeof next !== 'object' || next === null)
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

/**
 * 返回稳定的事件函数，始终调用最近一次已提交的回调。
 * @param callback 当前渲染提供的事件回调。
 * @returns 引用稳定的事件函数。
 */
function useCommittedEvent<Args extends unknown[], Result>(
  callback: (...args: Args) => Result
): (...args: Args) => Result {
  const callbackRef = useRef(callback);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Args): Result => callbackRef.current(...args), []);
}

function useEvent<T extends (...args: any[]) => any>(callback: T): T {
  const ref = useRef<T>(callback);
  ref.current = callback;
  return useCallback((...args: Parameters<T>): ReturnType<T> => ref.current(...args), [ref]) as T;
}

const useForceUpdate = () => {
  const [, setData] = useState(0);
  return useCallback(() => {
    setData((d) => d + 1);
  }, []);
};

type ConstantRef<T> = Readonly<{ current: T }>;
type Setter<T> = (
  v: T | ((prev: T) => T),
  equalityFn?: ((v1: T, v2: T) => boolean) | boolean
) => void;

const useConstant = <T,>(
  defValue: T,
  defEqualityFn?: ((v1: T, v2: T) => boolean) | boolean
): [ConstantRef<T>, Setter<T>] => {
  const ref = useRef<T>(defValue);
  const forceUpdate = useForceUpdate();

  const constRef = useMemo(
    () =>
      Object.freeze({
        get current(): T {
          return ref.current;
        },
      } as ConstantRef<T>),
    []
  );

  const setter = useEvent(
    (v: T | ((prev: T) => T), equalityFn: ((v1: T, v2: T) => boolean) | boolean | undefined = defEqualityFn) => {
      const oldVal = ref.current;
      ref.current = typeof v === 'function' ? (v as (prev: T) => T)(ref.current) : v;
      if (typeof equalityFn === 'function' ? equalityFn(oldVal, ref.current) : equalityFn) {
        forceUpdate();
      }
    }
  );

  return [constRef, setter];
};

export default React.memo(SvgUri, (prevProps, nextProps) => {
  return (
    prevProps.svgXmlData === nextProps.svgXmlData &&
    shallowEqual(prevProps.style, nextProps.style) &&
    shallowEqual(prevProps.source, nextProps.source) &&
    shallowEqual(prevProps.fill, nextProps.fill) &&
    prevProps.fillAll === nextProps.fillAll &&
    prevProps.mode === nextProps.mode &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.onLoad === nextProps.onLoad &&
    prevProps.onError === nextProps.onError
  );
});

const ACCEPTED_SVG_ELEMENTS = [
  'svg', 'g', 'circle', 'path', 'rect', 'defs', 'line',
  'linearGradient', 'radialGradient', 'stop', 'ellipse',
  'polygon', 'polyline', 'text', 'tspan',
];

const SVG_ATTS = ['viewBox', 'width', 'height'];
const G_ATTS = ['id'];
const CIRCLE_ATTS = ['cx', 'cy', 'r'];
const PATH_ATTS = ['d'];
const RECT_ATTS = ['width', 'height'];
const LINE_ATTS = ['x1', 'y1', 'x2', 'y2'];
const LINEARG_ATTS = LINE_ATTS.concat(['id', 'gradientUnits']);
const RADIALG_ATTS = CIRCLE_ATTS.concat(['id', 'gradientUnits']);
const STOP_ATTS = ['offset', 'stopColor'];
const ELLIPSE_ATTS = ['cx', 'cy', 'rx', 'ry'];
const TEXT_ATTS = ['fontFamily', 'fontSize', 'fontWeight', 'textAnchor'];
const POLYGON_ATTS = ['points'];
const POLYLINE_ATTS = ['points'];
const COMMON_ATTS = [
  'fill', 'fillOpacity', 'stroke', 'strokeWidth', 'strokeOpacity',
  'opacity', 'strokeLinecap', 'strokeLinejoin', 'strokeDasharray',
  'strokeDashoffset', 'x', 'y', 'rotate', 'scale', 'origin', 'originX', 'originY',
];
