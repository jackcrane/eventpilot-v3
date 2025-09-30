import Foundation

struct DayOfDashboardAccount: Codable, Identifiable {
    let id: String
    let eventId: String
    let provisionerId: String
    var instanceId: String?
    var name: String?
    var permissions: [String]
    var tokenVersion: Int
    var lastIssuedAt: Date?
    var deleted: Bool
    let createdAt: Date
    let updatedAt: Date

    private enum CodingKeys: String, CodingKey {
        case id, eventId, provisionerId, instanceId, name, permissions, tokenVersion, lastIssuedAt, deleted, createdAt, updatedAt
    }

    init(
        id: String,
        eventId: String,
        provisionerId: String,
        instanceId: String? = nil,
        name: String? = nil,
        permissions: [String],
        tokenVersion: Int,
        lastIssuedAt: Date? = nil,
        deleted: Bool = false,
        createdAt: Date,
        updatedAt: Date
    ) {
        self.id = id
        self.eventId = eventId
        self.provisionerId = provisionerId
        self.instanceId = instanceId
        self.name = name
        self.permissions = permissions
        self.tokenVersion = tokenVersion
        self.lastIssuedAt = lastIssuedAt
        self.deleted = deleted
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        eventId = try c.decode(String.self, forKey: .eventId)
        provisionerId = try c.decode(String.self, forKey: .provisionerId)
        instanceId = try c.decodeIfPresent(String.self, forKey: .instanceId)
        name = try c.decodeIfPresent(String.self, forKey: .name)
        permissions = try c.decode([String].self, forKey: .permissions)
        tokenVersion = try c.decode(Int.self, forKey: .tokenVersion)
        lastIssuedAt = try c.decodeIfPresent(Date.self, forKey: .lastIssuedAt)
        deleted = try c.decodeIfPresent(Bool.self, forKey: .deleted) ?? false
        createdAt = try c.decode(Date.self, forKey: .createdAt)
        updatedAt = try c.decode(Date.self, forKey: .updatedAt)
    }
}

struct DayOfDashboardProvisioner: Codable, Identifiable {
    let id: String
    let eventId: String
    var instanceId: String?
    var permissions: [String]
    let jwtExpiresInSeconds: Int
    let tokenVersion: Int
}

struct DayOfSession: Codable {
    let token: String
    let expiresAt: Date
    var account: DayOfDashboardAccount
    var provisioner: DayOfDashboardProvisioner

    var isExpired: Bool { expiresAt <= Date() }

    var normalizedPermissions: [String] {
        var seen = Set<String>()
        return account.permissions.compactMap { p in
            let t = p.trimmingCharacters(in: .whitespacesAndNewlines)
            return (!t.isEmpty && seen.insert(t).inserted) ? t : nil
        }
    }
}