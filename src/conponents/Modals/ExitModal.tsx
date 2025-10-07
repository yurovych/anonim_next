import React from 'react';
import styles from './modalsStyles.module.css'
import {MODALS} from "@/types/generalTypes";

interface ExitModalProps {
    setModal: (value: MODALS) => void;
    confirm: () => void;
}

const ExitModal: React.FC<ExitModalProps> = ({setModal, confirm}) => {
    return (
        <div className={styles.wrapper}>
            <div className={styles.content}>
                <p className={styles.text}>Дійсно бажаєте завершити?</p>
                <div className={styles.buttonsContainer}>
                    <p className={styles.generalButton} onClick={() => setModal(MODALS.MODAL_OFF)}>Ні</p>
                    <p className={styles.generalButton} onClick={confirm}>Так</p>
                </div>
            </div>
        </div>
    )
}

export default ExitModal;