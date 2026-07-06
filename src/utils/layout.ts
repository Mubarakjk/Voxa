import { useWindowDimensions } from 'react-native';

import { layout, spacing } from '../constants/theme';

export function useGridItemWidth(columns = 2, gap = layout.cardGap, padding = layout.screenPadding) {
  const { width } = useWindowDimensions();
  return (width - padding * 2 - gap * (columns - 1)) / columns;
}

export function useContentWidth(padding = layout.screenPadding) {
  const { width } = useWindowDimensions();
  return width - padding * 2;
}

export { layout, spacing };
