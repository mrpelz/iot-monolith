declare namespace IoT {
  export interface Environment {
    configPath: string;
    telegramToken: string;
  }
}

declare namespace NodeJS {
  export interface Global {
    isProd: boolean;
    logTelegram: boolean;
    logLevel: string;
    telegramToken: string;
  }
}
