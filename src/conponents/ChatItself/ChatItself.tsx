'use client'

import {
    useEffect, useRef, useState
} from 'react';
import styles from './chatItselfStyles.module.css';
import {InterlocutorData, UserData} from "@/conponents/MainElement/MainElement";
import {format} from 'date-fns';
import {io, Socket} from "socket.io-client";
import debounce from 'lodash.debounce';
import ExitModal from "@/conponents/Modals/ExitModal";
import AddToBlackListModal from "@/conponents/Modals/AddToBlackListModal";
import CleanBlackListModal from "@/conponents/Modals/CleanBlackListModal";

interface ChatItselfProps {
    userData: UserData;
    interlocutorData: InterlocutorData;
    setUserData: (userData: UserData) => void;
    setInterlocutorData: (interlocutorData: InterlocutorData) => void;
    setIsChatOpen: (isChatOpen: boolean) => void;
    userId: string;
}

interface Message {
    uId: string;
    message: string;
    createdAt: number;
    pending: boolean;
}

export enum MODALS {
    MODAL_OFF = 'MODAL_OFF',
    IS_EXIT = 'IS_EXIT',
    IS_BLACKLIST = 'IS_BLACKLIST',
    IS_CLEAN_BLACKLIST = 'IS_CLEAN_BLACKLIST',
}

const ChatItself: React.FC<ChatItselfProps> = ({
                                                   userData,
                                                   interlocutorData,
                                                   setUserData,
                                                   setInterlocutorData,
                                                   setIsChatOpen,
                                                   userId
                                               }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [newMessage, setNewMessage] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTypingObj, setIsTypingObj] = useState<{ isTyping: boolean, uId: string }>({isTyping: false, uId: ''});
    const [receivedMessage, setReceivedMessage] = useState<Message | null>(null)
    const [status, setStatus] = useState<string>('');
    const [chatId, setChatId] = useState<string | null>(null);
    const [theOneWhoLeft, setTheOneWhoLeft] = useState<string>('');
    const [modal, setModal] = useState<MODALS>(MODALS.MODAL_OFF);
    const [matchId, setMatchId] = useState<string | null>(null);
    const typingRef = useRef<any>(null);
    const historyRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (typingRef.current) {
            clearTimeout(typingRef.current)
        }

        if (isTypingObj.isTyping) {
            typingRef.current = setTimeout(() => {
                setIsTypingObj({...isTypingObj, isTyping: false});
            }, 1000);
        }

        return () => {
            if (typingRef.current) {
                clearTimeout(typingRef.current)
            }
        }
    }, [isTypingObj])

    useEffect(() => {
        if (receivedMessage && receivedMessage?.uId !== userId) {
            setMessages((prevMessages) => [...prevMessages, receivedMessage])
        } else if (receivedMessage && receivedMessage?.uId === userId) {
            setMessages((prevMessages) => {
                return prevMessages.map(item => item.message === receivedMessage?.message && item.createdAt === receivedMessage?.createdAt ? receivedMessage : item)
            })
        }
    }, [receivedMessage]);


    useEffect(() => {
        const socketInstance = io("http://localhost:3001");
        // setSocket(socketInstance);

        socketInstance.on("connect", () => {
            setSocket(socketInstance);
            socketInstance.emit("find-chat", {
                uId: userId,
                userData,
                interlocutorData
            });
        });

        socketInstance.on("disconnect", (reason) => {
            setSocket(null);
        });


        socketInstance.on("chat-created", ({chatId, seekerId, matchId}) => {
            console.log(`Чат створено: ${chatId} з користувачем ${matchId}`);
            setChatId(chatId)
            setMatchId(userId === seekerId ? matchId : seekerId);
        });

        socketInstance.on("waiting-for-match", () => {
            setStatus(`Очікуємо ${interlocutorData.sex === 'male' ? 'співрозмовника' : 'співрозмовницю'} від ${interlocutorData.ageFrom} до ${interlocutorData.ageTo} ${interlocutorData.ageTo?.toString().at(-1) === '1' ? 'року' : 'років'}...`);
        });

        socketInstance.on("room-size", ({usersInRoom}) => {
            console.log(usersInRoom, 'usersInRoom')
            if (usersInRoom === 1) {
                setStatus(`Очікуємо ${interlocutorData.sex === 'male' ? 'співрозмовника' : 'співрозмовницю'} від ${interlocutorData.ageFrom} до ${interlocutorData.ageTo} ${interlocutorData.ageTo?.toString().at(-1) === '1' ? 'року' : 'років'}...`);
            } else {
                setStatus("З'єднано!");
            }
        });


        socketInstance.on("receive-message", (message: Message) => {
            setReceivedMessage(message)
            setIsTypingObj({
                ...isTypingObj,
                isTyping: false,
            })
        });
        socketInstance.on("user-typing", (message: any) => {
            setIsTypingObj(message);
        });

        socketInstance.on("chat-ended", (message: { uId: string }) => {
            setTheOneWhoLeft(message.uId)
        });

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    const handleIsTyping = debounce(() => {
        if (socket) {
            socket.emit("is-typing", {
                uId: userId,
                isTyping: true,
                chatId: chatId,
            });
        }
    }, 300)

    const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewMessage(event.target.value);
        handleIsTyping();
    };

    const handleSubmit = () => {
        if (!newMessage || !chatId) return
        const createdAt = new Date().getTime();

        setMessages((prev) => [...prev, {
            uId: userId,
            message: newMessage,
            createdAt: createdAt,
            pending: true,
        }])

        if (socket && newMessage.trim()) {
            socket.emit("send-message", {
                uId: userId,
                message: newMessage,
                createdAt: createdAt,
                pending: true,
                chatId: chatId,
                userData,
                interlocutorData
            });
            setNewMessage('')
        }

    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSubmit();
        }
    };


    const confirmLeaveChat = () => {
        if (socket) {
            socket.emit("leave-chat", {
                uId: userId,
                chatId: chatId,
            });
            setTheOneWhoLeft(userId)
            setModal(MODALS.MODAL_OFF);
        }
    }

    const confirmAddToBlackList = () => {
        if (matchId) {
            const newUserData = {
                ...userData,
                blackList: [
                    ...userData.blackList,
                    matchId
                ]
            }
            setUserData(newUserData)
            localStorage.setItem('userData', JSON.stringify(newUserData))
            setModal(MODALS.MODAL_OFF);
        }
    }

    const confirmCleanBlackList = () => {
        const newUserData = {
            ...userData,
            blackList: []
        }
        setUserData(newUserData)
        localStorage.setItem('userData', JSON.stringify(newUserData))
        confirmLeaveChat()
    }

    const handleGoHome = () => {
        if (theOneWhoLeft === userId) {
            setIsChatOpen(false)
        } else {
            if (socket) {
                socket.emit("leave-chat", {
                    uId: userId,
                    chatId: chatId,
                });
                setIsChatOpen(false)
            }
            setChatId(null)
            setMatchId(null)
        }
    }

    const handleNewChat = () => {
        setTheOneWhoLeft('');
        setMessages([]);
        setChatId(null)
        setMatchId(null)
        if (socket) {
            socket.emit("find-chat", {
                uId: userId,
                userData,
                interlocutorData
            });
        }
    }


    useEffect(() => {
        if (historyRef.current) {
            historyRef.current.scrollTop = historyRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <>
            {modal === MODALS.IS_EXIT ? <ExitModal setModal={setModal} confirm={confirmLeaveChat}/> : ''}
            {modal === MODALS.IS_BLACKLIST ?
                <AddToBlackListModal setModal={setModal}
                                     confirm={confirmAddToBlackList}/> : ''}
            {modal === MODALS.IS_CLEAN_BLACKLIST ?
                <CleanBlackListModal setModal={setModal} confirm={confirmCleanBlackList}/> : ''}

            <div className={styles.chart}>
                {socket?.connected ? (
                    <>
                        <div className={styles.chartHistoryWrapper}>
                            {!theOneWhoLeft ? (
                                <>
                                    <div className={styles.summarySection}>
                                        <div className={styles.summaryButtons}>
                                            {userData.blackList.length > 0 ? (
                                                <p className={`${styles.generalButton} ${styles.cleanBlacklistButton}`}
                                                   onClick={() => setModal(MODALS.IS_CLEAN_BLACKLIST)}
                                                >
                                                    Очистити ЧС
                                                </p>
                                            ) : ''}

                                            <p className={`${styles.generalButton} ${styles.buttonExit}`}
                                               onClick={() => setModal(MODALS.IS_EXIT)}
                                            >
                                                Вийти
                                            </p>
                                        </div>

                                    </div>
                                </>

                            ) : ''}
                            <div className={styles.chartHistory} ref={historyRef}>
                                {messages.map((item, index) => (
                                    <div
                                        className={
                                            `${userId === item.uId
                                                ? styles.myChartElement
                                                : styles.anonymChartElement} ${styles.chartElement}`
                                        }
                                        key={item.createdAt + item.message + index}
                                    >
                                        <p className={styles.messageText}>{item.message}</p>
                                        <p className={styles.messageTime}>
                                            {item.pending
                                                ? 'Надсилання...'
                                                : format(new Date(item.createdAt), 'HH:mm')
                                            }
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {theOneWhoLeft && theOneWhoLeft !== userId ? (
                            <div className={styles.leftChatBlock}>
                                <p className={styles.leftChatText}>
                                    Нажаль співрозмовник покинув чат
                                </p>
                                <div className={styles.endChatButtons}>
                                    <p onClick={handleNewChat}
                                       className={`${styles.generalButton} ${styles.chatEndButton}`}>
                                        Новий пошук
                                    </p>
                                    <p onClick={handleGoHome}
                                       className={`${styles.generalButton} ${styles.chatEndButton}`}>
                                        На головну
                                    </p>
                                </div>
                                {chatId && matchId ? (
                                        <p
                                            onClick={userData.blackList.includes(matchId) ? () => {
                                            } : () => setModal(MODALS.IS_BLACKLIST)}
                                            className={`${styles.generalButton} ${styles.buttonAddToBlackList}`}
                                        >
                                            {userData.blackList.includes(matchId) ? 'Користувач в чорному списку' : 'Додати в чорний список'}
                                        </p>
                                    )
                                    : ''
                                }
                            </div>
                        ) : ''}

                        {theOneWhoLeft && theOneWhoLeft === userId ? (
                            <div className={styles.leftChatBlock}>
                                <p className={styles.leftChatText}>
                                    Ви покинули чат
                                </p>
                                <div className={styles.endChatButtons}>
                                    <p onClick={handleNewChat} className={styles.generalButton}>
                                        Новий пошук
                                    </p>
                                    <p onClick={handleGoHome} className={styles.generalButton}>
                                        На головну
                                    </p>
                                </div>
                                {chatId && matchId ? (
                                        <p
                                            onClick={userData.blackList.includes(matchId) ? () => {
                                                }
                                                : () => setModal(MODALS.IS_BLACKLIST)}
                                            className={`${styles.generalButton} ${styles.buttonAddToBlackList}`}
                                        >
                                            {userData.blackList.includes(matchId) ? 'Користувач в чорному списку' : 'Додати в чорний список'}
                                        </p>
                                    )
                                    : ''
                                }
                            </div>
                        ) : ''}

                        {isTypingObj.isTyping && isTypingObj.uId !== userId && socket.connected
                            ? <p className={styles.isTyping}>
                                Щось тобі пишe... 🖊️
                            </p>
                            : ''
                        }
                        {status && messages.length === 0 && !isTypingObj.isTyping && !theOneWhoLeft && socket.connected
                            ? <p className={styles.isTyping}>
                                {status}
                            </p> : ''
                        }
                    </>
                ) : (
                    <div className={styles.connectionStatus}>
                        <p className={styles.connectionText}>Підключення до сервера...</p>
                        <p className={styles.connectionIcon}>🔌</p>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        <p>🖥️</p>
                    </div>)}

                <form
                    onSubmit={handleSubmit}
                    className={styles.form}
                >
                <textarea
                    onKeyDown={handleKeyDown}
                    value={newMessage}
                    onInput={handleInput}
                    rows={1}
                    placeholder="Повідомлення..."
                    className={styles.textarea}
                    maxLength={200}
                    disabled={!!theOneWhoLeft || !socket?.connected}
                />
                    <button disabled={!chatId || !newMessage || !!theOneWhoLeft || !socket?.connected}
                            className={`${!chatId || !newMessage || !!theOneWhoLeft ? styles.disabledButton : ''} ${styles.sendButton}`}
                            type={'button'}
                            onClick={handleSubmit}>
                        Надіслати
                    </button>
                </form>
            </div>
        </>

    )
}

export default ChatItself;