import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  InterlocutorData,
  Message,
  MODALS,
  Participant,
  UserData,
} from '@/types/generalTypes';

const useSocketInit = (
  userId: string,
  userData: UserData,
  interlocutorData: InterlocutorData,
  setIsChatOpen: (isChatOpen: boolean) => void,
  isTypingObj: { isTyping: boolean; uId: string },
  setIsTypingObj: (isTypingObj: { isTyping: boolean; uId: string }) => void,
  setModal: (modal: MODALS) => void,
  setTheOneWhoLeft: (theOneWhoLeft: string) => void
) => {
  const statusType = {
    waiting: `Очікуємо...`,
    connected: `З'єднано!`,
    reconnected: `З'єднання відновлено!`,
    reconnectingProcess: 'Перепідключення',
    disconnected: `Немає зв'язку зі ${
      interlocutorData.sex === 'male' ? 'співрозмовником' : 'співрозмовницею'
    }`,
  };

  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<string>(statusType.disconnected);
  const [reason, setReason] = useState<{
    reason: string;
    userId: string;
  } | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [peopleInChat, setPeopleInChat] = useState<number>(0);
  const [receivedMessage, setReceivedMessage] = useState<Message | null>(null);
  const [haveActiveChat, setHaveActiveChat] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<{
    usersCount: number;
    waitingCount: number;
    allUsers: Record<string, Participant>;
  } | null>(null);

  useEffect(() => {
    let wasConnectedBefore = false;
    let localChatId = '';
    let isReconnected = false;
    let isDisconnected = false;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL, {
      reconnection: true,
      reconnectionAttempts: 30,
      timeout: 5000,
      reconnectionDelay: 2000,
      query: { userId: userId },
      transports: ['websocket'],
      transportOptions: {
        websocket: {
          pingInterval: 10000,
          pingTimeout: 10000,
        },
      },
    });

    socketInstance.on('connect', () => {
      setSocket(socketInstance);

      if (!wasConnectedBefore) {
        socketInstance.emit('find-chat', {
          uId: userId,
          userData,
          interlocutorData,
        });
      } else {
        isReconnected = false;
        setStatus(statusType.reconnectingProcess);
        reconnectTimeout = setTimeout(() => {
          socketInstance.emit('reconnect-to-chat', {
            chatId: localChatId,
            uId: userId,
            userData,
            interlocutorData,
          });
        }, 11000);
      }
    });

    socketInstance.on('reconnected', () => {
      setStatus(statusType.reconnected);
      setReason(null);
      if (!isDisconnected) {
        isReconnected = true;
      }
      if (isDisconnected) {
        isDisconnected = false;
      }
    });

    socketInstance.on('disconnect', () => {
      if (isReconnected) {
        isReconnected = false;
      } else {
        isDisconnected = true;
        setSocket(null);
        setStatus(statusType.disconnected);
      }
    });

    socketInstance.on(
      'disconnect_reason',
      (message: { reason: string; userId: string }) => {
        if (isReconnected) {
          isReconnected = false;
        } else {
          isDisconnected = true;
          setStatus(statusType.disconnected);
        }
        setReason(message);
      }
    );

    socketInstance.on('waiting-for-match', () => {
      setStatus(statusType.waiting);
    });

    socketInstance.on('chat-created', ({ chatId, seekerId, matchId }) => {
      wasConnectedBefore = true;
      localChatId = chatId;
      setChatId(chatId);
      setMatchId(userId === seekerId ? matchId : seekerId);
      setStatus(statusType.connected);
    });

    socketInstance.on('room-size', ({ usersInRoom }) => {
      setPeopleInChat(usersInRoom);
      if (usersInRoom > 2) {
        setIsChatOpen(false);
      }
    });

    socketInstance.on('user-typing', (message: any) => {
      setIsTypingObj(message);
    });

    socketInstance.on('receive-message', (message: Message) => {
      setReceivedMessage(message);
      setIsTypingObj({
        ...isTypingObj,
        isTyping: false,
      });
    });

    socketInstance.on('have-active-chat', () => {
      setHaveActiveChat(true);
    });

    socketInstance.on(
      'metrics',
      (message: {
        usersCount: number;
        waitingCount: number;
        allUsers: Record<string, Participant>;
      }) => {
        setMetrics(message);
      }
    );
    socketInstance.on('chat-left', (message: { uId: string }) => {
      setTheOneWhoLeft(message.uId);
      setChatId(null);
      localChatId = '';
      wasConnectedBefore = false;
      setStatus(statusType.disconnected);
      setModal(MODALS.MODAL_OFF);
    });

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      socketInstance.disconnect();
    };
  }, []);
  return {
    socket,
    status,
    reason,
    chatId,
    matchId,
    peopleInChat,
    receivedMessage,
    haveActiveChat,
    metrics,
    statusType,
    setMatchId,
    setReason,
  };
};

export default useSocketInit;
