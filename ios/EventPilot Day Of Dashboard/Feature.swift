import SwiftUI

enum Feature: String, Codable, CaseIterable, Identifiable {
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
            case .participants: ParticipantsScreen()
            case .volunteers: VolunteersScreen()
            case .pointOfSale: PointOfSaleScreen()
            case .settings: SettingsScreen()
        }
    }
}
