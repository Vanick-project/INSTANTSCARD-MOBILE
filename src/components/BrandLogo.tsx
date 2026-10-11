import React from 'react';
import { Image, ImageStyle, StyleProp, View, ViewStyle } from 'react-native';

/** Transparent logo — regenerate with `npm run generate:assets`. */
const logoSource = require('../../assets/logo.png');
const logoAsset = Image.resolveAssetSource(logoSource);
const LOGO_ASPECT = logoAsset.height / logoAsset.width;

type Props = {
  /** Logo width in dp */
  width?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export function BrandLogo({ width = 240, style, imageStyle }: Props) {
  const height = Math.round(width * LOGO_ASPECT);

  return (
    <View style={style}>
      <Image
        source={logoSource}
        style={[{ width, height }, imageStyle]}
        resizeMode="contain"
        accessibilityLabel="Instantcards"
      />
    </View>
  );
}
