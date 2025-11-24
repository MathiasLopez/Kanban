class Logger {
    constructor() {
        this.levels = {
            debug: true,
            info: true,
            warn: true,
            error: true
        };
    }

    setLevels(levelConfig) {
        this.levels = { ...this.levels, ...levelConfig };
    }

    async #sendToApi(level, message, data) {
        try {
            this.#printLog(level, message, data);
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
            console.error("Logger API error:", err);
        }
    }

    #printLog(level, message, data) {
        const payload = {
            level,
            message,
            data,
            timestamp: new Date().toISOString()
        };

        switch (level) {
            case 'info':
                console.info(`[INFO]`, payload);
                break;
            case 'warn':
                console.warn(`[WARN]`, payload);
                break;
            case 'error':
                console.error(`[ERROR]`, payload);
                break;
            case 'debug':
                console.debug(`[DEBUG]`, payload);
                break;
        }
    }

    info(message, data ) {
        if (!this.levels.info) return;
        
        this.#sendToApi("info", message, data);
    }

    warn(message, data ) {
        if (!this.levels.warn) return;
        
        this.#sendToApi("warn", message, data);
    }

    error(message, data) {
        if (!this.levels.error) return;

        this.#sendToApi("error", message, data);
    }

    debug(message, data) {
        if (!this.levels.debug) return;

        this.#sendToApi("debug", message, data);
    }
}

export default new Logger();
