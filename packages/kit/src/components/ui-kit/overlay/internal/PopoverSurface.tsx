import React, { type FC, useState } from 'react';
import {
  type LayoutChangeEvent,
  StyleSheet,
  View,
  type ViewProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';

import { useTheme } from '../../../../hooks/use-theme';
import { useThemeUiTokens } from '../../../../providers/theme-provider';

import type { PopoverArrow } from '../types';

export interface PopoverSurfaceProps extends ViewProps {
  arrow?: PopoverArrow;
  paddingCorner?: number;
  headerStyle?: StyleProp<ViewStyle>;
  arrowStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  popoverStyle?: StyleProp<ViewStyle>;
}

const FILTERED_POPOVER_STYLE_KEYS = new Set<keyof ViewStyle>([
  'alignItems',
  'backgroundColor',
  'borderBottomColor',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderBottomWidth',
  'borderColor',
  'borderLeftColor',
  'borderLeftWidth',
  'borderRadius',
  'borderRightColor',
  'borderRightWidth',
  'borderStyle',
  'borderTopColor',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderTopWidth',
  'borderWidth',
  'boxShadow',
  'elevation',
  'flexDirection',
  'justifyContent',
  'margin',
  'marginBottom',
  'marginHorizontal',
  'marginLeft',
  'marginRight',
  'marginTop',
  'marginVertical',
  'padding',
  'paddingBottom',
  'paddingHorizontal',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingVertical',
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
]);

const CONTENT_STYLE_KEYS = new Set<keyof ViewStyle>([
  'alignItems',
  'backgroundColor',
  'borderBottomColor',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderBottomWidth',
  'borderColor',
  'borderLeftColor',
  'borderLeftWidth',
  'borderRadius',
  'borderRightColor',
  'borderRightWidth',
  'borderStyle',
  'borderTopColor',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderTopWidth',
  'borderWidth',
  'boxShadow',
  'flexDirection',
  'justifyContent',
  'margin',
  'marginBottom',
  'marginHorizontal',
  'marginLeft',
  'marginRight',
  'marginTop',
  'marginVertical',
  'padding',
  'paddingBottom',
  'paddingHorizontal',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingVertical',
]);

const ARROW_ROTATIONS: Record<PopoverArrow, string> = {
  none: '0deg',
  topLeft: '45deg',
  top: '45deg',
  topRight: '45deg',
  rightTop: '135deg',
  right: '135deg',
  rightBottom: '135deg',
  bottomRight: '225deg',
  bottom: '225deg',
  bottomLeft: '225deg',
  leftBottom: '315deg',
  left: '315deg',
  leftTop: '315deg',
};

const POPOVER_PADDING_SIDES: Record<PopoverArrow, keyof ViewStyle | null> = {
  none: null,
  topLeft: 'paddingTop',
  top: 'paddingTop',
  topRight: 'paddingTop',
  rightTop: 'paddingRight',
  right: 'paddingRight',
  rightBottom: 'paddingRight',
  bottomRight: 'paddingBottom',
  bottom: 'paddingBottom',
  bottomLeft: 'paddingBottom',
  leftBottom: 'paddingLeft',
  left: 'paddingLeft',
  leftTop: 'paddingLeft',
};

function pickDefinedStyle(style: ViewStyle, predicate: (key: keyof ViewStyle) => boolean) {
  const nextStyle: ViewStyle = {};

  (Object.keys(style) as (keyof ViewStyle)[]).forEach(key => {
    if (predicate(key) && style[key] !== undefined) {
      Object.assign(nextStyle, { [key]: style[key] });
    }
  });

  return nextStyle;
}

const PopoverSurface: FC<PopoverSurfaceProps> = props => {
  const {
    style,
    children,
    arrow = 'none',
    paddingCorner,
    headerStyle: propHeaderStyle,
    arrowStyle: propArrowStyle,
    contentStyle: propContentStyle,
    popoverStyle: propPopoverStyle,
    onLayout,
    ...others
  } = props;
  const theme = useTheme();
  const ui = useThemeUiTokens();

  const [layout, setLayout] = useState({ width: 0, height: 0 });

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== layout.width || height !== layout.height) {
      setLayout({ width, height });
    }
    onLayout?.(e);
  };

  const combinedStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: ui.overlay.popover.borderRadius,
      borderWidth: ui.overlay.popover.borderWidth,
    },
    // Apply project defaults before deriving the content and arrow styles.
    ui.overlay.popoverStyle,
    style,
  ];
  const fs = StyleSheet.flatten(combinedStyle) || {};
  const {
    backgroundColor,
    borderColor,
    borderRadius,
    borderWidth = 0,
  } = fs as ViewStyle & { backgroundColor?: string; borderColor?: string };
  const outerStyle = pickDefinedStyle(
    fs as ViewStyle,
    key => !FILTERED_POPOVER_STYLE_KEYS.has(key)
  );
  const contentBaseStyle = pickDefinedStyle(fs as ViewStyle, key => CONTENT_STYLE_KEYS.has(key));

  const arrowSize = ui.overlay.popover.arrowSize;
  let halfSquareSize = Math.sqrt(arrowSize * arrowSize * 2) / 2;
  halfSquareSize =
    Math.ceil(halfSquareSize / ui.overlay.popover.pixelSize) * ui.overlay.popover.pixelSize;

  const headerSize = halfSquareSize + (typeof borderWidth === 'number' ? borderWidth : 0);
  const headerPadding = headerSize - arrowSize / 2;
  const headerPaddingCorner = paddingCorner ?? ui.overlay.popover.paddingCorner;
  const contentPadding = halfSquareSize;

  let useArrow = arrow;
  switch (arrow) {
    case 'topLeft':
    case 'topRight':
      if (headerPaddingCorner + contentPadding > layout.width / 2) useArrow = 'top';
      break;
    case 'rightTop':
    case 'rightBottom':
      if (headerPaddingCorner + contentPadding > layout.height / 2) useArrow = 'right';
      break;
    case 'bottomRight':
    case 'bottomLeft':
      if (headerPaddingCorner + contentPadding > layout.width / 2) useArrow = 'bottom';
      break;
    case 'leftBottom':
    case 'leftTop':
      if (headerPaddingCorner + contentPadding > layout.height / 2) useArrow = 'left';
      break;
  }

  const builtHeaderStyle = StyleSheet.flatten([
    {
      backgroundColor: 'transparent',
      overflow: 'hidden',
      position: 'absolute',
    },
    getHeaderLayout(useArrow, {
      headerPadding,
      headerPaddingCorner,
      headerSize,
    }),
    propHeaderStyle,
  ]) as ViewStyle;

  const builtArrowStyle = StyleSheet.flatten([
    {
      backgroundColor: backgroundColor as string,
      borderColor,
      borderTopWidth: borderWidth,
      borderLeftWidth: borderWidth,
      height: arrowSize,
      width: arrowSize,
      transform: [{ rotate: ARROW_ROTATIONS[useArrow] }],
    },
    propArrowStyle,
  ]) as ViewStyle;

  const builtPopoverStyle = [
    outerStyle,
    {
      backgroundColor:
        useArrow === 'none' ? (backgroundColor as string) || theme.surface : 'transparent',
      ...(useArrow === 'none' ? { borderRadius, borderWidth, borderColor } : {}),
    },
    getPopoverLayout(useArrow, contentPadding),
    propPopoverStyle,
  ];

  const builtContentStyle = [
    useArrow === 'none'
      ? {
          ...contentBaseStyle,
          backgroundColor: backgroundColor as string,
          borderRadius,
          borderWidth: 0,
        }
      : {
          ...contentBaseStyle,
          backgroundColor: backgroundColor as string,
          borderRadius,
          borderWidth,
          borderColor,
        },
    propContentStyle,
  ];

  return (
    <View style={builtPopoverStyle} onLayout={handleLayout} {...others}>
      <View style={builtContentStyle}>{children}</View>
      {useArrow !== 'none' && (
        <View style={builtHeaderStyle}>
          <View style={builtArrowStyle} />
        </View>
      )}
    </View>
  );
};

function getHeaderLayout(
  arrow: PopoverArrow,
  sizes: {
    headerPadding: number;
    headerPaddingCorner: number;
    headerSize: number;
  }
): ViewStyle {
  const { headerPadding, headerPaddingCorner, headerSize } = sizes;

  switch (arrow) {
    case 'topLeft':
      return {
        alignItems: 'flex-start',
        height: headerSize,
        left: 0,
        paddingLeft: headerPaddingCorner,
        paddingTop: headerPadding,
        right: 0,
        top: 0,
      };
    case 'top':
      return {
        alignItems: 'center',
        height: headerSize,
        left: 0,
        paddingTop: headerPadding,
        right: 0,
        top: 0,
      };
    case 'topRight':
      return {
        alignItems: 'flex-end',
        height: headerSize,
        left: 0,
        paddingRight: headerPaddingCorner,
        paddingTop: headerPadding,
        right: 0,
        top: 0,
      };
    case 'rightTop':
      return {
        alignItems: 'flex-end',
        bottom: 0,
        justifyContent: 'flex-start',
        paddingRight: headerPadding,
        paddingTop: headerPaddingCorner,
        right: 0,
        top: 0,
        width: headerSize,
      };
    case 'right':
      return {
        alignItems: 'flex-end',
        bottom: 0,
        justifyContent: 'center',
        paddingRight: headerPadding,
        right: 0,
        top: 0,
        width: headerSize,
      };
    case 'rightBottom':
      return {
        alignItems: 'flex-end',
        bottom: 0,
        justifyContent: 'flex-end',
        paddingBottom: headerPaddingCorner,
        paddingRight: headerPadding,
        right: 0,
        top: 0,
        width: headerSize,
      };
    case 'bottomRight':
      return {
        alignItems: 'flex-end',
        bottom: 0,
        justifyContent: 'flex-end',
        left: 0,
        paddingBottom: headerPadding,
        paddingRight: headerPaddingCorner,
        right: 0,
      };
    case 'bottom':
      return {
        alignItems: 'center',
        bottom: 0,
        justifyContent: 'flex-end',
        left: 0,
        paddingBottom: headerPadding,
        right: 0,
      };
    case 'bottomLeft':
      return {
        alignItems: 'flex-start',
        bottom: 0,
        justifyContent: 'flex-end',
        left: 0,
        paddingBottom: headerPadding,
        paddingLeft: headerPaddingCorner,
        right: 0,
      };
    case 'leftBottom':
      return {
        alignItems: 'flex-start',
        bottom: 0,
        justifyContent: 'flex-end',
        left: 0,
        paddingBottom: headerPaddingCorner,
        paddingLeft: headerPadding,
        top: 0,
        width: headerSize,
      };
    case 'left':
      return {
        alignItems: 'flex-start',
        bottom: 0,
        justifyContent: 'center',
        left: 0,
        paddingLeft: headerPadding,
        top: 0,
        width: headerSize,
      };
    case 'leftTop':
      return {
        alignItems: 'flex-start',
        bottom: 0,
        justifyContent: 'flex-start',
        left: 0,
        paddingLeft: headerPadding,
        paddingTop: headerPaddingCorner,
        top: 0,
        width: headerSize,
      };
    case 'none':
      return {};
  }
}

function getPopoverLayout(arrow: PopoverArrow, contentPadding: number): ViewStyle {
  const paddingSide = POPOVER_PADDING_SIDES[arrow];
  return paddingSide ? { [paddingSide]: contentPadding } : {};
}

export default PopoverSurface;
