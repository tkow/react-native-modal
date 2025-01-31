import React from 'react';

import Modal from '@tkow/react-native-modal';
import ModalBaseScene from '../utils/ModalBaseScene';
import DefaultModalContent from '../utils/DefaultModalContent';

class SwipeableModal extends ModalBaseScene {
  renderModal(): React.ReactElement<any> {
    return (
      <Modal
        testID={'modal'}
        isVisible={this.isVisible()}
        onSwipeComplete={this.close}
        useNativeDriverForBackdrop
        swipeDirection={['down']}>
        <DefaultModalContent onPress={this.close} />
      </Modal>
    );
  }
}

export default SwipeableModal;
