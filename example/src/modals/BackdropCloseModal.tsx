import React from 'react';

import Modal from '@tkow/react-native-modal';
import ModalBaseScene from '../utils/ModalBaseScene';
import DefaultModalContent from '../utils/DefaultModalContent';

class BackdropCloseModal extends ModalBaseScene {
  renderModal(): React.ReactElement<any> {
    return (
      <Modal
        testID={'modal'}
        isVisible={this.isVisible()}
        onBackdropPress={this.close}>
        <DefaultModalContent onPress={this.close} />
      </Modal>
    );
  }
}

export default BackdropCloseModal;
