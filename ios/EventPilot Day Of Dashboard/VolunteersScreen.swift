import SwiftUI

struct VolunteersScreen: View {
    @EnvironmentObject private var sessionStore: DayOfSessionStore

    var body: some View {
        NavigationStack {
            List {
                Section("Volunteer Tools") {
                    Text("Use this tab to manage volunteer check-ins during the event.")
                        .foregroundStyle(.secondary)
                    if let permissions = sessionStore.session?.account.permissions {
                        Text("Permissions: \(permissions.joined(separator: ", ")).")
                            .font(.callout)
                    }
                }
            }
            .navigationTitle("Volunteers")
        }
    }
}

#Preview {
    VolunteersScreen()
        .environmentObject(DayOfSessionStore())
}
