class ApiResponse {
    constructor(statusCode, data, message = "Success") {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400 // 400-499 -> client error response hota h and 500-599 -> server error response hota h!
    }
}

export { ApiResponse }