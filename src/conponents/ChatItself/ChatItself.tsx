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
import {Message, MODALS} from "@/types/generalTypes";

export interface ChatItselfProps {
    userData: UserData;
    interlocutorData: InterlocutorData;
    setUserData: (userData: UserData) => void;
    setIsChatOpen: (isChatOpen: boolean) => void;
    userId: string;
}

const ChatItself: React.FC<ChatItselfProps> = ({
                                                   userData,
                                                   interlocutorData,
                                                   setUserData,
                                                   setIsChatOpen,
                                                   userId,
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
    const [countdown, setCountdown] = useState<number>(60);
    const [matchId, setMatchId] = useState<string | null>(null);
    const [peopleInRoom, setPeopleInRoom] = useState<number>(0);

    const typingRef = useRef<any>(null);
    const historyRef = useRef<HTMLDivElement | null>(null);
    const intervalRef = useRef<any>(null);
    const inputRef = useRef<any>(null);

    const STATUS_WAITING = `Очікуємо ${interlocutorData.sex === 'male' ? 'співрозмовника' : 'співрозмовницю'} від ${interlocutorData.ageFrom} до ${interlocutorData.ageTo} ${interlocutorData.ageTo?.toString().at(-1) === '1' ? 'року' : 'років'}...`;
    const STATUS_CONNECTED = "З'єднано";

    useEffect(() => {
        if (countdown === 0) {
            setIsChatOpen(false)
        }
    }, [countdown]);

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
        const socketInstance = io(process.env.NEXT_PUBLIC_API_URL, {
            reconnection: true,
            reconnectionAttempts: 30,
            timeout: 5000,
            reconnectionDelay: 2000,
            query: {userId: userId},
            transports: ['websocket'],
            transportOptions: {
                websocket: {
                    pingInterval: 10000,
                    pingTimeout: 10000,
                },
            },

        });

        let wasConnectedBefore = false;
        let localChatId = '';


        socketInstance.on("connect", () => {
            setSocket(socketInstance);
            clearInterval(intervalRef.current)
            setCountdown(60)

            if (!wasConnectedBefore) {
                socketInstance.emit("find-chat", {
                    uId: userId,
                    userData,
                    interlocutorData,
                });
            } else {
                socketInstance.emit("reconnect-to-chat", {
                    chatId: localChatId,
                    uId: userId,
                    userData,
                    interlocutorData,
                });
            }
        });

        socketInstance.on("disconnect", () => {
            setSocket(null);
            clearInterval(intervalRef.current)

            if (countdown > 0) {
                intervalRef.current = setInterval(() => {
                    setCountdown((prev) => {
                        if (prev > 0) {
                            return prev - 1
                        } else {
                            clearInterval(intervalRef.current)
                            return 0
                        }
                    });
                }, 1000)
            }
        });


        socketInstance.on("chat-created", ({chatId, seekerId, matchId}) => {
            wasConnectedBefore = true;
            localChatId = chatId;
            setChatId(chatId);
            setMatchId(userId === seekerId ? matchId : seekerId);
            setStatus(STATUS_CONNECTED);
        });

        socketInstance.on("waiting-for-match", () => {
            setStatus(STATUS_WAITING);
        });

        socketInstance.on("room-size", ({usersInRoom}) => {
            console.log(usersInRoom, 'usersInRoom')
            setPeopleInRoom(usersInRoom);
            if (usersInRoom === 2) {
                setTheOneWhoLeft('')
            }
            if (usersInRoom > 2) {
                setIsChatOpen(false)
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

        socketInstance.on("chat-ended", () => {
            setStatus(STATUS_WAITING)
        });

        socketInstance.on("reconnected", () => {
            setStatus('')
        });

        socketInstance.on("chat-left", (message: { uId: string }) => {
            setTheOneWhoLeft(message.uId)
            setStatus('')
            setModal(MODALS.MODAL_OFF);
            setChatId(null)
            localChatId = ''
            wasConnectedBefore = false;
        });

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
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
        inputRef.current.focus();

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

    const handleExitOnDisconnect = () => {
        setIsChatOpen(false)
        setMatchId(null)
    }


    useEffect(() => {
        if (historyRef.current) {
            historyRef.current.scrollTop = historyRef.current.scrollHeight;
        }
    }, [messages]);

    const getAddToBlackListElement = () => {
        return (
            <>
                {matchId ? (
                        <p
                            onClick={userData.blackList.includes(matchId) ? () => {
                                }
                                : () => setModal(MODALS.IS_BLACKLIST)}
                            className={`${styles.generalButton} ${styles.buttonAddToBlackList}`}
                        >
                            {userData.blackList.includes(matchId)
                                ? 'Користувач в чорному списку'
                                : 'Додати в чорний список'
                            }
                        </p>
                    )
                    : ''
                }
            </>
        )
    }

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

                        {(!theOneWhoLeft && chatId && status && status === STATUS_WAITING) || (!theOneWhoLeft && chatId && peopleInRoom < 2) ? (
                            <div className={styles.leftChatBlock}>
                                <p className={styles.leftChatText}>
                                    Співрозмовник має проблеми з підключенням або покинув чат!
                                </p>
                                <div className={styles.endChatButtons}>
                                    <p onClick={handleGoHome}
                                       className={`${styles.generalButton} ${styles.chatEndButton}`}
                                    >
                                        На головну
                                    </p>
                                </div>
                                {getAddToBlackListElement()}
                            </div>
                        ) : ''}

                        {theOneWhoLeft ? (
                            <div className={styles.leftChatBlock}>
                                <p className={styles.leftChatText}>
                                    {theOneWhoLeft === userId ? 'Ви покинули чат!' : 'Нажаль співрозмовник покинув чат!'}
                                </p>
                                <div className={styles.endChatButtons}>
                                    <p onClick={handleNewChat}
                                       className={`${styles.generalButton} ${styles.chatEndButton}`}
                                    >
                                        Пошук
                                    </p>
                                    <p onClick={handleGoHome}
                                       className={`${styles.generalButton} ${styles.chatEndButton}`}
                                    >
                                        На головну
                                    </p>
                                </div>
                                {getAddToBlackListElement()}
                            </div>
                        ) : ''}

                        {isTypingObj.isTyping && isTypingObj.uId !== userId && socket.connected
                            ? <p className={styles.isTyping}>
                                Щось тобі пишe... 🖊️
                            </p>
                            : ''
                        }
                        {
                            status &&
                            messages.length === 0 &&
                            !isTypingObj.isTyping &&
                            !theOneWhoLeft &&
                            socket.connected &&
                            !(chatId && status === STATUS_WAITING)
                                ? <p className={styles.isTyping}>
                                    {status}
                                </p> : ''
                        }
                    </>
                ) : (
                    <div className={styles.connectionStatus}>
                        {chatId ? (<p className={styles.connectionText}>Втрата зв'язку, намагаюсь відновити...</p>) : (
                            <p className={styles.connectionText}>Схоже немає підключення...</p>)}

                        <div className={styles.connectionAnimation}>
                            <p className={styles.connectionIcon}>🔌</p>
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                            <p>🖥️</p>
                        </div>
                        {chatId ? <p className={styles.countdown}>{countdown} сек до відключення</p> : ''}
                        {chatId && countdown < 10 ? (
                            <p className={`${styles.dontLeaveText} `}>
                                Хм...схоже все погано. Напевно доведеться роз'єднати 😔
                            </p>
                        ) : ''}
                        {chatId && countdown >= 10 ? (
                            <p className={`${styles.dontLeaveText} `}>
                                Дай мені шанс, не залишай чат щоб не втратити співрозмовника.
                            </p>
                        ) : ''}
                        <p className={`${styles.generalButton} ${styles.buttonExit}`}
                           onClick={handleExitOnDisconnect}
                        >
                            Вийти
                        </p>
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
                    ref={inputRef}
                    placeholder="Повідомлення..."
                    className={styles.textarea}
                    maxLength={200}
                    disabled={!!theOneWhoLeft || !socket?.connected || (!!chatId && status === STATUS_WAITING)}
                />
                    <button
                        disabled={!chatId || !newMessage || !!theOneWhoLeft || !socket?.connected || (!!chatId && status === STATUS_WAITING)}
                        className={`${!chatId || !newMessage || !!theOneWhoLeft ? styles.disabledButton : ''} ${styles.sendButton}`}
                        type={'button'}
                        onClick={handleSubmit}
                    >
                        <img src="/icons/send_icon.svg" alt="send"/>
                    </button>
                </form>
            </div>
        </>

    )
}

export default ChatItself;