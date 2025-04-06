class ApiError extends Error {
    // basically we are making a constructor and then overriding it.
    constructor(
        statusCode,
        message = "Soemthing went wrong",
        errors = [],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false // because we are handling api errors not api responses
        this.errors = errors

        if(stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export { ApiError }