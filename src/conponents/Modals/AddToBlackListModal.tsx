import React from 'react';
import styles from './modalsStyles.module.css'
import {MODALS} from "@/types/generalTypes";

interface AddToBlackListModalProps {
    setModal: (value: MODALS) => void;
    confirm: () => void;
}

const AddToBlackListModal: React.FC<AddToBlackListModalProps> = ({setModal, confirm}) => {
    return (
        <div className={styles.wrapper}>
            <div className={styles.content}>
                <p className={styles.text}>Додати в чорний список?</p>
                <div className={styles.buttonsContainer}>
                    <p className={styles.generalButton} onClick={() => setModal(MODALS.MODAL_OFF)}>Ні</p>
                    <p className={styles.generalButton} onClick={confirm}>Так</p>
                </div>
            </div>
        </div>
    )
}

export default AddToBlackListModal;