'use client';

import { useState } from 'react';
import styles from './joinFormStyles.module.css';
import { InterlocutorData, MODALS, UserData } from '@/types/generalTypes';
import CleanBlackListModal from '@/conponents/Modals/CleanBlackListModal';

interface JoinFormProps {
  userData: UserData;
  interlocutorData: InterlocutorData;
  setUserData: (userData: UserData) => void;
  setInterlocutorData: (interlocutorData: InterlocutorData) => void;
  setIsChatOpen: (isChatOpen: boolean) => void;
  modal: MODALS;
  setModal: (modal: MODALS) => void;
}

const JoinForm: React.FC<JoinFormProps> = ({
  userData,
  interlocutorData,
  setUserData,
  setInterlocutorData,
  setIsChatOpen,
  modal,
  setModal,
}) => {
  const [error, setError] = useState<string>('');

  const handleChangeUserAge = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    if (!value) {
      setUserData({
        ...userData,
        age: null,
      });
      return;
    }
    if (!/^\d*$/.test(value)) {
      return;
    }
    if (+value > 100) {
      setUserData({
        ...userData,
        age: 100,
      });
      return;
    }
    setUserData({
      ...userData,
      age: +value,
    });
    if (error) {
      setError('');
    }
  };

  const handleChangeAgeFrom = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    if (!value) {
      setInterlocutorData({
        ...interlocutorData,
        ageFrom: null,
      });
      return;
    }
    if (!/^\d*$/.test(value)) {
      return;
    }
    if (+value > 100) {
      setInterlocutorData({
        ...interlocutorData,
        ageFrom: 100,
      });
      return;
    }
    setInterlocutorData({
      ...interlocutorData,
      ageFrom: +value,
    });
    if (error) {
      setError('');
    }
  };

  const handleChangeAgeTo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    if (!value) {
      setInterlocutorData({
        ...interlocutorData,
        ageTo: null,
      });
      return;
    }
    if (!/^\d*$/.test(value)) {
      return;
    }
    if (+value > 100) {
      setInterlocutorData({
        ...interlocutorData,
        ageTo: 100,
      });
      return;
    }
    setInterlocutorData({
      ...interlocutorData,
      ageTo: +value,
    });
    if (error) {
      setError('');
    }
  };

  const handleChangeUserSex = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;

    if (value === '') {
      return;
    }

    setUserData({
      ...userData,
      sex: value,
    });
    if (error) {
      setError('');
    }
  };

  const handleChangeInterlocutorSex = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = event.target.value;

    if (value === '') {
      return;
    }
    setInterlocutorData({
      ...interlocutorData,
      sex: value,
    });
    if (error) {
      setError('');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !userData.age ||
      !userData.sex ||
      !interlocutorData.ageFrom ||
      !interlocutorData.ageTo ||
      !interlocutorData.sex
    ) {
      setError('Хм...щось не так, спробуй ще раз');
    } else if (interlocutorData.ageFrom < 16) {
      setError('Вкажіть вік від 16 до 100');
    } else if (userData.age < 16) {
      setError('Вікове обмеження - 16 років');
    } else if (interlocutorData.ageFrom > interlocutorData.ageTo) {
      setError('Хм...не коректно вказано віковий діапазон');
    } else {
      setError('');
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem(
        'interlocutorData',
        JSON.stringify(interlocutorData)
      );
      setIsChatOpen(true);
    }
  };

  const confirmCleanBlackList = () => {
    const newUserData = {
      ...userData,
      blackList: [],
    };
    setUserData(newUserData);
    localStorage.setItem('userData', JSON.stringify(newUserData));
    setModal(MODALS.MODAL_OFF);
  };

  return (
    <>
      {modal === MODALS.IS_CLEAN_BLACKLIST ? (
        <CleanBlackListModal
          setModal={setModal}
          confirm={confirmCleanBlackList}
        />
      ) : (
        ''
      )}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputsBlockWrapper}>
          <p className={styles.inputTitle}>Ваш вік та стать</p>
          <div className={styles.inputsBlock}>
            <input
              required
              placeholder={'Вік'}
              type="text"
              name="user-age"
              id="user-age"
              autoComplete="off"
              onChange={handleChangeUserAge}
              value={userData.age === null ? '' : userData.age}
              className={styles.input}
            />
            <select
              required
              className={styles.sexSelect}
              onChange={handleChangeUserSex}
              value={userData.sex}
            >
              <option value="" disabled>
                Cтать
              </option>
              <option value="male">Чоловік</option>
              <option value="female">Жінка</option>
            </select>
          </div>
        </div>

        <div className={styles.inputsBlockWrapper}>
          <p className={styles.inputTitle}>Вік та стать співрозмовника</p>
          <div className={styles.inputsBlock}>
            <input
              required
              placeholder={'від'}
              type="text"
              name="user-age"
              id="user-age"
              autoComplete="off"
              onChange={handleChangeAgeFrom}
              value={
                interlocutorData.ageFrom === null
                  ? ''
                  : interlocutorData.ageFrom
              }
              className={styles.input}
            />
            <input
              required
              placeholder={'до'}
              type="text"
              name="user-age"
              id="user-age"
              autoComplete="off"
              onChange={handleChangeAgeTo}
              value={
                interlocutorData.ageTo === null ? '' : interlocutorData.ageTo
              }
              className={styles.input}
            />
            <select
              required
              className={styles.sexSelect}
              onChange={handleChangeInterlocutorSex}
              value={interlocutorData.sex}
            >
              <option value="" disabled>
                Cтать
              </option>
              <option value="male">Чоловік</option>
              <option value="female">Жінка</option>
            </select>
          </div>
        </div>

        <div className={styles.policyWrapper}>
          <input
            className={styles.checkbox}
            id="policy_id"
            type={'checkbox'}
            name="policy_checkbox"
            required
          />

          <p className={styles.policyText}>
            <label className={styles.checkboxLabel} htmlFor={'policy_id'}>
              Прийняти
            </label>
            &nbsp;
            <a className={styles.policyLink} href={'/terms-and-conditions'}>
              політику та умови
            </a>
          </p>
        </div>

        <div className={styles.inputsBlockWrapper}>
          {error && <p className={styles.inputError}>{error}</p>}
          <div className={styles.buttonContainer}>
            <div className={styles.buttonGlow}></div>
            <button className={styles.submitButton} type={'submit'}>
              Розпочати
            </button>
          </div>
          <div className={styles.buttonContainer}>
            {userData.blackList.length > 0 ? (
              <p
                className={styles.cleanBlacklistButton}
                onClick={() => setModal(MODALS.IS_CLEAN_BLACKLIST)}
              >
                Очистити чорний список
              </p>
            ) : (
              ''
            )}
          </div>
        </div>
      </form>
    </>
  );
};

export default JoinForm;
