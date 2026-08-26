import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

type FillItem = {
    color: string;
    fill: string;
};
interface SvgUriProps {
    width?: number | string;
    height?: number | string;
    mode?: 'aspectFit' | 'aspectFill' | 'scaleToFill';
    source?: {
        uri: string;
    } | number;
    svgXmlData?: string;
    fill?: string | FillItem[];
    onLoad?: () => void;
    fillAll?: boolean;
    style?: StyleProp<ViewStyle>;
}
declare function SvgUri(props: SvgUriProps): React.JSX.Element;
declare const _default: React.MemoExoticComponent<typeof SvgUri>;

export { type FillItem, type SvgUriProps, _default as default };
