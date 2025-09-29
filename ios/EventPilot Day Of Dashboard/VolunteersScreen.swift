import SwiftUI

struct VolunteersScreen: View {
    var body: some View {
        NavigationStack {
            List {
                Section("Volunteers") {
                    ForEach(0..<8, id: \.self) { idx in
                        HStack {
                            Image(systemName: "hands.sparkles")
                            Text("Volunteer #\(idx + 1)")
                        }
                    }
                }
            }
            .navigationTitle("Volunteers")
        }
    }
}

#Preview {
    VolunteersScreen()
}
