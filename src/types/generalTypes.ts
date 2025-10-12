export interface Message {
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

export interface UserData {
    age: number | null,
    sex: string
    blackList: string[]
}

export interface InterlocutorData {
    ageFrom: number | null,
    ageTo: number | null,
    sex: string
}

export interface Participant {
    uId: string;
    userData: {
        age: number;
        sex: 'male' | 'female';
        blackList: string[];
    };
    interlocutorData: {
        ageFrom: number;
        ageTo: number;
        sex: string;
    };
}

