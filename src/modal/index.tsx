import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  BackHandler,
  InteractionManager,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import * as animatable from 'react-native-animatable';
import {ModalProps, defaultProps} from './types';

import {buildAnimations, initializeAnimations} from '../utils';
import {usePanResponder} from './hooks';
import styles from './modal.style';
import {Direction} from './types';

// Override default react-native-animatable animations
initializeAnimations();

export type OnSwipeCompleteParams = {
  swipingDirection: Direction;
};

type State = {
  showContent: boolean;
  isVisible: boolean;
  isSwipeable: boolean;
};

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

  const containerProps = otherProps;

  const [isSwipeable, _setIsSwipable] = useState<State['isSwipeable']>(
    !!swipeDirection,
  );

  const [isVisible, setIsVisible] = useState<State['isVisible']>(propIsVisible);
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

  const contentRef = useRef<any>(null);
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

  let close = null as any;
  const open = useCallback(() => {
    if (isTransitioning.current) {
      return;
    }
    isTransitioning.current = true;
    if (backdropRef.current) {
      backdropRef.current?.transitionTo(
        {opacity: backdropOpacity},
        backdropTransitionInTiming,
      );
    }

    // This is for resetting the pan position,otherwise the modal gets stuck
    // at the last released position when you try to open it.
    // TODO: Could certainly be improved - no idea for the moment.
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
        if (!isVisible) {
          close();
        } else {
          onModalShow();
        }
      });
    }
  }, [
    animationIn,
    animationInTiming,
    backdropOpacity,
    backdropTransitionInTiming,
    close,
    isSwipeable,
    isVisible,
    onModalShow,
    onModalWillShow,
    pan,
  ]);

  close = useCallback(() => {
    if (isTransitioning.current) {
      return;
    }
    isTransitioning.current = true;
    if (backdropRef.current) {
      backdropRef.current.transitionTo(
        {opacity: 0},
        backdropTransitionOutTiming,
      );
    }

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
        if (isVisible) {
          open();
        } else {
          setIsVisible(false);
          setShowContent(false);
          onModalHide();
        }
      });
    }
  }, [
    animationOut,
    animationOutTiming,
    backdropTransitionOutTiming,
    isVisible,
    onModalHide,
    onModalWillHide,
    open,
  ]);

  useEffect(
    function componentDidMount() {
      if (isVisible) {
        open();
      }
      BackHandler.addEventListener('hardwareBackPress', onBackButtonPress);
      return function componentWillUnmount() {
        BackHandler.removeEventListener('hardwareBackPress', onBackButtonPress);
        if (interactionHandle.current) {
          InteractionManager.clearInteractionHandle(interactionHandle.current);
          interactionHandle.current = null;
        }
      };
    },
    [open, onBackButtonPress, isVisible],
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

  const computedStyle = [
    {margin: deviceWidth * 0.05, transform: [{translateY: 0}]},
    styles.content,
    style,
  ];

  let panHandlers = {};
  let panPosition = {};
  if (isSwipeable) {
    panHandlers = {...panResponder!.panHandlers};

    if (useNativeDriver) {
      panPosition = {
        transform: pan!.getTranslateTransform(),
      };
    } else {
      panPosition = pan!.getLayout();
    }
  }

  // The user might decide not to show the modal while it is animating
  // to enhance performance.
  const _children =
    hideModalContentWhileAnimating && useNativeDriver && !showContent ? (
      <animatable.View />
    ) : (
      children
    );

  const containerView = (
    <animatable.View
      {...panHandlers}
      ref={contentRef}
      style={[panPosition, computedStyle]}
      pointerEvents="box-none"
      useNativeDriver={useNativeDriver}
      {...containerProps}
    >
      {_children}
    </animatable.View>
  );

  const makeBackdrop = () => {
    if (!hasBackdrop) {
      return null;
    }
    const hasCustomBackdrop = !!customBackdrop;

    if (hasCustomBackdrop && !React.isValidElement(customBackdrop)) {
      console.warn(
        'Invalid customBackdrop element passed to Modal. You must provide a valid React element.',
      );
    }

    const backdropComputedStyle = [
      {
        width: deviceWidth,
        height: deviceHeight,
        backgroundColor:
          showContent && !hasCustomBackdrop ? backdropColor : 'transparent',
      },
    ];

    const backdropWrapper = (
      <animatable.View
        ref={backdropRef}
        useNativeDriver={
          useNativeDriverForBackdrop !== undefined
            ? useNativeDriverForBackdrop
            : useNativeDriver
        }
        style={[styles.backdrop, backdropComputedStyle]}
      >
        {hasCustomBackdrop && customBackdrop}
      </animatable.View>
    );

    if (hasCustomBackdrop) {
      // The user will handle backdrop presses himself
      return backdropWrapper;
    }
    // If there's no custom backdrop, handle presses with
    // TouchableWithoutFeedback
    return (
      <TouchableWithoutFeedback onPress={onBackdropPress}>
        {backdropWrapper}
      </TouchableWithoutFeedback>
    );
  };

  // If coverScreen is set to false by the user
  // we render the modal inside the parent view directly
  if (!coverScreen && isVisible) {
    return (
      <View
        pointerEvents="box-none"
        style={[styles.backdrop, styles.containerBox]}
      >
        {makeBackdrop()}
        {containerView}
      </View>
    );
  }

  return (
    <Modal
      transparent={true}
      animationType={'none'}
      visible={isVisible}
      onRequestClose={onBackButtonPress}
      {...otherProps}
    >
      {makeBackdrop()}

      {avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={computedStyle.concat([{margin: 0}])}
        >
          {containerView}
        </KeyboardAvoidingView>
      ) : (
        containerView
      )}
    </Modal>
  );
}

export default ReactNativeModal;
