import * as React from 'react';
import { useState, useRef } from 'react';
import {
  Animated,
  DeviceEventEmitter,
  EmitterSubscription,
  InteractionManager,
  KeyboardAvoidingView,
  Modal,
  BackHandler,
  PanResponderGestureState,
  PanResponderInstance,
  Platform,
  StyleProp,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
  ViewProps,
  useWindowDimensions,
} from 'react-native';
import * as PropTypes from 'prop-types';
import * as animatable from 'react-native-animatable';
import {Animation, CustomAnimation} from 'react-native-animatable';

import {
  initializeAnimations,
  buildAnimations,
} from '../utils';
import styles from './modal.style';
import {
  Direction,
  Orientation,
  OrNull,
  AnimationEvent,
  PresentationStyle,
  OnOrientationChange,
  GestureResponderEvent,
} from '../types';
import { usePanResponder } from './hooks';

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
  onBackButtonPress: (() => null) as () => void,
  scrollTo: null as OrNull<(e: any) => void>,
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

const extractAnimationFromProps = (props: ModalProps) => ({
  animationIn: props.animationIn,
  animationOut: props.animationOut,
});

const propTypes = {
  animationIn: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  animationInTiming: PropTypes.number,
  animationOut: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  animationOutTiming: PropTypes.number,
  avoidKeyboard: PropTypes.bool,
  coverScreen: PropTypes.bool,
  hasBackdrop: PropTypes.bool,
  backdropColor: PropTypes.string,
  backdropOpacity: PropTypes.number,
  backdropTransitionInTiming: PropTypes.number,
  backdropTransitionOutTiming: PropTypes.number,
  customBackdrop: PropTypes.node,
  children: PropTypes.node.isRequired,
  deviceHeight: PropTypes.number,
  deviceWidth: PropTypes.number,
  isVisible: PropTypes.bool.isRequired,
  hideModalContentWhileAnimating: PropTypes.bool,
  propagateSwipe: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  onModalShow: PropTypes.func,
  onModalWillShow: PropTypes.func,
  onModalHide: PropTypes.func,
  onModalWillHide: PropTypes.func,
  onBackButtonPress: PropTypes.func,
  onBackdropPress: PropTypes.func,
  panResponderThreshold: PropTypes.number,
  onSwipeStart: PropTypes.func,
  onSwipeMove: PropTypes.func,
  onSwipeComplete: PropTypes.func,
  onSwipeCancel: PropTypes.func,
  swipeThreshold: PropTypes.number,
  swipeDirection: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.oneOf(['up', 'down', 'left', 'right'])),
    PropTypes.oneOf(['up', 'down', 'left', 'right']),
  ]),
  useNativeDriver: PropTypes.bool,
  useNativeDriverForBackdrop: PropTypes.bool,
  style: PropTypes.any,
  scrollTo: PropTypes.func,
  scrollOffset: PropTypes.number,
  scrollOffsetMax: PropTypes.number,
  scrollHorizontal: PropTypes.bool,
  supportedOrientations: PropTypes.arrayOf(
    PropTypes.oneOf([
      'portrait',
      'portrait-upside-down',
      'landscape',
      'landscape-left',
      'landscape-right',
    ]),
  ),
}

function ReactNativeModal(props: ModalProps) {
  const { height: windowDeviceHeight, width: windowDeviceWidth } = useWindowDimensions()

  const {
    animationIn,
    animationInTiming,
    animationOut,
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
    isVisible: propInVisible,
    onModalShow,
    onBackButtonPress,
    useNativeDriver,
    propagateSwipe,
    style,
    deviceWidth = windowDeviceWidth,
    deviceHeight = windowDeviceHeight,
    swipeDirection,
    useNativeDriverForBackdrop,
    onBackdropPress,
    hideModalContentWhileAnimating,
    ...otherProps
  } = props;

  const {testID, ...containerProps} = otherProps;
  const computedStyle = [
    {margin: windowDeviceWidth * 0.05, transform: [{translateY: 0}]},
    styles.content,
    style,
  ];

  const backdropRef = useRef(null)

  const {panResponder, pan} = usePanResponder(props, {
    backdropRef
  })

  const [isSwipeable, setIsSwipable] = useState<State['isSwipeable']>(!!swipeDirection)
  const [isVisible, setIsVisible] = useState<State['isVisible']>(propInVisible)
  const [showContent, setShowContent] = useState<State['showContent']>(propInVisible)

  const contentRef = useRef(null)

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
    hideModalContentWhileAnimating &&
    useNativeDriver &&
    !showContent ? (
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

    if (
      hasCustomBackdrop &&
      !React.isValidElement(customBackdrop)
    ) {
      console.warn(
        'Invalid customBackdrop element passed to Modal. You must provide a valid React element.',
      );
    }

    const backdropComputedStyle = [
      {
        width: deviceWidth,
        height: deviceHeight,
        backgroundColor:
          showContent && !hasCustomBackdrop
            ? backdropColor
            : 'transparent',
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

export class ReactNativeModal extends React.Component<ModalProps, State> {

  public static defaultProps = defaultProps;

  // We use an internal state for keeping track of the modal visibility: this allows us to keep
  // the modal visible during the exit animation, even if the user has already change the
  // isVisible prop to false.
  // We store in the state the device width and height so that we can update the modal on
  // device rotation.
  state: State = {
    showContent: true,
    isSwipeable: !!this.props.swipeDirection,
  };

  isTransitioning = false;
  animationIn: string;
  animationOut: string;
  backdropRef: any;
  contentRef: any;
  panResponder: OrNull<PanResponderInstance> = null;
  didUpdateDimensionsEmitter: OrNull<EmitterSubscription> = null;

  interactionHandle: OrNull<number> = null;

  constructor(props: ModalProps) {
    super(props);
    const {animationIn, animationOut} = buildAnimations(
      extractAnimationFromProps(props),
    );

    this.animationIn = animationIn;
    this.animationOut = animationOut;

    if (this.state.isSwipeable) {
      this.state = {
        ...this.state,
        pan: new Animated.ValueXY(),
      };
      this.buildPanResponder();
    }
    if (props.isVisible) {
      this.state = {
        ...this.state,
        isVisible: true,
        showContent: true,
      };
    }
  }

  static getDerivedStateFromProps(
    nextProps: Readonly<ModalProps>,
    state: State,
  ) {
    if (!state.isVisible && nextProps.isVisible) {
      return {isVisible: true, showContent: true};
    }
    return null;
  }

  componentDidMount() {
    // Show deprecation message
    if ((this.props as any).onSwipe) {
      console.warn(
        '`<Modal onSwipe="..." />` is deprecated and will be removed starting from 13.0.0. Use `<Modal onSwipeComplete="..." />` instead.',
      );
    }
    if (this.state.isVisible) {
      this.open();
    }
    BackHandler.addEventListener('hardwareBackPress', this.onBackButtonPress);
  }

  componentWillUnmount() {
    BackHandler.removeEventListener(
      'hardwareBackPress',
      this.onBackButtonPress,
    );
    if (this.didUpdateDimensionsEmitter) {
      this.didUpdateDimensionsEmitter.remove();
    }
    if (this.interactionHandle) {
      InteractionManager.clearInteractionHandle(this.interactionHandle);
      this.interactionHandle = null;
    }
  }

  componentDidUpdate(prevProps: ModalProps) {
    // If the animations have been changed then rebuild them to make sure we're
    // using the most up-to-date ones
    if (
      this.props.animationIn !== prevProps.animationIn ||
      this.props.animationOut !== prevProps.animationOut
    ) {
      const {animationIn, animationOut} = buildAnimations(
        extractAnimationFromProps(this.props),
      );
      this.animationIn = animationIn;
      this.animationOut = animationOut;
    }
    // If backdrop opacity has been changed then make sure to update it
    if (
      this.props.backdropOpacity !== prevProps.backdropOpacity &&
      this.backdropRef
    ) {
      this.backdropRef.transitionTo(
        {opacity: this.props.backdropOpacity},
        this.props.backdropTransitionInTiming,
      );
    }
    // On modal open request, we slide the view up and fade in the backdrop
    if (this.props.isVisible && !prevProps.isVisible) {
      this.open();
    } else if (!this.props.isVisible && prevProps.isVisible) {
      // On modal close request, we slide the view down and fade out the backdrop
      this.close();
    }
  }

  onBackButtonPress = () => {
    if (this.props.onBackButtonPress && this.props.isVisible) {
      this.props.onBackButtonPress();
      return true;
    }
    return false;
  };

  open = () => {
    if (this.isTransitioning) {
      return;
    }
    this.isTransitioning = true;
    if (this.backdropRef) {
      this.backdropRef.transitionTo(
        {opacity: this.props.backdropOpacity},
        this.props.backdropTransitionInTiming,
      );
    }

    // This is for resetting the pan position,otherwise the modal gets stuck
    // at the last released position when you try to open it.
    // TODO: Could certainly be improved - no idea for the moment.
    if (this.state.isSwipeable) {
      this.state.pan!.setValue({x: 0, y: 0});
    }

    if (this.contentRef) {
      this.props.onModalWillShow && this.props.onModalWillShow();
      if (this.interactionHandle == null) {
        this.interactionHandle = InteractionManager.createInteractionHandle();
      }
      this.contentRef
        .animate(this.animationIn, this.props.animationInTiming)
        .then(() => {
          this.isTransitioning = false;
          if (this.interactionHandle) {
            InteractionManager.clearInteractionHandle(this.interactionHandle);
            this.interactionHandle = null;
          }
          if (!this.props.isVisible) {
            this.close();
          } else {
            this.props.onModalShow();
          }
        });
    }
  };

  close = () => {
    if (this.isTransitioning) {
      return;
    }
    this.isTransitioning = true;
    if (this.backdropRef) {
      this.backdropRef.transitionTo(
        {opacity: 0},
        this.props.backdropTransitionOutTiming,
      );
    }

    let animationOut = this.animationOut;

    if (this.contentRef) {
      this.props.onModalWillHide && this.props.onModalWillHide();
      if (this.interactionHandle == null) {
        this.interactionHandle = InteractionManager.createInteractionHandle();
      }
      this.contentRef
        .animate(animationOut, this.props.animationOutTiming)
        .then(() => {
          this.isTransitioning = false;
          if (this.interactionHandle) {
            InteractionManager.clearInteractionHandle(this.interactionHandle);
            this.interactionHandle = null;
          }
          if (this.props.isVisible) {
            this.open();
          } else {
            this.setState(
              {
                showContent: false,
              },
              () => {
                this.setState(
                  {
                    isVisible: false,
                  },
                  () => {
                    this.props.onModalHide();
                  },
                );
              },
            );
          }
        });
    }
  };

}

export default ReactNativeModal;
