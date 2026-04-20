/**
 * Utility logger for consistent logging across the application.
 */
export const logger = {
    info: (message: string) => {
        console.info(message);
    },

    warn: (message: string) => {
        console.warn(message);
    },

    fatal: (message: string, ex: Error) => {
        message += ex?.message ?? "";
        console.error(message);
    }

}