import SwiftUI

struct ParticipantsScreen: View {
    var body: some View {
        NavigationStack {
            List {
                Section("Participants") {
                    ForEach(0..<10, id: \.self) { idx in
                        HStack {
                            Image(systemName: "person.crop.circle")
                            Text("Participant #\(idx + 1)")
                        }
                    }
                }
            }
            .navigationTitle("Participants")
        }
    }
}

#Preview {
    ParticipantsScreen()
}
