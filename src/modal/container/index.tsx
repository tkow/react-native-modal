import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  BackHandler,
  InteractionManager,
  KeyboardAvoidingView,
  Modal,
  Platform,
  View,
  useWindowDimensions,
} from 'react-native';
import * as animatable from 'react-native-animatable';
import {ModalProps, defaultProps} from '../types';

import {buildAnimations, initializeAnimations} from '../../utils';
import Backdrop from '../backdrop';
import {usePanResponder} from '../hooks';
import styles from '../modal.style';
import {Direction} from '../types';

type State = {
  showContent: boolean;
  isVisible: boolean;
  isSwipeable: boolean;
};

function ReactNativeModalContainer(props: ModalProps) {
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

  const containerProps = otherProps;

  const [isSwipeable, _setIsSwipable] = useState<State['isSwipeable']>(
    !!swipeDirection,
  );
  const [isVisible, setIsVisible] = useState<State['isVisible']>(false);
  const [showContent, setShowContent] =
    useState<State['showContent']>(propIsVisible);

  const {animationIn, animationOut} = useMemo(
    () =>
      buildAnimations({
        animationIn: animationOutFromProps!,
        animationOut: animationInFromProps!,
      }),
    [animationInFromProps, animationOutFromProps],
  );

  const contentRef = useRef<animatable.View>(null);
  const backdropRef = useRef<animatable.View>(null);
  const isTransitioning = useRef(false);
  const interactionHandle = useRef<number | null>(null);
  const onBackButtonPress = useCallback(() => {
    if (onBackButtonPressFromProps && isVisible) {
      onBackButtonPressFromProps();
      return true;
    }
    return false;
  }, [onBackButtonPressFromProps, isVisible]);

  const {panResponder, pan} = usePanResponder(mergedProps, {
    backdropRef,
  });

  const open = useCallback(() => {
    if (isTransitioning.current) {
      return;
    }
    isTransitioning.current = true;

    backdropRef.current?.transitionTo(
      {opacity: backdropOpacity},
      backdropTransitionInTiming,
    );

    if (isSwipeable) {
      pan.setValue({x: 0, y: 0});
    }

    if (contentRef.current) {
      onModalWillShow && onModalWillShow();
      if (interactionHandle.current === null) {
        interactionHandle.current =
          InteractionManager.createInteractionHandle();
      }
      contentRef.current.animate(animationIn, animationInTiming).then(() => {
        isTransitioning.current = false;
        if (interactionHandle.current) {
          InteractionManager.clearInteractionHandle(interactionHandle.current);
          interactionHandle.current = null;
        }
        onModalShow();
      });
    }
  }, [
    animationIn,
    animationInTiming,
    backdropOpacity,
    backdropTransitionInTiming,
    isSwipeable,
    isVisible,
    onModalShow,
    onModalWillShow,
    pan,
  ]);

  const close = useCallback(() => {
    if (isTransitioning.current) {
      return;
    }
    isTransitioning.current = true;

    backdropRef.current?.transitionTo(
      {opacity: 0},
      backdropTransitionOutTiming,
    );

    if (contentRef.current) {
      onModalWillHide();
      if (interactionHandle.current === null) {
        interactionHandle.current =
          InteractionManager.createInteractionHandle();
      }
      contentRef.current.animate(animationOut, animationOutTiming).then(() => {
        isTransitioning.current = false;
        if (interactionHandle.current) {
          InteractionManager.clearInteractionHandle(interactionHandle.current);
          interactionHandle.current = null;
        }
        setIsVisible(false);
        setShowContent(false);
        onModalHide();
      });
    }
  }, [
    animationOut,
    animationOutTiming,
    backdropTransitionOutTiming,
    isVisible,
    onModalHide,
    onModalWillHide,
  ]);

  useEffect(
    function componentDidMount() {
      BackHandler.addEventListener('hardwareBackPress', onBackButtonPress);
      return function componentWillUnmount() {
        BackHandler.removeEventListener('hardwareBackPress', onBackButtonPress);
        if (interactionHandle.current) {
          InteractionManager.clearInteractionHandle(interactionHandle.current);
          interactionHandle.current = null;
        }
      };
    },
    [open, onBackButtonPress],
  );

  useEffect(
    function () {
      if (backdropRef.current) {
        backdropRef.current.transitionTo(
          {opacity: backdropOpacity},
          backdropTransitionInTiming,
        );
      }
    },
    [backdropOpacity, backdropTransitionInTiming],
  );

  useEffect(
    function getDerivedStateFromProps() {
      if (isVisible !== propIsVisible) {
        setIsVisible(propIsVisible);
        setShowContent(propIsVisible);
        if (propIsVisible && !isVisible) {
          open();
        } else if (!isVisible && isVisible) {
          close();
        }
      }
    },
    [propIsVisible, open, close, isVisible],
  );

  const panHandlers = isSwipeable ? panResponder.panHandlers : {};
  const panPosition = useNativeDriver
    ? {
        transform: pan.getTranslateTransform(),
      }
    : pan.getLayout();

  const containerView = (
    <animatable.View
      {...panHandlers}
      ref={contentRef}
      style={[
        panPosition,
        {margin: deviceWidth * 0.05, transform: [{translateY: 0}]},
        styles.content,
        style,
      ]}
      pointerEvents="box-none"
      useNativeDriver={useNativeDriver}
      {...containerProps}
    >
      {hideModalContentWhileAnimating && useNativeDriver && !showContent ? (
        <animatable.View />
      ) : (
        children
      )}
    </animatable.View>
  );

  return (
    <>
      <Backdrop {...mergedProps} showContent={showContent} ref={backdropRef} />
      {!coverScreen && avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={[styles.content, style, {margin: 0}]}
        >
          {containerView}
        </KeyboardAvoidingView>
      ) : (
        containerView
      )}
    </>
  );
}

export default ReactNativeModalContainer;
