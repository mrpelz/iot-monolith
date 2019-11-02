declare namespace NodeJS {
  export interface Global {
    isProd: boolean;
    logTelegram: boolean;
    logLevel: string;
    telegramToken: string;
  }

  export type UnhandledRejectionListener = (reason: Error | null | undefined, promise: Promise<any>) => void;
}
