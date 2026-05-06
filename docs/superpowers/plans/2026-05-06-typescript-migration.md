# TypeScript 迁移与 dist 输出实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 react-native-svg-uri-yum 完全迁移至 TypeScript，通过 tsup 输出 CJS + ESM 双格式 dist

**Architecture:** 源码移入 `src/`（index.tsx + utils.ts），tsup 构建为 `dist/`（CJS/ESM + 类型声明），package.json 通过 `exports` 字段对外暴露 dist 产物。

**Tech Stack:** TypeScript 5.x, tsup（基于 esbuild），@types/react, @types/react-native, @types/xmldom

---

## 文件变更地图

| 操作 | 文件 |
|------|------|
| 新建 | `src/index.tsx` |
| 新建 | `src/utils.ts` |
| 新建 | `tsconfig.json` |
| 新建 | `tsup.config.ts` |
| 修改 | `package.json` |
| 修改 | `.babelrc` |
| 修改 | `.gitignore` |
| 修改 | `test/utils.js`（仅改 import 路径） |
| 删除 | `index.js` |
| 删除 | `utils.js` |
| 删除 | `index.d.ts` |

---

## Task 1: 安装依赖 + 创建 tsconfig.json

**Files:**
- Modify: `package.json`（yarn add 自动更新）
- Create: `tsconfig.json`

- [ ] **Step 1: 安装新 devDependencies**

```bash
yarn add --dev typescript tsup @types/react @types/react-native @types/xmldom @babel/preset-typescript
```

Expected: 无报错，node_modules 中出现 `tsup`、`typescript`、`@types/react` 等目录，package.json 和 yarn.lock 自动更新。

- [ ] **Step 3: 创建 tsconfig.json**

在项目根目录创建 `tsconfig.json`，内容如下：

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react",
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: 验证 tsc 可识别配置**

```bash
./node_modules/.bin/tsc --noEmit --version
```

Expected: 输出 TypeScript 版本号（如 `Version 5.x.x`），无报错。

- [ ] **Step 5: 提交**

```bash
git add package.json yarn.lock tsconfig.json
git commit -m "chore: add TypeScript and tsup tooling dependencies"
```

---

## Task 2: 创建 tsup.config.ts

**Files:**
- Create: `tsup.config.ts`

- [ ] **Step 1: 创建 tsup.config.ts**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['react', 'react-native', 'react-native-svg', 'xmldom'],
});
```

- [ ] **Step 2: 提交**

```bash
git add tsup.config.ts
git commit -m "chore: add tsup build config"
```

---

## Task 3: 转换 utils.js → src/utils.ts

**Files:**
- Create: `src/utils.ts`
- Modify: `.babelrc`
- Modify: `test/utils.js`（仅改 import 路径）

- [ ] **Step 1: 创建 src/ 目录并新建 src/utils.ts**

创建文件 `src/utils.ts`，完整内容如下：

```typescript
export const camelCase = (value: string): string =>
  value.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

export const camelCaseNodeName = ({
  nodeName,
  nodeValue,
}: {
  nodeName: string;
  nodeValue: string;
}) => ({ nodeName: camelCase(nodeName), nodeValue });

export const removePixelsFromNodeValue = ({
  nodeName,
  nodeValue,
}: {
  nodeName: string;
  nodeValue: string;
}) => ({ nodeName, nodeValue: nodeValue.replace('px', '') });

export const transformStyle = ({
  nodeName,
  nodeValue,
  fillProp,
}: {
  nodeName: string;
  nodeValue: string;
  fillProp?: string;
}): Record<string, string> | null => {
  if (nodeName === 'style') {
    return nodeValue.split(';').reduce<Record<string, string>>((acc, attribute) => {
      const [property, value] = attribute.split(':');
      if (property === '') return acc;
      return { ...acc, [camelCase(property)]: fillProp && property === 'fill' ? fillProp : value };
    }, {});
  }
  return null;
};

export const getEnabledAttributes =
  (enabledAttributes: string[]) =>
  ({ nodeName }: { nodeName: string }): boolean =>
    enabledAttributes.includes(camelCase(nodeName));
```

- [ ] **Step 2: 更新 .babelrc 以支持 TypeScript**

将 `.babelrc` 替换为：

```json
{
  "presets": ["react-native", "@babel/preset-typescript"]
}
```

- [ ] **Step 3: 更新测试的 import 路径**

打开 `test/utils.js`，将第一行 import 改为：

```javascript
import {transformStyle, camelCase, removePixelsFromNodeValue, getEnabledAttributes} from '../src/utils';
```

（其余测试内容不变）

- [ ] **Step 4: 运行测试，确认通过**

```bash
./node_modules/mocha/bin/mocha --compilers js:babel-core/register
```

Expected:
```
transformStyle
  ✓ transforms style attribute
  ✓ transforms style attribute with dash-case attribute
removePixelsFromNodeValue
  ✓ removes pixels from x, y, height and width attributes
camelCase
  ✓ transforms two word attribute with dash
  ✓ does not do anything to string that is already camel cased
getEnabledAttributes
  ✓ return true when nodeName is found
  ✓ return false when nodeName is not found

7 passing
```

- [ ] **Step 5: 提交**

```bash
git add src/utils.ts .babelrc test/utils.js
git commit -m "feat: convert utils to TypeScript"
```

---

## Task 4: 转换 index.js → src/index.tsx

**Files:**
- Create: `src/index.tsx`

- [ ] **Step 1: 创建 src/index.tsx**

创建文件 `src/index.tsx`，完整内容如下：

```tsx
import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { DOMParser } from 'xmldom';
// @ts-ignore
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
  Stop,
} from 'react-native-svg';

import * as utils from './utils';

type FillItem = { color: string; fill: string };

export interface SvgUriProps {
  width?: number | string;
  height?: number | string;
  source?: { uri: string } | number;
  svgXmlData?: string;
  fill?: string | FillItem[];
  onLoad?: () => void;
  fillAll?: boolean;
  style?: StyleProp<ViewStyle>;
}

let ind = 0;
const cacheFetchSVGDataPromise: Record<string, Promise<string>> = {};

function SvgUri(props: SvgUriProps) {
  const { fill, fillAll, svgXmlData: xmlData, source, onLoad, style, width: _width, height: _height } = props;
  const [svgXmlDataConst, setSvgXmlData] = useConstant<string | undefined>(
    xmlData,
    (v1, v2) => v1 !== v2
  );
  const uri = source && typeof source === 'object' && 'uri' in source ? source.uri : undefined;
  const uriRef = useRef(uri);

  useMemo(() => {
    setSvgXmlData(xmlData, false);
  }, [xmlData, setSvgXmlData]);

  const { current: svgXmlData } = svgXmlDataConst;

  // eslint-disable-next-line no-shadow
  const fetchSVGData = useEvent(async (fetchUri: string) => {
    let responseXML: string | null = null;
    let error: unknown = null;
    try {
      if (!cacheFetchSVGDataPromise[fetchUri]) {
        cacheFetchSVGDataPromise[fetchUri] = fetch(fetchUri).then((r) => r.text());
      }
      responseXML = await cacheFetchSVGDataPromise[fetchUri];
    } catch (e) {
      delete cacheFetchSVGDataPromise[fetchUri];
      error = e;
      console.warn('ERROR SVG fetchSVGData:', fetchUri, e);
    } finally {
      if (uriRef.current === fetchUri) {
        setSvgXmlData(responseXML ?? undefined);
        if (onLoad && !error) {
          onLoad();
        }
      }
    }
    return responseXML;
  });

  useEffect(() => {
    if (typeof source === 'number' || (source && typeof source === 'object' && 'uri' in source)) {
      const _source = resolveAssetSource(source) || {};
      uriRef.current = _source.uri;
      fetchSVGData(_source.uri);
    }
  }, [source, fetchSVGData]);

  const flatStyle = StyleSheet.flatten(style) || {};
  const width = _width || flatStyle.width;
  const height = _height || flatStyle.height;

  const rootSVG = useMemo(() => {
    if (!svgXmlData) {
      return null;
    }
    const inputSVG = svgXmlData.substring(
      svgXmlData.indexOf('<svg '),
      svgXmlData.indexOf('</svg>') + 6
    );
    const doc = new DOMParser().parseFromString(inputSVG, 'text/xml');
    return inspectNode(doc.childNodes[0] as any, fill, fillAll, width, height);
  }, [svgXmlData, fill, fillAll, width, height]);

  return (
    <View style={[{ justifyContent: 'center', alignItems: 'center' }, style, { width, height }]}>
      {rootSVG}
    </View>
  );
}

function fixYPosition(y: string, node: any): string {
  if (node.attributes) {
    const fontSizeAttr = Object.keys(node.attributes).find(
      (a: string) => node.attributes[a].name === 'font-size'
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
  componentAtts: Record<string, any>
): number {
  const scaleWidth = getScale(width, componentAtts.width);
  const scaleHeight = getScale(height, componentAtts.height);
  return Math.min(scaleWidth, scaleHeight);
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
  height: number | string | undefined
): React.ReactElement | null {
  trimElementChildren(children);
  const _obtainComponentAtts = AddFill(obtainComponentAtts, fill, fillAll);
  let componentAtts: Record<string, any> = {};
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
      componentAtts = _obtainComponentAtts(node, TEXT_ATTS);
      if (componentAtts.y) {
        componentAtts.y = fixYPosition(componentAtts.y, node);
      }
      return <Text key={i} {...componentAtts}>{children}</Text>;
    case 'tspan':
      componentAtts = _obtainComponentAtts(node, TEXT_ATTS);
      if (componentAtts.y) {
        componentAtts.y = fixYPosition(componentAtts.y, node);
      }
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
  height: number | string | undefined
): React.ReactElement | null {
  if (!ACCEPTED_SVG_ELEMENTS.includes(node.nodeName)) {
    return null;
  }

  const arrayElements: any[] = [];

  if (node.childNodes && node.childNodes.length > 0) {
    for (let i = 0; i < node.childNodes.length; i++) {
      const isTextValue = node.childNodes[i].nodeValue;
      if (isTextValue) {
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
    prevProps.fillAll === nextProps.fillAll
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
const STOP_ATTS = ['offset'];
const ELLIPSE_ATTS = ['cx', 'cy', 'rx', 'ry'];
const TEXT_ATTS = ['fontFamily', 'fontSize', 'fontWeight', 'textAnchor'];
const POLYGON_ATTS = ['points'];
const POLYLINE_ATTS = ['points'];
const COMMON_ATTS = [
  'fill', 'fillOpacity', 'stroke', 'strokeWidth', 'strokeOpacity',
  'opacity', 'strokeLinecap', 'strokeLinejoin', 'strokeDasharray',
  'strokeDashoffset', 'x', 'y', 'rotate', 'scale', 'origin', 'originX', 'originY',
];
```

- [ ] **Step 2: 验证 TypeScript 编译无错误**

```bash
./node_modules/.bin/tsc --noEmit
```

Expected: 无输出（无错误）。若有错误，根据错误信息修复后再继续。

- [ ] **Step 3: 提交**

```bash
git add src/index.tsx
git commit -m "feat: convert index to TypeScript"
```

---

## Task 5: 更新 package.json + .gitignore，删除旧文件

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Delete: `index.js`, `utils.js`, `index.d.ts`

- [ ] **Step 1: 更新 package.json 的发布字段**

在 `package.json` 中，将 `"main": "index.js"` 替换，并新增 `module`、`types`、`files`、`exports` 字段，同时更新 `scripts`。最终 package.json 中这些字段应为：

```json
{
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup",
    "test": "./node_modules/mocha/bin/mocha --compilers js:babel-core/register"
  }
}
```

（`devDependencies` 已由 Task 1 的 `yarn add --dev` 自动更新，无需手动修改。）

- [ ] **Step 2: 在 .gitignore 追加 dist/**

在 `.gitignore` 文件末尾追加一行：

```
dist/
```

- [ ] **Step 3: 删除旧源文件**

```bash
rm index.js utils.js index.d.ts
```

- [ ] **Step 4: 提交**

```bash
git add package.json .gitignore
git rm index.js utils.js index.d.ts
git commit -m "chore: update package.json for dist output, remove old source files"
```

---

## Task 6: 构建并验证 dist 输出

**Files:**
- 构建产物写入 `dist/`（不提交）

- [ ] **Step 1: 运行构建**

```bash
yarn build
```

Expected 输出（类似）：
```
CJS  dist/index.js
ESM  dist/index.mjs
DTS  dist/index.d.ts
```

若有 TypeScript 类型错误，根据错误信息修复 `src/` 中对应文件后重新运行。

- [ ] **Step 2: 验证 dist 文件存在**

```bash
ls dist/
```

Expected：至少包含 `index.js`、`index.mjs`、`index.d.ts`。

- [ ] **Step 3: 验证 CJS 导出格式正确**

```bash
head -5 dist/index.js
```

Expected：文件开头应为 `"use strict"` 或 CommonJS 形式（`Object.defineProperty(exports, ...`）。

- [ ] **Step 4: 验证 ESM 导出格式正确**

```bash
head -5 dist/index.mjs
```

Expected：文件包含 `import` 语句或 `export` 声明。

- [ ] **Step 5: 验证类型声明存在**

```bash
head -20 dist/index.d.ts
```

Expected：包含 `export interface SvgUriProps` 和 `export default` 声明。

- [ ] **Step 6: 运行测试，确认无回归**

```bash
./node_modules/mocha/bin/mocha --compilers js:babel-core/register
```

Expected: 7 passing

- [ ] **Step 7: 提交（如有修复）**

若上述步骤发现并修复了代码问题，提交修复：

```bash
git add src/
git commit -m "fix: resolve TypeScript build issues"
```

---

## 完成检查清单

- [ ] `src/utils.ts` 存在，有完整类型注解
- [ ] `src/index.tsx` 存在，有完整类型注解
- [ ] `tsconfig.json` 存在
- [ ] `tsup.config.ts` 存在
- [ ] `yarn build` 成功，`dist/` 有 index.js + index.mjs + index.d.ts
- [ ] `yarn test` 7 passing
- [ ] `package.json` 的 main/module/types/exports/files 已更新
- [ ] `dist/` 已加入 `.gitignore`
- [ ] 旧文件 index.js / utils.js / index.d.ts 已删除
