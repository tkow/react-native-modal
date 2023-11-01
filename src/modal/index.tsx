import * as React from 'react';
import {Modal, View, useWindowDimensions} from 'react-native';
import {ModalProps, defaultProps} from './types';

import {initializeAnimations} from '../utils';
import ReactNativeModalContainer from './container';
import styles from './modal.style';

// Override default react-native-animatable animations
initializeAnimations();

function ReactNativeModal(props: ModalProps) {
  const {height: windowDeviceHeight, width: windowDeviceWidth} =
    useWindowDimensions();

  const mergedProps = {
    ...defaultProps,
    deviceWidth: windowDeviceWidth,
    deviceHeight: windowDeviceHeight,
    ...props,
  };

  const {
    animationIn: animationInFromProps,
    animationInTiming,
    animationOut: animationOutFromProps,
    animationOutTiming,
    avoidKeyboard,
    coverScreen,
    hasBackdrop,
    backdropColor,
    backdropOpacity,
    backdropTransitionInTiming,
    backdropTransitionOutTiming,
    customBackdrop,
    children,
    isVisible: propIsVisible,
    onModalShow,
    onBackButtonPress: onBackButtonPressFromProps,
    useNativeDriver,
    propagateSwipe,
    style,
    deviceWidth,
    deviceHeight,
    swipeDirection,
    useNativeDriverForBackdrop,
    onBackdropPress,
    hideModalContentWhileAnimating,
    onModalWillShow,
    onModalHide,
    onModalWillHide,
    ...otherProps
  } = mergedProps;

  // If coverScreen is set to false by the user
  // we render the modal inside the parent view directly
  if (!coverScreen && propIsVisible) {
    return (
      <View
        pointerEvents="box-none"
        style={[styles.backdrop, styles.containerBox]}
      >
        <ReactNativeModalContainer {...mergedProps} />
      </View>
    );
  }

  return (
    <Modal
      transparent={true}
      animationType={'none'}
      visible={propIsVisible}
      onRequestClose={onBackButtonPressFromProps}
      {...otherProps}
    >
      <ReactNativeModalContainer {...mergedProps} />
    </Modal>
  );
}

export default ReactNativeModal;
