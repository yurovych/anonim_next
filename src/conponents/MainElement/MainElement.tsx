'use client';

import ChatItself from '@/conponents/ChatItself/ChatItself';
import JoinForm from '@/conponents/JoinForm';
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { InterlocutorData, MODALS, UserData } from '@/types/generalTypes';

const MainElement = () => {
  const [userId, setUserId] = useState<string>('');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [modal, setModal] = useState<MODALS>(MODALS.MODAL_OFF);
  const [userData, setUserData] = useState<UserData>({
    age: null,
    sex: '',
    blackList: [],
  });

  const [interlocutorData, setInterlocutorData] = useState<InterlocutorData>({
    ageFrom: null,
    ageTo: null,
    sex: '',
  });

  useEffect(() => {
    const userData: string | null = localStorage.getItem('userData');
    const interlocutorData: string | null =
      localStorage.getItem('interlocutorData');
    const storedUserId: string | null = localStorage.getItem('userId');

    if (interlocutorData) {
      setInterlocutorData(JSON.parse(interlocutorData));
    }
    if (userData) {
      setUserData(JSON.parse(userData));
    }

    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const id = uuidv4();
      setUserId(id);
      localStorage.setItem('userId', id);
    }
  }, []);

  return (
    <>
      {isChatOpen ? (
        <ChatItself
          userData={userData}
          interlocutorData={interlocutorData}
          setUserData={setUserData}
          setIsChatOpen={setIsChatOpen}
          userId={userId}
          modal={modal}
          setModal={setModal}
        />
      ) : (
        <JoinForm
          userData={userData}
          interlocutorData={interlocutorData}
          setUserData={setUserData}
          setInterlocutorData={setInterlocutorData}
          setIsChatOpen={setIsChatOpen}
          modal={modal}
          setModal={setModal}
        />
      )}
    </>
  );
};

export default MainElement;
