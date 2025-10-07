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