import SwiftUI

struct SettingsScreen: View {
    @EnvironmentObject private var sessionStore: DayOfSessionStore

    private var account: DayOfDashboardAccount? { sessionStore.session?.account }

    var body: some View {
        NavigationStack {
            List {
                if let account {
                    Section("Account") {
                        LabeledContent("Name") {
                            Text(account.name?.isEmpty == false ? account.name! : "Not set")
                        }
                        LabeledContent("Event ID") { Text(account.eventId) }
                        if let instanceId = account.instanceId {
                            LabeledContent("Instance ID") { Text(instanceId) }
                        }
                        if let lastIssued = account.lastIssuedAt {
                            LabeledContent("Signed in") {
                                Text(Self.relativeDateFormatter.localizedString(for: lastIssued, relativeTo: Date()))
                            }
                        }
                    }

                    Section("Permissions") {
                        ForEach(account.permissions, id: \.self) { permission in
                            Text(label(for: permission))
                        }
                    }

                    Section("Session") {
                        if let expiresAt = sessionStore.session?.expiresAt {
                            LabeledContent("Token Expires") {
                                Text(Self.relativeDateFormatter.localizedString(for: expiresAt, relativeTo: Date()))
                            }
                        }
                        Button("Log Out", role: .destructive) {
                            sessionStore.logout()
                        }
                    }
                } else {
                    Section {
                        Text("Not signed in")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    if account != nil {
                        Button("Rename") {
                            sessionStore.needsAccountNamePrompt = true
                        }
                    }
                }
            }
        }
    }

    private func label(for permission: String) -> String {
        switch permission {
        case "PARTICIPANT_CHECK_IN":
            return "Participant check-in"
        case "VOLUNTEER_CHECK_IN":
            return "Volunteer check-in"
        case "POINT_OF_SALE":
            return "Point of sale"
        default:
            return permission
        }
    }

    private static let relativeDateFormatter: RelativeDateTimeFormatter = {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter
    }()
}

#Preview {
    SettingsScreen()
        .environmentObject(DayOfSessionStore())
}
