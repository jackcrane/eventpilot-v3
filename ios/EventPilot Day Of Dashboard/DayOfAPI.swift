import Foundation

struct APIConfiguration {
    static let shared = APIConfiguration()

    let baseURL: URL

    private init() {
        let defaultURL = URL(string: "https://tunnel.geteventpilot.com")!

        guard
            let rawValue = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
            let parsed = URL(string: rawValue.trimmingCharacters(in: .whitespacesAndNewlines)),
            !parsed.absoluteString.isEmpty
        else {
            baseURL = defaultURL
            return
        }

        baseURL = parsed
    }
}

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case unauthorized(message: String?)
    case forbidden(message: String?)
    case failure(status: Int, message: String?)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL"
        case .invalidResponse:
            return "Unexpected server response"
        case let .unauthorized(message):
            return message ?? "Session expired. Please log in again."
        case let .forbidden(message):
            return message ?? "You do not have permission to perform this action."
        case let .failure(_, message):
            return message ?? "The server returned an error."
        }
    }
}

struct DayOfAPI {
    private let urlSession: URLSession
    private let baseURL: URL

    init(urlSession: URLSession = .shared, configuration: APIConfiguration = .shared) {
        self.urlSession = urlSession
        baseURL = configuration.baseURL
    }

    func login(pin: String, desiredName: String?) async throws -> DayOfSession {
        let payload = LoginPayload(pin: pin, name: desiredName)
        let request = try buildRequest(
            path: "/api/day-of-dashboard/login",
            method: "POST",
            body: payload,
            session: nil
        )

        let data = try await perform(request)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let response = try decoder.decode(LoginResponse.self, from: data)

        return DayOfSession(
            token: response.token,
            expiresAt: response.expiresAt,
            account: response.account,
            provisioner: response.provisioner
        )
    }

    func updateAccountName(session: DayOfSession, name: String) async throws -> DayOfDashboardAccount {
        let payload = UpdateNamePayload(name: name)
        let request = try buildRequest(
            path: "/api/events/\(session.account.eventId)/day-of-dashboard/accounts/\(session.account.id)",
            method: "PUT",
            body: payload,
            session: session
        )

        let data = try await perform(request)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let response = try decoder.decode(UpdateAccountResponse.self, from: data)
        return response.account
    }
}

private extension DayOfAPI {
    struct LoginPayload: Encodable {
        let pin: String
        let name: String?

        init(pin: String, name: String?) {
            self.pin = pin
            if let trimmed = name?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty {
                self.name = trimmed
            } else {
                self.name = nil
            }
        }
    }

    struct LoginResponse: Decodable {
        let token: String
        let expiresAt: Date
        let account: DayOfDashboardAccount
        let provisioner: DayOfDashboardProvisioner
    }

    struct UpdateNamePayload: Encodable {
        let name: String
    }

    struct UpdateAccountResponse: Decodable {
        let account: DayOfDashboardAccount
    }

    struct ErrorEnvelope: Decodable {
        let message: String
    }

    func buildRequest<T: Encodable>(
        path: String,
        method: String,
        body: T,
        session: DayOfSession?
    ) throws -> URLRequest {
        let encoded = try JSONEncoder().encode(body)
        return try buildRequest(path: path, method: method, bodyData: encoded, session: session)
    }

    func buildRequest(
        path: String,
        method: String,
        bodyData: Data? = nil,
        session: DayOfSession?
    ) throws -> URLRequest {
        let url = try makeURL(path: path)
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 20

        if let bodyData {
            request.httpBody = bodyData
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        if let session {
            request.setValue("Bearer \(session.token)", forHTTPHeaderField: "Authorization")
            request.setValue("true", forHTTPHeaderField: "X-IsDayOfDashboard")
            if let instanceId = session.account.instanceId ?? session.provisioner.instanceId {
                request.setValue(instanceId, forHTTPHeaderField: "X-Instance")
            }
        }

        return request
    }

    func makeURL(path: String) throws -> URL {
        var trimmed = path.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.hasPrefix("/") {
            trimmed.removeFirst()
        }
        guard !trimmed.isEmpty else { throw APIError.invalidURL }
        return baseURL.appendingPathComponent(trimmed)
    }

    func perform(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await urlSession.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        switch httpResponse.statusCode {
        case 200 ..< 300:
            return data
        case 401:
            throw APIError.unauthorized(message: parseMessage(from: data))
        case 403:
            throw APIError.forbidden(message: parseMessage(from: data))
        default:
            throw APIError.failure(status: httpResponse.statusCode, message: parseMessage(from: data))
        }
    }

    func parseMessage(from data: Data) -> String? {
        guard !data.isEmpty else { return nil }
        if let envelope = try? JSONDecoder().decode(ErrorEnvelope.self, from: data), !envelope.message.isEmpty {
            return envelope.message
        }
        return String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
