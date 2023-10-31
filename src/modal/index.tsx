import * as React from 'react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  BackHandler,
  InteractionManager,
  KeyboardAvoidingView,
  Modal,
  PanResponderGestureState,
  Platform,
  StyleProp,
  TouchableWithoutFeedback,
  View,
  ViewProps,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import * as animatable from 'react-native-animatable';
import {Animation, CustomAnimation} from 'react-native-animatable';

import {
  Direction,
  GestureResponderEvent,
  OnOrientationChange,
  OrNull,
  Orientation,
  PresentationStyle,
} from '../types';
import {buildAnimations, initializeAnimations} from '../utils';
import {usePanResponder} from './hooks';
import styles from './modal.style';

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

const defaultProps = {
  animationIn: 'slideInUp' as Animation | CustomAnimation,
  animationInTiming: 300,
  animationOut: 'slideOutDown' as Animation | CustomAnimation,
  animationOutTiming: 300,
  avoidKeyboard: false,
  coverScreen: true,
  hasBackdrop: true,
  backdropColor: 'black',
  backdropOpacity: 0.7,
  backdropTransitionInTiming: 300,
  backdropTransitionOutTiming: 300,
  customBackdrop: null as React.ReactNode,
  useNativeDriver: false,
  deviceHeight: null as OrNull<number>,
  deviceWidth: null as OrNull<number>,
  hideModalContentWhileAnimating: false,
  propagateSwipe: false as
    | boolean
    | ((
        event: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => boolean),
  isVisible: false,
  panResponderThreshold: 4,
  swipeThreshold: 100,

  onModalShow: (() => null) as () => void,
  onModalWillShow: (() => null) as () => void,
  onModalHide: (() => null) as () => void,
  onModalWillHide: (() => null) as () => void,
  onBackdropPress: (() => null) as () => void,
  onBackButtonPress: (() => null) as () => boolean | null | undefined,
  scrollTo: null as OrNull<(_e: any) => void>,
  scrollOffset: 0,
  scrollOffsetMax: 0,
  scrollHorizontal: false,
  statusBarTranslucent: false,
  supportedOrientations: ['portrait', 'landscape'] as Orientation[],
};

export type ModalProps = ViewProps & {
  children: React.ReactNode;
  onSwipeStart?: (gestureState: PanResponderGestureState) => void;
  onSwipeMove?: (
    percentageShown: number,
    gestureState: PanResponderGestureState,
  ) => void;
  onSwipeComplete?: (
    params: OnSwipeCompleteParams,
    gestureState: PanResponderGestureState,
  ) => void;
  onSwipeCancel?: (gestureState: PanResponderGestureState) => void;
  style?: StyleProp<ViewStyle>;
  swipeDirection?: Direction | Array<Direction>;
  onDismiss?: () => void;
  onShow?: () => void;
  hardwareAccelerated?: boolean;
  onOrientationChange?: OnOrientationChange;
  presentationStyle?: PresentationStyle;

  // Default ModalProps Provided
  useNativeDriverForBackdrop?: boolean;
} & typeof defaultProps;

function ReactNativeModal(props: ModalProps) {
  const {height: windowDeviceHeight, width: windowDeviceWidth} =
    useWindowDimensions();

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
    // propagateSwipe,
    style,
    deviceWidth = windowDeviceWidth,
    deviceHeight = windowDeviceHeight,
    swipeDirection,
    useNativeDriverForBackdrop,
    onBackdropPress,
    hideModalContentWhileAnimating,
    onModalWillShow,
    onModalHide,
    onModalWillHide,
    ...otherProps
  } = props;

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
        animationIn: animationOutFromProps,
        animationOut: animationInFromProps,
      }),
    [animationInFromProps, animationOutFromProps],
  );

  const contentRef = useRef<any>(null);
  const backdropRef = useRef<any>(null);
  const isTransitioning = useRef(false);
  const interactionHandle = useRef<number | null>(null);
  const onBackButtonPress = useCallback(() => {
    if (onBackButtonPressFromProps && isVisible) {
      onBackButtonPressFromProps();
      return true;
    }
    return false;
  }, [onBackButtonPressFromProps, isVisible]);

  const {panResponder, pan} = usePanResponder(props as any, {
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
        setIsVisible(isVisible);
        setShowContent(isVisible);
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
    {margin: windowDeviceWidth * 0.05, transform: [{translateY: 0}]},
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
