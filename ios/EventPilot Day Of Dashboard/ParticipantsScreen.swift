import SwiftUI

struct ParticipantsScreen: View {
    @EnvironmentObject private var sessionStore: DayOfSessionStore

    var body: some View {
        NavigationStack {
            List {
                Section("Participant Check-In") {
                    Text("Participant-facing tools will appear here once connected to the live API.")
                        .foregroundStyle(.secondary)
                    if let name = sessionStore.session?.account.name, !name.isEmpty {
                        Text("Signed in as \(name).").font(.callout)
                    }
                }
            }
            .navigationTitle("Participants")
        }
    }
}

#Preview {
    ParticipantsScreen()
        .environmentObject(DayOfSessionStore())
}
