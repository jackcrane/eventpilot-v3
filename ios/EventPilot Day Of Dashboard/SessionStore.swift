import Foundation
import Combine
import os.log

@MainActor
final class DayOfSessionStore: ObservableObject {
    static let shared = DayOfSessionStore()

    @Published private(set) var session: DayOfSession?
    @Published var isRestoring = true
    @Published var isLoggingIn = false
    @Published var loginErrorMessage: String?
    @Published var needsAccountNamePrompt = false
    @Published var accountNameErrorMessage: String?
    @Published var showingInvalidTokenAlert = false

    private let api: DayOfAPI
    private let persistence: SessionPersistence

    init(api: DayOfAPI = DayOfAPI(), persistence: SessionPersistence = SessionPersistence()) {
        self.api = api
        self.persistence = persistence
        Task { await restoreSession() }
    }

    var allowedFeatures: [Feature] {
        guard let session else { return [.settings] }
        var features = Feature.features(for: session.normalizedPermissions)
        if !features.contains(.settings) {
            features.append(.settings)
        }
        return features.sorted(by: Feature.defaultSort)
    }

    var hasActiveSession: Bool { session != nil }

    func restoreSession() async {
        isRestoring = true
        defer { isRestoring = false }

        do {
            if let stored = try persistence.load() {
                if stored.isExpired {
                    os_log("Stored session expired; clearing", type: .info)
                    try persistence.clear()
                    session = nil
                    needsAccountNamePrompt = false
                } else {
                    session = stored
                    needsAccountNamePrompt = stored.account.name?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true
                }
            } else {
                session = nil
                needsAccountNamePrompt = false
            }
        } catch {
            os_log("Failed to restore session: %{public}@", type: .error, String(describing: error))
            session = nil
            needsAccountNamePrompt = false
            try? persistence.clear()
        }
    }

    func login(withPin rawPin: String) async {
        let trimmed = rawPin.trimmingCharacters(in: .whitespacesAndNewlines)

        guard Self.isValidPin(trimmed) else {
            loginErrorMessage = "Enter the 6-digit access PIN provided by your admin."
            return
        }

        loginErrorMessage = nil
        isLoggingIn = true
        defer { isLoggingIn = false }

        do {
            let newSession = try await api.login(pin: trimmed, desiredName: nil)
            apply(session: newSession)
        } catch let error as APIError {
            loginErrorMessage = error.errorDescription
        } catch {
            loginErrorMessage = "Unable to log in. Check your connection and try again."
            os_log("Login failed: %{public}@", type: .error, String(describing: error))
        }
    }

    func submitAccountName(_ rawName: String) async -> Bool {
        let trimmed = rawName.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !trimmed.isEmpty else {
            accountNameErrorMessage = "Name cannot be blank."
            return false
        }

        guard var currentSession = session else {
            accountNameErrorMessage = "You are no longer logged in."
            return false
        }

        accountNameErrorMessage = nil

        do {
            let updatedAccount = try await api.updateAccountName(session: currentSession, name: trimmed)
            currentSession.account = updatedAccount
            apply(session: currentSession)
            return true
        } catch APIError.forbidden {
            currentSession.account.name = trimmed
            apply(session: currentSession)
            return true
        } catch APIError.unauthorized {
            handleUnauthorized()
            return false
        } catch {
            accountNameErrorMessage = "Unable to save name right now."
            os_log("Failed to update account name: %{public}@", type: .error, String(describing: error))
            return false
        }
    }

    func logout() {
        session = nil
        needsAccountNamePrompt = false
        loginErrorMessage = nil
        accountNameErrorMessage = nil
        showingInvalidTokenAlert = false
        try? persistence.clear()
    }

    func handleUnauthorized() {
        showingInvalidTokenAlert = true
    }

    func acknowledgeInvalidTokenAlert() {
        showingInvalidTokenAlert = false
        logout()
    }
}

private extension DayOfSessionStore {
    func apply(session newSession: DayOfSession) {
        session = newSession
        needsAccountNamePrompt = newSession.account.name?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true
        do {
            try persistence.save(newSession)
        } catch {
            os_log("Failed to persist session: %{public}@", type: .error, String(describing: error))
        }
    }

    static func isValidPin(_ pin: String) -> Bool {
        guard pin.count == 6 else { return false }
        return CharacterSet.decimalDigits.isSuperset(of: CharacterSet(charactersIn: pin))
    }
}

struct SessionPersistence {
    private let storageKey = "DayOfDashboardSession"
    private let userDefaults: UserDefaults
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
        encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
    }

    func load() throws -> DayOfSession? {
        guard let data = userDefaults.data(forKey: storageKey) else { return nil }
        return try decoder.decode(DayOfSession.self, from: data)
    }

    func save(_ session: DayOfSession) throws {
        let data = try encoder.encode(session)
        userDefaults.set(data, forKey: storageKey)
    }

    func clear() throws {
        userDefaults.removeObject(forKey: storageKey)
    }
}
