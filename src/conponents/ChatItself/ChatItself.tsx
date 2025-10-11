'use client'

import {
    useCallback,
    useEffect, useRef, useState
} from 'react';
import styles from './chatItselfStyles.module.css';
import {InterlocutorData, UserData} from "@/conponents/MainElement/MainElement";
import {format} from 'date-fns';
import {io, Socket} from "socket.io-client";
import debounce from 'lodash.debounce';
import ExitModal from "@/conponents/Modals/ExitModal";
import AddToBlackListModal from "@/conponents/Modals/AddToBlackListModal";
import {Message, MODALS} from "@/types/generalTypes";

export interface ChatItselfProps {
    userData: UserData;
    interlocutorData: InterlocutorData;
    setUserData: (userData: UserData) => void;
    setIsChatOpen: (isChatOpen: boolean) => void;
    userId: string;
    modal: MODALS;
    setModal: (modal: MODALS) => void;
}

const DISCONNECT_ON_PURPOSE_REASONS = ['server namespace disconnect', 'client namespace disconnect', 'forced close', 'transport close']


const ChatItself: React.FC<ChatItselfProps> = ({
                                                   userData,
                                                   interlocutorData,
                                                   setUserData,
                                                   setIsChatOpen,
                                                   userId,
                                                   modal,
                                                   setModal
                                               }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [newMessage, setNewMessage] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTypingObj, setIsTypingObj] = useState<{ isTyping: boolean, uId: string }>({isTyping: false, uId: ''});
    const [receivedMessage, setReceivedMessage] = useState<Message | null>(null)
    const [status, setStatus] = useState<string>('');
    const [chatId, setChatId] = useState<string | null>(null);
    const [theOneWhoLeft, setTheOneWhoLeft] = useState<string>('');
    const [matchId, setMatchId] = useState<string | null>(null);
    const [haveActiveChat, setHaveActiveChat] = useState<boolean>(false);
    const [reason, setReason] = useState<{ reason: string, userId: string } | null>(null);
    const [metrics, setMetrics] = useState<{
        usersCount: number,
        waitingCount: number,
        allUsers: number,
    } | null>(null);


    const typingRef = useRef<any>(null);
    const historyRef = useRef<HTMLDivElement | null>(null);
    const intervalRef = useRef<any>(null);
    const inputRef = useRef<any>(null);

    const STATUS_WAITING = `Очікуємо ${interlocutorData.sex === 'male' ? 'співрозмовника' : 'співрозмовницю'} від ${interlocutorData.ageFrom} до ${interlocutorData.ageTo} ${interlocutorData.ageTo?.toString().at(-1) === '1' ? 'року' : 'років'}...`;
    const STATUS_CONNECTED = "З'єднано";
    const STATUS_RECONNECTED = "З'єднання відновлено!"

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
        let wasConnectedBefore = false;
        let localChatId = '';
        let isReconnected = false;

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

        socketInstance.on("connect", () => {
            setSocket(socketInstance);
            clearInterval(intervalRef.current)

            if (!wasConnectedBefore) {
                socketInstance.emit("find-chat", {
                    uId: userId,
                    userData,
                    interlocutorData,
                });
            } else {
                isReconnected = false;
                socketInstance.emit("reconnect-to-chat", {
                    chatId: localChatId,
                    uId: userId,
                    userData,
                    interlocutorData,
                });
            }
        });

        socketInstance.on("disconnect", () => {
            if (isReconnected && socket?.connected) return
            setSocket(null);
            setStatus('');
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
        socketInstance.on("disconnect_reason", (message: {
            reason: string,
            userId: string,
        }) => {
            if (isReconnected && socket?.connected) return
            setReason(message)
            setStatus('')
        });
        socketInstance.on("have-active-chat", () => {
            setHaveActiveChat(true);
        });
        socketInstance.on("user-typing", (message: any) => {
            setIsTypingObj(message);
        });
        socketInstance.on("reconnected", () => {
            setStatus(STATUS_RECONNECTED)
            setReason(null)
            isReconnected = true;
        });
        socketInstance.on("metrics", (message: {
            usersCount: number,
            waitingCount: number,
            allUsers: number,
        }) => {
            setMetrics(message)
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

    const handleIsTyping = useCallback(debounce(() => {
        if (socket) {
            socket.emit("is-typing", {
                uId: userId,
                isTyping: true,
                chatId: chatId,
            });
        }
    }, 500), [socket, userId, chatId]);

    useEffect(() => {
        return () => {
            handleIsTyping.cancel();
        };
    }, []);


    const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewMessage(event.target.value);
        handleIsTyping()
    };

    const handleSubmit = () => {
        if (!newMessage || !chatId) return
        const createdAt = new Date().getTime();

        if (newMessage.trim()) {
            setMessages((prev) => [...prev, {
                uId: userId,
                message: newMessage.trim(),
                createdAt: createdAt,
                pending: true,
            }])
        }

        if (socket && newMessage.trim()) {
            socket.emit("send-message", {
                uId: userId,
                message: newMessage.trim(),
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
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isTouch) {
            return;
        }
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

        if (!chatId) {
            setIsChatOpen(false)
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

    const handleGoHome = () => {
        if (socket) {
            socket.emit("delete-me-from-list");
        }

        if (theOneWhoLeft === userId || reason && reason.userId === userId) {
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
        setMatchId(null)
        setReason(null)
        if (socket) {
            socket.emit("find-chat", {
                uId: userId,
                userData,
                interlocutorData,
                leftPrevious: !!theOneWhoLeft || !!reason,
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
            {metrics ? <p className={styles.controlAllUsers}>control: {metrics.allUsers}</p> : ''}
            {modal === MODALS.IS_EXIT ? <ExitModal setModal={setModal} confirm={confirmLeaveChat}/> : ''}
            {modal === MODALS.IS_BLACKLIST ?
                <AddToBlackListModal setModal={setModal}
                                     confirm={confirmAddToBlackList}/> : ''}

            <div className={styles.chart}>
                <p style={{fontSize: '10px'}}>{`Status_${status}`}</p>
                <p style={{fontSize: '10px'}}>{`TheOneWhoLeft_${theOneWhoLeft}`}</p>
                <p style={{fontSize: '10px'}}>{`Reason_${reason?.reason}`}</p>
                {socket?.connected ? (
                    <>
                        <div className={styles.chartHistoryWrapper}>
                            {!theOneWhoLeft && !reason ? (
                                <>
                                    <div className={styles.summarySection}>
                                        {metrics ? (
                                            <div className={styles.summaryMetrics}>
                                                <div className={styles.dot}></div>
                                                <p className={styles.metricsData}>Онлайн: {metrics.usersCount}</p>
                                                <p className={styles.metricsData}>Очікують: {metrics.waitingCount}</p>
                                            </div>
                                        ) : ''}

                                        <div className={styles.summaryMetrics}>
                                            <p className={styles.metricsData}>
                                                Ви: {userData.sex === 'male' ? 'Чоловік' : 'Дівчина'} {userData.age}р
                                            </p>
                                            <p className={styles.metricsData}>
                                                {interlocutorData.sex === 'male' ? 'Йому' : 'Їй'}:
                                                від {interlocutorData.ageFrom} до {interlocutorData.ageTo}р
                                            </p>
                                        </div>

                                        <div className={styles.summaryButtons}>
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
                                        <p className={`${styles.messageText} ${item.pending ? styles.pendingMessage : ''}`}>{item.message}</p>
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

                        {!status && reason && reason.userId !== userId && !DISCONNECT_ON_PURPOSE_REASONS.includes(reason.reason) ? (
                            <div className={styles.leftChatBlock}>
                                <p className={styles.leftChatText}>
                                    Схоже у {interlocutorData.sex === 'male' ? 'нього' : 'неї'} проблеми з
                                    підключенням.
                                </p>
                                <p className={styles.leftChatTextSecondary}>
                                    Спробуй трохи зачекати.
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

                        {theOneWhoLeft || (reason && DISCONNECT_ON_PURPOSE_REASONS.includes(reason.reason)) ? (
                            <div className={styles.leftChatBlock}>
                                <p className={styles.leftChatText}>
                                    {theOneWhoLeft === userId || (reason && reason.userId === userId) ? 'Ви покинули чат!' : 'Нажаль співрозмовник покинув чат!'}
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
                            socket.connected &&
                            !isTypingObj.isTyping &&
                            !theOneWhoLeft &&
                            !reason
                                ? <p className={styles.isTyping}>
                                    {status}
                                </p> : ''
                        }
                    </>
                ) : (
                    <div className={styles.connectionStatus}>
                        {chatId ? (
                            <p className={styles.connectionText}>Перевір інтернет підключення...</p>
                        ) : (
                            <p className={styles.connectionText}>
                                {haveActiveChat ? 'У вас вже є активна сесія!' : 'Схоже немає підключення...'}
                            </p>)
                        }
                        {!haveActiveChat ? (
                            <div className={styles.connectionAnimation}>
                                <p className={styles.connectionIcon}>⚙️</p>
                            </div>
                        ) : ''}
                        {chatId ? (
                            <p className={`${styles.dontLeaveText} `}>
                                Намагаюсь відновити. Не залишай чат щоб не втратити співрозмовника.
                            </p>
                        ) : ''}
                        <p className={`${styles.generalButton} ${styles.buttonExit}`}
                           onClick={handleExitOnDisconnect}
                        >
                            Вийти
                        </p>
                    </div>
                )}

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
                        disabled={!(status === STATUS_CONNECTED || status === STATUS_RECONNECTED) || !socket?.connected}
                    />
                    <button
                        disabled={!(status === STATUS_CONNECTED || status === STATUS_RECONNECTED) || !socket?.connected || (!!chatId && !newMessage)}
                        className={`${!(status === STATUS_CONNECTED || status === STATUS_RECONNECTED) || !socket?.connected || (!!chatId && !newMessage)
                            ? styles.disabledButton
                            : ''
                        } ${styles.sendButton}`}
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