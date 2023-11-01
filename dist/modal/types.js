export const defaultProps = {
    animationIn: 'slideInUp',
    animationInTiming: 300,
    animationOut: 'slideOutDown',
    animationOutTiming: 300,
    avoidKeyboard: false,
    coverScreen: true,
    hasBackdrop: true,
    backdropColor: 'black',
    backdropOpacity: 0.7,
    backdropTransitionInTiming: 300,
    backdropTransitionOutTiming: 300,
    customBackdrop: null,
    useNativeDriver: false,
    hideModalContentWhileAnimating: false,
    propagateSwipe: false,
    isVisible: false,
    panResponderThreshold: 4,
    swipeThreshold: 100,
    onModalShow: () => null,
    onModalWillShow: () => null,
    onModalHide: () => null,
    onModalWillHide: () => null,
    onBackdropPress: () => null,
    onBackButtonPress: () => null,
    scrollOffset: 0,
    scrollOffsetMax: 0,
    scrollHorizontal: false,
    statusBarTranslucent: false,
    supportedOrientations: ['portrait', 'landscape'],
};