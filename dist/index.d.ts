import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

/** 将指定的 SVG 原始填充色映射为新颜色。 */
type FillItem = {
    /** SVG 中的原始颜色。 */
    color: string;
    /** 替换后的颜色。 */
    fill: string;
};
/** SVG 图片的输入、显示参数及加载事件。 */
interface SvgUriProps {
    /** 显示宽度；数字使用 React Native 布局单位，字符串可使用百分比。 */
    width?: number | string;
    /** 显示高度；数字使用 React Native 布局单位，字符串可使用百分比。 */
    height?: number | string;
    /** SVG 缩放模式，默认 scaleToFill。 */
    mode?: 'aspectFit' | 'aspectFill' | 'scaleToFill';
    /** 远程 URI 或 require 返回的静态资源编号。 */
    source?: {
        uri: string;
    } | number;
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
/**
 * 将 SVG 资源或 XML 字符串转换为 React Native SVG 元素。
 * @param props 输入资源、显示参数和事件回调。
 * @returns SVG 外层容器。
 */
declare function SvgUri(props: SvgUriProps): React.JSX.Element;
declare const _default: React.MemoExoticComponent<typeof SvgUri>;

export { type FillItem, type SvgUriProps, _default as default };
