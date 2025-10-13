'use client'

import {
    useCallback,
    useEffect, useMemo, useRef, useState
} from 'react';
import styles from './chatItselfStyles.module.css';
import {format} from 'date-fns';
import debounce from 'lodash.debounce';
import ExitModal from "@/conponents/Modals/ExitModal";
import AddToBlackListModal from "@/conponents/Modals/AddToBlackListModal";
import {InterlocutorData, Message, MODALS, UserData} from "@/types/generalTypes";
import useSocketInit from "@/hooks/useSocketInit";

export interface ChatItselfProps {
    userData: UserData;
    interlocutorData: InterlocutorData;
    setUserData: (userData: UserData) => void;
    setIsChatOpen: (isChatOpen: boolean) => void;
    userId: string;
    modal: MODALS;
    setModal: (modal: MODALS) => void;
}

const ChatItself: React.FC<ChatItselfProps> = ({
                                                   userData,
                                                   interlocutorData,
                                                   setUserData,
                                                   setIsChatOpen,
                                                   userId,
                                                   modal,
                                                   setModal
                                               }) => {
    const [newMessage, setNewMessage] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTypingObj, setIsTypingObj] = useState<{ isTyping: boolean, uId: string }>({isTyping: false, uId: ''});
    const [theOneWhoLeft, setTheOneWhoLeft] = useState<string>('');

    const typingRef = useRef<any>(null);
    const historyRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<any>(null);

    const {
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
        setReason
    } = useSocketInit(
        userId,
        userData,
        interlocutorData,
        setIsChatOpen,
        isTypingObj,
        setIsTypingObj,
        setModal,
        setTheOneWhoLeft
    )


    const DISCONNECT_ON_PURPOSE_REASONS = [
        'server namespace disconnect',
        'client namespace disconnect',
        'forced close'
    ]
    const DISCONNECT_TRANSPORT_CLOSE = 'transport close'

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
                return prevMessages.map(item =>
                    item.message === receivedMessage?.message &&
                    item.createdAt === receivedMessage?.createdAt
                        ? receivedMessage
                        : item
                )
            })
        }
    }, [receivedMessage]);

    const {suitableMembers, menUsers, womenUsers} = useMemo(() => {
        if (!metrics) return {suitableMembers: 0, menUsers: 0, womenUsers: 0}
        const allUsers = Object.values(metrics?.allUsers)
        let menUsers = 0
        let womenUsers = 0

        const suitableMembers = allUsers?.filter((user) => {
            if (user.userData.sex === 'male') {
                menUsers++
            } else if (user.userData.sex === 'female') {
                womenUsers++
            }

            return (
                user.uId !== userId &&
                user.userData.sex ===
                interlocutorData.sex &&
                userData.sex ===
                user.interlocutorData.sex &&
                user.userData.age >=
                interlocutorData.ageFrom! &&
                user.userData.age <=
                interlocutorData.ageTo! &&
                userData.age! >=
                user.interlocutorData.ageFrom &&
                userData.age! <=
                user.interlocutorData.ageTo &&
                !user.userData.blackList.includes(userId) &&
                !userData.blackList.includes(user.uId)
            );
        }).length || 0

        return {suitableMembers, menUsers, womenUsers}
    }, [metrics])

    const handleIsTyping = useCallback(debounce(() => {
        if (socket) {
            socket.emit("is-typing", {
                uId: userId,
                isTyping: true,
                chatId: chatId,
            });
        }
    }, 400), [socket, userId, chatId]);

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
        confirmLeaveChat()
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

    const getStatusColor = () => {
        switch (status) {
            case statusType.waiting:
                return '#76ABAE'
            case statusType.disconnected:
                return '#C62300'
            case statusType.reconnectingProcess:
                return '#FEB21A'
            default:
                return '#228B22'
        }
    }

    return (
        <>
            {metrics ? <p className={styles.controlAllUsers}>control: {Object.keys(metrics?.allUsers)?.length}</p> : ''}
            {modal === MODALS.IS_EXIT ? <ExitModal setModal={setModal} confirm={confirmLeaveChat}/> : ''}
            {modal === MODALS.IS_BLACKLIST
                ?
                <AddToBlackListModal
                    setModal={setModal}
                    confirm={confirmAddToBlackList}
                />
                : ''
            }

            <div className={styles.chart}>
                <div className={styles.status}>
                    <div className={styles.statusDot} style={{backgroundColor: getStatusColor()}}></div>
                    <p className={styles.statusValue}>{`Статус: ${status}`}</p>
                </div>
                {socket?.connected ? (
                    <>
                        <div className={styles.chartHistoryWrapper}>
                            {!theOneWhoLeft && status !== statusType.disconnected ? (
                                <div className={styles.summarySection}>
                                    <div className={styles.summaryMetrics}>
                                        <p className={styles.metricsData}>
                                            Ви: {userData.sex === 'male' ? 'Чоловік' : 'Дівчина'} {userData.age}р
                                        </p>
                                        <p className={styles.metricsData}>
                                            {interlocutorData.sex === 'male' ? 'Йому' : 'Їй'}:
                                            від {interlocutorData.ageFrom} до {interlocutorData.ageTo}р
                                        </p>
                                        <span style={{fontSize: '12px'}}>.</span>
                                    </div>

                                    {metrics ? (
                                        <div className={styles.summaryMetrics}>
                                            <p className={styles.metricsData}>
                                                <span>Онлайн: {metrics.usersCount}</span>
                                                &nbsp;
                                                (
                                                <span
                                                    className={styles.menMetrics}
                                                >
                                                        {menUsers}
                                                    </span>
                                                &nbsp; - &nbsp;
                                                <span
                                                    className={styles.womenMetrics}
                                                >
                                                         {womenUsers}
                                                    </span>
                                                )
                                            </p>
                                            <p className={styles.metricsData}>
                                                В очікуванні: {metrics.waitingCount}
                                            </p>
                                            <p className={styles.metricsData}>
                                                Вам підходять: {suitableMembers}
                                            </p>
                                        </div>
                                    ) : ''}

                                    <div className={styles.summaryButtons}>
                                        <p className={`${styles.generalButton} ${styles.buttonExit}`}
                                           onClick={() => setModal(MODALS.IS_EXIT)}
                                        >
                                            Вийти
                                        </p>
                                    </div>
                                </div>
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

                        {!theOneWhoLeft && peopleInChat < 2 && status === statusType.reconnected && !reason ? (
                            <div className={styles.leftChatBlock}>
                                <p className={styles.leftChatText}>
                                    Схоже тут більше нікого нема... 😔
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

                        {status === statusType.reconnectingProcess ? (
                            <div className={styles.leftChatBlock}>
                                <p className={styles.leftChatText}>
                                    Перепідключення...
                                </p>
                                <p className={styles.connectionIcon}>⚙️</p>
                            </div>
                        ) : ''}

                        {theOneWhoLeft ? (
                            <div className={styles.leftChatBlock}>
                                <p className={styles.leftChatText}>
                                    {theOneWhoLeft === userId
                                        ? 'Ви покинули чат'
                                        : `Нажаль ${interlocutorData.sex === 'male' ? 'співрозмовник покинув' : 'співрозмовниця покинула'} чат!`
                                    }
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

                        {status === statusType.disconnected && !theOneWhoLeft && reason ? (
                            <div className={styles.leftChatBlock}>

                                {DISCONNECT_ON_PURPOSE_REASONS.includes(reason.reason)
                                    ? userId === reason.userId
                                        ? <p className={styles.leftChatText}>
                                            Ви покинули чат
                                        </p>
                                        : <p className={styles.leftChatText}>
                                            Нажаль співрозмовник покинув чат!
                                        </p>
                                    : ''
                                }

                                {DISCONNECT_TRANSPORT_CLOSE === reason.reason
                                    ? userId === reason.userId
                                        ? <p className={styles.leftChatText}>Ви відключились</p>
                                        : (
                                            <div>
                                                <p className={styles.leftChatText}>🤔</p>
                                                <p className={styles.leftChatText}>
                                                    {interlocutorData.sex === 'male'
                                                        ? 'Співрозмовник кудись зник'
                                                        : 'Співрозмовниця кудись зникла'
                                                    }
                                                </p>
                                                <p className={styles.leftChatText}>Пропоную трохи зачекати</p>
                                            </div>

                                        )
                                    : ''}

                                {!DISCONNECT_ON_PURPOSE_REASONS.includes(reason.reason) && DISCONNECT_TRANSPORT_CLOSE !== reason.reason
                                    ? (
                                        <div>
                                            <p className={styles.leftChatText}>🤔</p>
                                            <p className={styles.leftChatText}>Схоже
                                                у {interlocutorData.sex === 'male' ? 'нього' : 'неї'} проблеми зі
                                                зв'язком.
                                            </p>
                                            <p className={styles.leftChatText}>
                                                Пропоную трохи зачекати
                                            </p>
                                        </div>
                                    )
                                    : ''
                                }

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

                        {isTypingObj.isTyping && isTypingObj.uId !== userId && socket.connected
                            ? <p className={styles.isTyping}>
                                Щось пишe... 🖊️
                            </p>
                            : ''
                        }
                        {status
                        && messages.length === 0
                        && !isTypingObj.isTyping
                        && !theOneWhoLeft
                        && socket.connected
                        && (status === statusType.connected || status === statusType.waiting)
                            ? <p className={styles.isTyping}>
                                {status}
                                &nbsp;
                                {status === statusType.connected ? '✔️' : ''}
                                {status === statusType.waiting ? '⏳' : ''}
                            </p>
                            : ''
                        }
                    </>
                ) : (
                    <div className={styles.connectionStatus}>
                        {chatId ? (
                            <p className={styles.connectionText}>Очікуємо підключення...</p>
                        ) : (
                            <p className={styles.connectionText}>
                                {haveActiveChat ? 'У вас вже є активна сесія!' : 'Очікуємо підключення...'}
                            </p>)
                        }
                        {!haveActiveChat ? (
                            <div className={styles.connectionAnimation}>
                                <p className={styles.connectionIcon}>⚙️</p>
                            </div>
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
                        disabled={
                            status === statusType.disconnected
                            || status === statusType.reconnectingProcess
                            || !socket?.connected
                            || (peopleInChat < 2 && status === statusType.reconnected)
                        }
                    />
                    <button
                        disabled={
                            status === statusType.disconnected
                            || status === statusType.reconnectingProcess
                            || !socket?.connected
                            || !newMessage
                            || (peopleInChat < 2 && status === statusType.reconnected)
                        }
                        className={
                            `${status === statusType.disconnected
                            || status === statusType.reconnectingProcess
                            || !socket?.connected
                            || !newMessage
                            || (peopleInChat < 2 && status === statusType.reconnected)
                                ? styles.disabledButton
                                : ''
                            } ${styles.sendButton}`
                        }
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