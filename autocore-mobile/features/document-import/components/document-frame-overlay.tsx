import { StyleSheet, View } from 'react-native';

/** Document capture guide — corner brackets over a soft vignette. */
export function DocumentFrameOverlay() {
  return (
    <View pointerEvents="none" style={styles.root}>
      <View style={styles.vignette} />
      <View style={styles.frame}>
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
      </View>
    </View>
  );
}

const CORNER = 28;
const THICK = 3;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  frame: {
    width: '78%',
    aspectRatio: 0.72,
    maxHeight: '62%',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: 'rgba(255,255,255,0.92)',
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: THICK,
    borderLeftWidth: THICK,
    borderTopLeftRadius: 6,
  },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: THICK,
    borderRightWidth: THICK,
    borderTopRightRadius: 6,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: THICK,
    borderLeftWidth: THICK,
    borderBottomLeftRadius: 6,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: THICK,
    borderRightWidth: THICK,
    borderBottomRightRadius: 6,
  },
});
