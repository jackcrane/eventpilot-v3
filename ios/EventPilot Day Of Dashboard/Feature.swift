import SwiftUI

enum Feature: String, Codable, CaseIterable, Identifiable, Hashable {
    case participants
    case volunteers
    case pointOfSale
    case settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .participants: return "Participants"
        case .volunteers: return "Volunteers"
        case .pointOfSale: return "Point of Sale"
        case .settings: return "Settings"
        }
    }

    var systemImage: String {
        switch self {
        case .participants: return "person.3"
        case .volunteers: return "person.2"
        case .pointOfSale: return "creditcard"
        case .settings: return "gearshape"
        }
    }

    @ViewBuilder
    func destination() -> some View {
        switch self {
        case .participants:
            ParticipantsScreen()
        case .volunteers:
            VolunteersScreen()
        case .pointOfSale:
            PointOfSaleScreen()
        case .settings:
            SettingsScreen()
        }
    }
}

extension Feature {
    private static let permissionToFeature: [String: Feature] = [
        "PARTICIPANT_CHECK_IN": .participants,
        "VOLUNTEER_CHECK_IN": .volunteers,
        "POINT_OF_SALE": .pointOfSale,
    ]

    static func features(for permissions: [String]) -> [Feature] {
        var ordered: [Feature] = []
        var seen = Set<Feature>()

        for permission in permissions {
            guard let feature = permissionToFeature[permission] else { continue }
            if seen.insert(feature).inserted {
                ordered.append(feature)
            }
        }

        return ordered
    }

    static func defaultSort(_ lhs: Feature, _ rhs: Feature) -> Bool {
        order(for: lhs) < order(for: rhs)
    }

    private static func order(for feature: Feature) -> Int {
        switch feature {
        case .volunteers: return 0
        case .participants: return 1
        case .pointOfSale: return 2
        case .settings: return 99
        }
    }
}
