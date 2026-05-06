# TypeScript 迁移与 dist 输出设计

**日期：** 2026-05-06  
**项目：** react-native-svg-uri-yum  
**目标：** 将项目完全 TypeScript 化，并通过 tsup 提供 CJS + ESM 双格式 dist 输出

---

## 背景

当前项目为纯 JavaScript 编写的 React Native SVG 渲染库，有一份手写的 `index.d.ts` 类型声明文件，没有构建系统，`package.json` 的 `main` 直接指向源码 `index.js`。

目标是将源码迁移至 TypeScript，通过 tsup 构建为 CJS + ESM 双格式，消费者可获得完整类型支持。

---

## 目录结构

```
react-native-svg-uri/
├── src/
│   ├── index.tsx        ← 原 index.js（JSX → TSX）
│   └── utils.ts         ← 原 utils.js
├── dist/                ← tsup 构建产物（加入 .gitignore）
│   ├── index.js         ← CJS
│   ├── index.mjs        ← ESM
│   ├── index.d.ts       ← 自动生成的类型声明
│   └── utils.d.ts
├── test/                ← 保持不动（mocha/chai/JS）
├── tsconfig.json        ← 新增
├── tsup.config.ts       ← 新增
├── package.json         ← 更新
└── index.d.ts           ← 删除（由 tsup 自动生成替代）
```

---

## 类型设计

### `src/utils.ts`

所有工具函数明确标注输入输出类型：

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
}): Record<string, string> | null => { ... };

export const getEnabledAttributes =
  (enabledAttributes: string[]) =>
  ({ nodeName }: { nodeName: string }): boolean =>
    enabledAttributes.includes(camelCase(nodeName));
```

### `src/index.tsx`

核心 Props 接口（从手写 `index.d.ts` 迁移并改进）：

```typescript
import { ImageURISource, StyleProp, ViewStyle } from 'react-native';

type FillItem = { color: string; fill: string };

interface SvgUriProps {
  width?: number | string;
  height?: number | string;
  source?: ImageURISource | number;  // number 支持 require() 静态资源
  svgXmlData?: string;
  fill?: string | FillItem[];
  onLoad?: () => void;
  fillAll?: boolean;
  style?: StyleProp<ViewStyle>;
}
```

### 依赖类型处理

| 依赖 | 处理方式 |
|------|----------|
| `xmldom` | 安装 `@types/xmldom` |
| `react-native/Libraries/Image/resolveAssetSource` | 用 `// @ts-ignore` 或 `as any` 过渡（该内部模块无官方类型） |
| `react-native-svg` | 已自带类型，直接使用 |
| `react`, `react-native` | 安装 `@types/react`, `@types/react-native` |

---

## 构建配置

### `tsconfig.json`

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

### `tsup.config.ts`

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['react', 'react-native', 'react-native-svg'],
});
```

### `package.json` 变更

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

**新增 devDependencies：**
- `typescript`
- `tsup`
- `@types/react`
- `@types/react-native`
- `@types/xmldom`

---

## 实现步骤

1. 安装新 devDependencies
2. 创建 `src/` 目录，将 `index.js` 复制为 `src/index.tsx`，`utils.js` 复制为 `src/utils.ts`
3. 为 `src/utils.ts` 添加类型注解
4. 为 `src/index.tsx` 添加类型注解，处理 `xmldom` 和 `resolveAssetSource` 的类型问题
5. 创建 `tsconfig.json`
6. 创建 `tsup.config.ts`
7. 更新 `package.json`（main/module/types/exports/files/scripts/devDependencies）
8. 将 `dist/` 加入 `.gitignore`
9. 删除根目录 `index.d.ts`
10. 运行 `yarn build` 验证构建成功，检查 `dist/` 输出
11. 删除根目录的 `index.js` 和 `utils.js`（源码已迁移至 `src/`）

---

## 约束

- 测试文件（`test/utils.js`）保持不动，不转 TypeScript
- 源码逻辑不做功能性改动，仅做类型迁移
- `resolveAssetSource` 内部模块类型用 `as any` 过渡，不引入额外的类型 hack
