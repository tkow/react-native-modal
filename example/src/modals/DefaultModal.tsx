import React from 'react';

import Modal from 'react-native-modal';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import ModalBaseScene, {useModalBaseScensState} from '../utils/ModalBase';
import DefaultModalContent from '../utils/DefaultModalContent';

function DefaultModal() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const {close, open, visible} = useModalBaseScensState();
  return (
    <ModalBaseScene onPress={open}>
      <Modal testID={'modal'} isVisible={visible}>
        <DefaultModalContent
          onPress={() => {
            navigation.push('CustomBackdropModal');
            close();
          }}
        />
      </Modal>
    </ModalBaseScene>
  );
}

export default DefaultModal;
