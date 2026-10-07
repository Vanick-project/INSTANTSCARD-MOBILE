import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Radii } from '../utils/tokens';

const logoSource = require('../../assets/logo.png');
const logoAsset = Image.resolveAssetSource(logoSource);
const LOGO_ASPECT = logoAsset.height / logoAsset.width;

type Props = {
  /** Logo width in dp */
  width?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  /** White pad behind logo (logo artwork includes light background) */
  padded?: boolean;
};

export function BrandLogo({ width = 240, style, imageStyle, padded = true }: Props) {
  const height = Math.round(width * LOGO_ASPECT);

  const image = (
    <Image
      source={logoSource}
      style={[{ width, height }, imageStyle]}
      resizeMode="contain"
      accessibilityLabel="Instantcards"
    />
  );

  if (!padded) {
    return <View style={style}>{image}</View>;
  }

  return (
    <View style={[styles.pad, { paddingHorizontal: width * 0.06, paddingVertical: width * 0.04 }, style]}>
      {image}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.lg,
    alignSelf: 'center',
  },
});
